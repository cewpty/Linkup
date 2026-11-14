// Squadup core: all squad rules live here. Shared by the local Node server
// (server.js) and the Cloudflare Worker (src/worker.js). No platform APIs.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function rid(len = 8) {
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % 62];
  return out;
}

const str = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const text = (v, max = 1000) => String(v ?? '').trim().slice(0, max);
const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(1e7, Math.round(n * 100) / 100);
};
const now = () => Date.now();

export class UserError extends Error {}
const fail = (msg) => { throw new UserError(msg); };

const DEFAULT_ROLES = [
  ['Planner', 'Locks in the venue & time and keeps the plan moving'],
  ['Info gatherer', 'Finds prices, opening hours, tickets, menus'],
  ['Treasurer', 'Holds the group money and confirms who has paid'],
];

function newMember(name) {
  return {
    id: rid(8),
    token: rid(24),
    name,
    status: null, // going | maybe | out
    // area: rough, public ("near Lake Road"); pickup: exact, private to rider + driver
    ride: { mode: null, seats: 3, driverId: null, riderState: 'waiting', driverState: 'idle', pickup: null, area: '', eta: null, etaAt: null },
    pledge: 0,
    // Payments: paidAmt is what they say they've handed over, confirmedAmt is what the
    // Treasurer confirmed. Any new or changed amount waits for the Treasurer ('sent').
    paid: 'none', // none | sent (waiting for Treasurer) | confirmed
    paidAmt: 0,
    confirmedAmt: 0,
    arrived: null, // when they checked in at the venue
    nudges: [], // reminders friends sent them, only they see these
    joinedAt: now(),
  };
}

// Squads saved before a feature existed get its empty fields here.
function migrate(sq) {
  sq.polls ||= [];
  sq.schedule ||= [];
  sq.rideReqs ||= [];
  // the old separate venue/time votes become Decisions polls
  if (sq.ideas && sq.ideas.length) {
    for (const kind of ['venue', 'time']) {
      const ideas = sq.ideas.filter((i) => i.kind === kind);
      if (!ideas.length) continue;
      sq.polls.push({
        id: rid(6), kind: kind === 'venue' ? 'place' : 'time', q: kind === 'venue' ? 'Where should we go?' : 'When works for everyone?',
        multi: kind === 'time', by: ideas[0].by, at: ideas[0].at, closed: false, picked: null,
        options: ideas.map((i) => ({ id: i.id, text: kind === 'venue' ? i.text : [i.date, i.time].filter(Boolean).join(' '), date: i.date, time: i.time, votes: i.votes })),
      });
    }
  }
  delete sq.ideas;
  for (const p of sq.polls) { p.kind ||= 'custom'; if (p.multi === undefined) p.multi = false; if (p.picked === undefined) p.picked = null; }
  for (const m of Object.values(sq.members)) {
    m.nudges ||= [];
    if (m.arrived === undefined) m.arrived = null;
    if (m.ride.area === undefined) m.ride.area = '';
    if (m.paidAmt === undefined) { // older squads only tracked paid yes/no
      const owe = sq.budget.mode === 'each' ? sq.budget.amount : m.pledge;
      m.paidAmt = m.paid !== 'none' ? owe : 0;
      m.confirmedAmt = m.paid === 'confirmed' ? owe : 0;
    }
  }
}

// icon: which icon the activity feed shows (join, car, pin, check, money, vote, task, plan, bell, leave)
function log(sq, t, icon = 'dot') {
  sq.activity.push({ at: now(), text: t, icon });
  if (sq.activity.length > 80) sq.activity.splice(0, sq.activity.length - 80);
}

const roleHolder = (sq, roleName) => {
  const r = sq.roles.find((x) => x.name === roleName);
  return r && r.holderId ? sq.members[r.holderId] : null;
};
const isRole = (sq, me, roleName) => {
  const h = roleHolder(sq, roleName);
  return !!h && h.id === me.id;
};
const ridersOf = (sq, driverId) => Object.values(sq.members).filter((m) => m.ride.mode === 'need' && m.ride.driverId === driverId);

function releaseRiders(sq, driver) {
  for (const r of ridersOf(sq, driver.id)) {
    r.ride.driverId = null;
    r.ride.riderState = 'waiting';
  }
}

// Ride requests: a rider "asks" a driver for a seat, or a driver "invites" a
// rider into their car. Only the person receiving it can accept or decline.
// role: 'rider' drops requests where they're the rider, 'driver' where they drive, 'any' both.
function dropReqs(sq, memberId, role = 'any') {
  sq.rideReqs = sq.rideReqs.filter((q) =>
    !((role !== 'driver' && q.riderId === memberId) || (role !== 'rider' && q.driverId === memberId)));
}
const freeSeats = (sq, driver) => driver.ride.seats - ridersOf(sq, driver.id).length;
// Picking a ride means you're coming: mark Going and clear any "are you coming?" nudges.
function markGoing(m) {
  if (m.status) return;
  m.status = 'going';
  m.nudges = (m.nudges || []).filter((n) => n.kind !== 'rsvp');
}
const isWaiting = (m) => m.status !== 'out' && m.ride.mode !== 'driving' && m.ride.mode !== 'self' && !m.ride.driverId;

// ---------- automatic deletion ----------
const HOUR = 3600 * 1000, DAY = 24 * HOUR;
export const PICKUP_TTL = 12 * HOUR; // a shared pickup spot is wiped 12h after it was shared

const lastActive = (sq) => (sq.activity.length ? sq.activity[sq.activity.length - 1].at : sq.createdAt);

// When the whole squad (and everything in it) gets deleted:
// demo squads 2 days after anyone last used them; real squads 7 days after the
// hangout date (or after the last activity, whichever is later); squads with no
// date 30 days after the last activity.
export function expiresAt(sq) {
  const active = lastActive(sq);
  if (sq.demo) return active + 2 * DAY;
  const day = sq.plan.date ? Date.parse(sq.plan.date + 'T23:59:59Z') : NaN;
  if (Number.isFinite(day)) return Math.max(day, active) + 7 * DAY;
  return active + 30 * DAY;
}

// Wipes pickup spots that are older than PICKUP_TTL. Returns true if anything changed.
export function prune(sq, t = now()) {
  let changed = false;
  for (const m of Object.values(sq.members)) {
    if (m.ride.pickup && t - m.ride.pickup.at >= PICKUP_TTL) { m.ride.pickup = null; changed = true; }
  }
  return changed;
}

// The next moment something needs deleting (for the cleanup timer).
export function nextCleanup(sq) {
  let t = expiresAt(sq);
  for (const m of Object.values(sq.members)) if (m.ride.pickup) t = Math.min(t, m.ride.pickup.at + PICKUP_TTL);
  return t;
}

// Only the Planner can delete the whole trip. No Planner, no deleting
// (someone claims the role first).
function canDelete(sq, me) {
  return isRole(sq, me, 'Planner');
}

// What someone is expected to bring: the fixed amount, or what they pledged.
const owesOf = (sq, m) => (sq.budget.mode === 'each' ? sq.budget.amount : m.pledge);

// ---------- create ----------
function blankSquad(id, name, currency) {
  return {
    id, key: rid(12), name, currency: str(currency, 4) || '$', createdAt: now(), version: 1,
    plan: { venue: '', address: '', date: '', time: '', notes: '', locked: false, updatedBy: null, updatedAt: null },
    ideas: [], info: [], tasks: [], expenses: [], activity: [], members: {},
    polls: [], schedule: [], rideReqs: [],
    roles: DEFAULT_ROLES.map(([n, d]) => ({ id: rid(6), name: n, desc: d, holderId: null })),
    budget: { mode: 'each', amount: 0 },
  };
}

export function createSquad(id, body) {
  const name = str(body.name, 60) || fail('Give the hangout a name.');
  const you = str(body.you, 30) || fail('Enter your name.');
  const sq = blankSquad(id, name, body.currency);
  const m = newMember(you);
  sq.members[m.id] = m;
  sq.creatorId = m.id;
  sq.roles.find((r) => r.name === 'Planner').holderId = m.id; // whoever starts it plans it (can hand over in Crew)
  log(sq, `${you} started the squad`, 'plan');
  return { sq, token: m.token };
}

// A ready-made squad full of friends, so judges and teammates can try every
// feature in one click.
export function createDemo(id, body = {}) {
  const you = str(body.you, 30) || 'You';
  const sq = blankSquad(id, 'Demo: Saturday bowling', body.currency || '$');
  sq.demo = true;
  const add = (name) => { const m = newMember(name); sq.members[m.id] = m; return m; };
  const t0 = now() - 1000 * 60 * 90;
  const tick = (mins) => t0 + mins * 60 * 1000;
  const sam = add('Sam'), aisha = add('Aisha'), ravi = add('Ravi'), mia = add('Mia'), leo = add('Leo');
  const me = add(you === 'Sam' || you === 'Aisha' || you === 'Ravi' || you === 'Mia' || you === 'Leo' ? you + ' (you)' : you);
  for (const m of [sam, aisha, ravi, mia]) m.status = 'going';
  leo.status = 'maybe';
  const role = (n) => sq.roles.find((r) => r.name === n);
  role('Info gatherer').holderId = mia.id;
  // The Planner role is left open on purpose: claim it in Crew to try editing
  // the plan. Aisha is the Treasurer (set below with the payments).

  const day = new Date(Date.now() + 7 * 86400000);
  const date = day.toISOString().slice(0, 10);
  const opt = (text, votes, extra = {}) => ({ id: rid(6), text, votes, ...extra });
  sq.polls.push(
    { id: rid(6), kind: 'place', q: 'Where should we go?', multi: false, by: sam.id, at: tick(5), closed: true, picked: null,
      options: [opt('Strike Bowling', [sam.id, mia.id, leo.id]), opt('Lucky Lanes', [ravi.id])] },
    { id: rid(6), kind: 'time', q: 'When works for everyone?', multi: true, by: aisha.id, at: tick(9), closed: true, picked: null,
      options: [opt(`${date} 18:30`, [aisha.id, sam.id, ravi.id], { date, time: '18:30' }), opt(`${date} 20:00`, [leo.id], { date, time: '20:00' })] },
  );
  sq.polls[0].picked = sq.polls[0].options[0].id;
  sq.polls[1].picked = sq.polls[1].options[0].id;
  Object.assign(sq.plan, { venue: 'Strike Bowling', address: '120 Market St', date, time: '18:30', notes: 'Meet at the main entrance. Bring socks!', updatedBy: 'Sam', updatedAt: tick(20) });
  sq.info.push({ id: rid(6), text: 'Lanes are $8/game, shoe rental $3. Open till 11pm.', by: mia.id, at: tick(25) });

  aisha.ride = { ...aisha.ride, mode: 'driving', seats: 3 };
  ravi.ride = { ...ravi.ride, mode: 'need', driverId: aisha.id, riderState: 'ready', area: 'Lake Road area', pickup: { text: 'Blue gate, 12 Lake Road', lat: null, lng: null, at: now() - 40 * 60 * 1000 } };
  mia.ride = { ...mia.ride, mode: 'need', area: 'Library area' };
  sam.ride = { ...sam.ride, mode: 'self' };
  // Aisha has invited you into the car: accept or decline it to try ride requests
  sq.rideReqs.push({ id: rid(6), kind: 'invite', riderId: me.id, driverId: aisha.id, at: tick(70) });
  // Leo nudged you to answer if you're coming
  me.nudges.push({ from: leo.id, kind: 'rsvp', at: tick(75) });

  sq.polls.push({
    id: rid(6), kind: 'custom', q: 'Food after?', multi: false, by: leo.id, at: tick(33), closed: false, picked: null,
    options: [
      { id: rid(6), text: 'Pizza', votes: [leo.id, ravi.id] },
      { id: rid(6), text: 'Burgers', votes: [aisha.id] },
      { id: rid(6), text: 'Head home', votes: [] },
    ],
  });
  sq.schedule.push(
    { id: rid(6), time: '18:15', text: 'Meet at the main entrance', by: sam.id },
    { id: rid(6), time: '18:30', text: 'Bowling, 2 games', by: sam.id },
    { id: rid(6), time: '20:30', text: 'Food (see the poll)', by: sam.id },
  );

  sq.budget = { mode: 'each', amount: 20 };
  role('Treasurer').holderId = aisha.id;
  for (const m of [sam, ravi]) { m.paid = 'confirmed'; m.paidAmt = 20; m.confirmedAmt = 20; }
  aisha.paid = 'sent'; aisha.paidAmt = 20; // the Treasurer's own payment, still to confirm
  sq.expenses.push({ id: rid(6), what: 'Lane deposit', amount: 16, by: aisha.id, at: tick(60) });
  sq.tasks.push(
    { id: rid(6), text: 'Book 2 lanes for 6:30', assigneeId: sam.id, done: true, by: sam.id, at: tick(30) },
    { id: rid(6), text: 'Check if they take cards', assigneeId: mia.id, done: false, by: mia.id, at: tick(31) },
    { id: rid(6), text: 'Decide on food after', assigneeId: null, done: false, by: leo.id, at: tick(32) },
  );
  sq.activity = [
    [0, 'Sam started the squad', 'plan'], [3, 'Aisha joined', 'join'], [3, 'Ravi joined', 'join'], [4, 'Mia joined', 'join'], [4, 'Leo joined', 'join'],
    [5, 'Sam suggested Strike Bowling', 'vote'], [20, 'Sam made a venue official', 'plan'], [25, 'Mia pinned some info', 'pin'],
    [33, 'Leo started a poll: Food after?', 'vote'], [35, 'Aisha is driving (3 seats)', 'car'], [40, 'Aisha accepted Ravi into the car', 'car'],
    [50, 'Mia needs a pickup', 'car'], [55, 'Sam set the budget: $20 per person', 'money'], [60, 'Aisha logged spending: Lane deposit ($16)', 'money'],
  ].map(([m, t, icon]) => ({ at: tick(m), text: t, icon }));
  log(sq, `${me.name} joined`, 'join');
  sq.creatorId = me.id;
  return { sq, token: me.token };
}

// ---------- view (what a member is allowed to see) ----------
export function view(sq, me) {
  const members = Object.values(sq.members).map((m) => {
    const seePickup = m.id === me.id || (m.ride.driverId && m.ride.driverId === me.id);
    return {
      id: m.id, name: m.name, status: m.status, joinedAt: m.joinedAt, pledge: m.pledge, paid: m.paid, paidAmt: m.paidAmt, confirmedAmt: m.confirmedAmt, arrived: m.arrived,
      nudges: m.id === me.id ? m.nudges : undefined, // reminders are only shown to the person nudged
      ride: {
        mode: m.ride.mode, seats: m.ride.seats, driverId: m.ride.driverId,
        riderState: m.ride.riderState, driverState: m.ride.driverState, eta: m.ride.eta, etaAt: m.ride.etaAt,
        area: m.ride.area,
        hasPickup: !!m.ride.pickup,
        pickup: seePickup ? m.ride.pickup : undefined, // pickup spots only reach the rider and their driver
      },
    };
  });
  return {
    id: sq.id, key: sq.key, name: sq.name, currency: sq.currency, createdAt: sq.createdAt, version: sq.version,
    plan: sq.plan, roles: sq.roles, tasks: sq.tasks, info: sq.info, budget: sq.budget,
    expenses: sq.expenses, activity: sq.activity.slice(-40), members, me: me.id,
    polls: sq.polls, schedule: sq.schedule,
    // ride requests are private to the two people involved
    rideReqs: sq.rideReqs.filter((q) => q.riderId === me.id || q.driverId === me.id),
    demo: !!sq.demo, expiresAt: expiresAt(sq), pickupTtl: PICKUP_TTL, canDelete: canDelete(sq, me), canPlan: canPlan(sq, me),
  };
}

// ---------- actions ----------
const PLAN_FIELDS = { venue: 120, address: 300, date: 10, time: 5, notes: 1000 };

// Only the Planner can change the plan (details, schedule, picking poll winners).
export const canPlan = (sq, me) => isRole(sq, me, 'Planner');
function mustPlan(sq, me) {
  if (canPlan(sq, me)) return;
  const planner = roleHolder(sq, 'Planner');
  fail(planner ? `Only ${planner.name} (the Planner) can change the plan.` : 'Nobody is the Planner yet. Claim the role in Crew to edit the plan.');
}

const pollOption = (kind, o) => {
  if (kind === 'time') {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(o?.date) ? o.date : '';
    const time = /^\d{2}:\d{2}$/.test(o?.time) ? o.time : '';
    if (!date && !time) fail('Pick a date or a time.');
    return { id: rid(6), date, time, text: [date, time].filter(Boolean).join(' '), votes: [] };
  }
  const t = str(typeof o === 'string' ? o : o?.text, 80);
  if (!t) fail(kind === 'place' ? 'Type a place.' : 'Type an option.');
  return { id: rid(6), text: t, votes: [] };
};

const actions = {
  // ----- the plan: only the Planner edits it; everyone else views it -----
  'plan.update'(sq, me, p) {
    mustPlan(sq, me);
    for (const [k, max] of Object.entries(PLAN_FIELDS)) {
      if (p[k] !== undefined) sq.plan[k] = k === 'notes' ? text(p[k], max) : str(p[k], max);
    }
    sq.plan.updatedBy = me.name;
    sq.plan.updatedAt = now();
    log(sq, `${me.name} updated the plan`, 'plan');
  },
  'plan.lock'(sq, me, p) {
    mustPlan(sq, me);
    sq.plan.locked = !!p.locked;
    log(sq, `${me.name} ${sq.plan.locked ? 'locked in the plan. It\'s final' : 'reopened the plan'}`, 'plan');
  },
  'info.add'(sq, me, p) {
    const t = text(p.text, 600);
    if (!t) fail('Write something to pin.');
    if (sq.info.length >= 60) fail('The info board is full. Unpin something first.');
    sq.info.push({ id: rid(6), text: t, by: me.id, at: now() });
    log(sq, `${me.name} pinned some info`, 'pin');
  },
  'info.remove'(sq, me, p) {
    sq.info = sq.info.filter((i) => i.id !== p.id);
  },

  'me.status'(sq, me, p) {
    if (!['going', 'maybe', 'out'].includes(p.status)) fail('Unknown status.');
    me.status = p.status;
    if (p.status === 'out') {
      if (me.ride.mode === 'driving') releaseRiders(sq, me);
      dropReqs(sq, me.id);
      me.ride.mode = null; me.ride.driverId = null; me.ride.pickup = null; me.arrived = null;
    }
    me.nudges = me.nudges.filter((n) => n.kind !== 'rsvp');
    log(sq, `${me.name} is ${{ going: 'going', maybe: 'a maybe', out: 'out this time' }[p.status]}`, 'join');
  },
  'me.leave'(sq, me) {
    if (me.ride.mode === 'driving') releaseRiders(sq, me);
    dropReqs(sq, me.id);
    for (const r of sq.roles) if (r.holderId === me.id) r.holderId = null;
    for (const t of sq.tasks) if (t.assigneeId === me.id) t.assigneeId = null;
    delete sq.members[me.id];
    log(sq, `${me.name} left the squad`, 'leave');
  },
  // check in at the venue on the day
  'me.arrived'(sq, me, p) {
    if (me.status === 'out') fail('You marked yourself as not coming.');
    me.arrived = p.arrived ? now() : null;
    if (p.arrived) {
      if (me.ride.driverId) { me.ride.riderState = 'picked'; me.ride.pickup = null; }
      log(sq, `${me.name} has arrived`, 'pin');
    }
  },
  // a friendly reminder only the nudged person sees
  'nudge'(sq, me, p) {
    const kinds = { rsvp: 'say if you\'re coming', ride: 'sort out your ride', pay: 'hand over the money', task: 'check your to-do' };
    const t = sq.members[p.memberId] || fail('That person left.');
    if (t.id === me.id) fail('You can\'t nudge yourself.');
    if (!kinds[p.kind]) fail('Unknown reminder.');
    if (t.nudges.some((n) => n.from === me.id && n.kind === p.kind && now() - n.at < 30 * 60 * 1000)) fail(`You already nudged ${t.name} about that. Give it 30 minutes.`);
    t.nudges.push({ from: me.id, kind: p.kind, at: now() });
    if (t.nudges.length > 8) t.nudges.splice(0, t.nudges.length - 8);
    log(sq, `${me.name} nudged ${t.name} to ${kinds[p.kind]}`, 'bell');
  },
  'me.clearNudges'(sq, me) { me.nudges = []; },

  'ride.mode'(sq, me, p) {
    const mode = p.mode;
    if (!['driving', 'need', 'self', null].includes(mode)) fail('Unknown ride option.');
    if (me.ride.mode === 'driving' && mode !== 'driving') { releaseRiders(sq, me); dropReqs(sq, me.id, 'driver'); }
    if (mode === 'driving' || mode === 'self' || mode === null) dropReqs(sq, me.id, 'rider');
    if (mode !== 'need') { me.ride.driverId = null; me.ride.pickup = null; }
    me.ride.mode = mode;
    me.ride.riderState = 'waiting';
    if (mode === 'driving') { me.ride.seats = me.ride.seats || 3; me.ride.driverState = 'idle'; me.ride.eta = null; }
    markGoing(me);
    me.nudges = me.nudges.filter((n) => n.kind !== 'ride');
    log(sq, `${me.name} ${{ driving: `is driving (${me.ride.seats} seats)`, need: 'needs a pickup', self: 'is getting there on their own' }[mode] || 'cleared their ride'}`, 'car');
  },
  // rough area shown to everyone, so drivers know who's on their way
  'ride.area'(sq, me, p) {
    me.ride.area = str(p.area, 60);
  },
  'ride.seats'(sq, me, p) {
    if (me.ride.mode !== 'driving') fail('You are not driving.');
    const seats = Math.max(1, Math.min(10, Math.round(Number(p.seats) || 1)));
    if (seats < ridersOf(sq, me.id).length) fail('You already have more riders than that. Remove someone first.');
    me.ride.seats = seats;
  },
  'ride.driverState'(sq, me, p) {
    if (me.ride.mode !== 'driving') fail('You are not driving.');
    if (!['idle', 'onway'].includes(p.state)) fail('Unknown state.');
    me.ride.driverState = p.state;
    const eta = Math.round(Number(p.eta));
    me.ride.eta = p.state === 'onway' && eta > 0 && eta <= 240 ? eta : null;
    me.ride.etaAt = me.ride.eta ? now() : null;
    if (p.state === 'onway') log(sq, `${me.name} has left and is doing pickups${me.ride.eta ? ` (about ${me.ride.eta} min)` : ''}`, 'car');
  },

  // rider asks a driver for a seat; the driver decides
  'ride.ask'(sq, me, p) {
    const d = sq.members[p.driverId];
    if (!d || d.ride.mode !== 'driving' || d.status === 'out') fail('That person is not driving anymore.');
    if (d.id === me.id) fail('That\'s your own car.');
    if (me.ride.mode === 'driving') fail('You\'re driving. Switch to "I need a pickup" first.');
    if (me.ride.driverId) fail('You already have a seat. Leave that car first.');
    if (freeSeats(sq, d) <= 0) fail(`${d.name}'s car is full.`);
    if (sq.rideReqs.some((q) => q.riderId === me.id && q.driverId === d.id)) fail(`You and ${d.name} already have a request open. Check Rides.`);
    me.ride.mode = 'need';
    markGoing(me);
    sq.rideReqs.push({ id: rid(6), kind: 'ask', riderId: me.id, driverId: d.id, at: now() });
    log(sq, `${me.name} asked ${d.name} for a seat`, 'car');
  },
  // driver invites someone who's waiting; the rider decides
  'ride.invite'(sq, me, p) {
    const r = sq.members[p.riderId];
    if (me.ride.mode !== 'driving') fail('Say you\'re driving first.');
    if (!r || r.id === me.id) fail('That person isn\'t in the squad.');
    if (!isWaiting(r)) fail(`${r.name} doesn't need a ride right now.`);
    if (freeSeats(sq, me) <= 0) fail('Your car is full. Add a seat first.');
    if (sq.rideReqs.some((q) => q.riderId === r.id && q.driverId === me.id)) fail(`You and ${r.name} already have a request open.`);
    sq.rideReqs.push({ id: rid(6), kind: 'invite', riderId: r.id, driverId: me.id, at: now() });
    log(sq, `${me.name} invited ${r.name} into the car`, 'car');
  },
  // the person the request was sent to says yes or no
  'ride.respond'(sq, me, p) {
    const q = sq.rideReqs.find((x) => x.id === p.id) || fail('That request was already answered or cancelled.');
    const receiver = q.kind === 'ask' ? q.driverId : q.riderId;
    if (receiver !== me.id) fail('Only the person it was sent to can answer it.');
    const r = sq.members[q.riderId], d = sq.members[q.driverId];
    sq.rideReqs = sq.rideReqs.filter((x) => x !== q);
    if (!r || !d) fail('That person left the squad.');
    if (!p.accept) {
      log(sq, q.kind === 'ask' ? `${d.name} couldn't take ${r.name} this time` : `${r.name} said no thanks to ${d.name}'s car`, 'car');
      return;
    }
    if (d.ride.mode !== 'driving' || d.status === 'out') fail(`${d.name} isn't driving anymore.`);
    if (r.ride.driverId) fail(`${r.name} already has a seat in another car.`);
    if (freeSeats(sq, d) <= 0) fail(`${d.name}'s car is full now.`);
    r.ride.mode = 'need';
    r.ride.driverId = d.id;
    r.ride.riderState = 'waiting';
    markGoing(r);
    dropReqs(sq, r.id, 'rider'); // one seat is enough: clear the rider's other requests
    r.nudges = r.nudges.filter((n) => n.kind !== 'ride');
    log(sq, `${r.name} is riding with ${d.name}`, 'check');
  },
  // the sender takes a request back
  'ride.cancel'(sq, me, p) {
    const q = sq.rideReqs.find((x) => x.id === p.id) || fail('That request is already gone.');
    const sender = q.kind === 'ask' ? q.riderId : q.driverId;
    if (sender !== me.id) fail('Only whoever sent it can cancel it.');
    sq.rideReqs = sq.rideReqs.filter((x) => x !== q);
  },
  'ride.leave'(sq, me) {
    const d = sq.members[me.ride.driverId];
    me.ride.driverId = null;
    me.ride.riderState = 'waiting';
    if (d) log(sq, `${me.name} left ${d.name}'s car`, 'car');
  },
  'ride.pickup'(sq, me, p) {
    if (me.ride.mode !== 'need') fail('Only people who need a pickup share a location.');
    const t = str(p.text, 300);
    const lat = Number(p.lat), lng = Number(p.lng);
    const hasGeo = p.lat != null && p.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (!t && !hasGeo) fail('Type where to pick you up, or use your current location.');
    me.ride.pickup = { text: t, lat: hasGeo ? lat : null, lng: hasGeo ? lng : null, at: now() };
  },
  'ride.clearPickup'(sq, me) { me.ride.pickup = null; },
  'ride.ready'(sq, me, p) {
    if (me.ride.mode !== 'need' || !me.ride.driverId) fail('Grab a seat in a car first.');
    me.ride.riderState = p.ready ? 'ready' : 'waiting';
    const d = sq.members[me.ride.driverId];
    if (p.ready) log(sq, `${me.name} is ready for ${d ? d.name : 'their driver'}`, 'car');
  },
  'ride.outside'(sq, me, p) {
    const r = sq.members[p.riderId];
    if (!r || r.ride.driverId !== me.id) fail('That person is not in your car.');
    r.ride.riderState = 'outside';
    log(sq, `${me.name} is outside ${r.name}'s place`, 'pin');
  },
  'ride.picked'(sq, me, p) {
    const r = sq.members[p.riderId];
    if (!r || r.ride.driverId !== me.id) fail('That person is not in your car.');
    r.ride.riderState = 'picked';
    r.ride.pickup = null; // location is deleted the moment it is no longer needed
    log(sq, `${me.name} picked up ${r.name}`, 'check');
  },
  'ride.kick'(sq, me, p) {
    const r = sq.members[p.riderId];
    if (!r || r.ride.driverId !== me.id) fail('That person is not in your car.');
    r.ride.driverId = null;
    r.ride.riderState = 'waiting';
    log(sq, `${me.name} removed ${r.name} from the car`, 'car');
  },

  // ----- Decisions: anyone can start a poll, add options and vote -----
  // kind: 'place' (where), 'time' (when) or 'custom' (anything: "Food after?")
  // multi: people can tick more than one option (default for time polls)
  'poll.add'(sq, me, p) {
    const kind = ['place', 'time', 'custom'].includes(p.kind) ? p.kind : 'custom';
    const q = str(p.q, 100) || { place: 'Where should we go?', time: 'When works for everyone?' }[kind] || fail('Write the question.');
    const opts = (Array.isArray(p.options) ? p.options : []).slice(0, 12).map((o) => pollOption(kind, o));
    const seen = new Set();
    const unique = opts.filter((o) => { const k = o.text.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    if (kind === 'custom' && unique.length < 2) fail('Give at least two options.');
    if (!unique.length) fail('Add at least one option.');
    if (sq.polls.filter((x) => !x.closed).length >= 15) fail('That\'s a lot of open polls. Close some first.');
    const multi = p.multi === undefined ? kind === 'time' : !!p.multi;
    sq.polls.push({ id: rid(6), kind, q, multi, by: me.id, at: now(), closed: false, picked: null, options: unique });
    log(sq, `${me.name} started a poll: ${q}`, 'vote');
  },
  'poll.option'(sq, me, p) {
    const poll = sq.polls.find((x) => x.id === p.id) || fail('That poll is gone.');
    if (poll.closed) fail('That poll is closed.');
    if (poll.options.length >= 12) fail('That poll has enough options.');
    const opt = pollOption(poll.kind, poll.kind === 'time' ? { date: p.date, time: p.time } : p.text);
    if (poll.options.some((o) => o.text.toLowerCase() === opt.text.toLowerCase())) fail('That option is already there.');
    opt.votes.push(me.id); // you'd obviously vote for your own idea
    if (!poll.multi) for (const o of poll.options) o.votes = o.votes.filter((v) => v !== me.id);
    poll.options.push(opt);
    log(sq, `${me.name} added "${opt.text}" to ${poll.q}`, 'vote');
  },
  'poll.vote'(sq, me, p) {
    const poll = sq.polls.find((x) => x.id === p.id) || fail('That poll is gone.');
    if (poll.closed) fail('That poll is closed.');
    const opt = poll.options.find((o) => o.id === p.optionId) || fail('That option is gone.');
    const had = opt.votes.includes(me.id);
    if (!poll.multi) for (const o of poll.options) o.votes = o.votes.filter((v) => v !== me.id);
    else opt.votes = opt.votes.filter((v) => v !== me.id);
    if (!had) opt.votes.push(me.id);
  },
  'poll.close'(sq, me, p) {
    const poll = sq.polls.find((x) => x.id === p.id) || fail('That poll is gone.');
    if (poll.by !== me.id && !canPlan(sq, me)) fail('Only whoever started it, or the Planner, can close it.');
    poll.closed = !poll.closed;
    if (poll.closed) {
      const top = [...poll.options].sort((a, b) => b.votes.length - a.votes.length)[0];
      log(sq, `Poll closed: ${poll.q} ${top && top.votes.length ? `"${top.text}" won` : '(no votes)'}`, 'vote');
    } else poll.picked = null;
  },
  // Planner turns a place/time option into the official plan
  'poll.pick'(sq, me, p) {
    mustPlan(sq, me);
    const poll = sq.polls.find((x) => x.id === p.id) || fail('That poll is gone.');
    if (poll.kind === 'custom') fail('Only place and time polls can go into the plan.');
    const opt = poll.options.find((o) => o.id === p.optionId) || fail('That option is gone.');
    if (poll.kind === 'place') sq.plan.venue = opt.text;
    else { if (opt.date) sq.plan.date = opt.date; if (opt.time) sq.plan.time = opt.time; }
    sq.plan.updatedBy = me.name;
    sq.plan.updatedAt = now();
    poll.closed = true;
    poll.picked = opt.id;
    log(sq, `${me.name} made "${opt.text}" official`, 'plan');
  },
  'poll.remove'(sq, me, p) {
    const poll = sq.polls.find((x) => x.id === p.id) || fail('That poll is gone.');
    if (poll.by !== me.id && !canPlan(sq, me)) fail('Only whoever started it, or the Planner, can remove it.');
    sq.polls = sq.polls.filter((x) => x !== poll);
  },

  // ----- the day's schedule: part of the plan, so Planner only -----
  'sched.add'(sq, me, p) {
    mustPlan(sq, me);
    const time = /^\d{2}:\d{2}$/.test(p.time) ? p.time : fail('Pick a time.');
    const t = str(p.text, 100) || fail('What happens then?');
    if (sq.schedule.length >= 30) fail('The schedule is full.');
    sq.schedule.push({ id: rid(6), time, text: t, by: me.id });
    sq.schedule.sort((a, b) => a.time.localeCompare(b.time));
  },
  'sched.remove'(sq, me, p) {
    mustPlan(sq, me);
    sq.schedule = sq.schedule.filter((x) => x.id !== p.id);
  },

  'role.claim'(sq, me, p) {
    const r = sq.roles.find((x) => x.id === p.id) || fail('That role is gone.');
    if (r.holderId && r.holderId !== me.id && sq.members[r.holderId]) fail(`${sq.members[r.holderId].name} already has this role.`);
    r.holderId = me.id;
    log(sq, `${me.name} is now the ${r.name}`, 'task');
  },
  'role.release'(sq, me, p) {
    const r = sq.roles.find((x) => x.id === p.id) || fail('That role is gone.');
    if (r.holderId !== me.id) fail('That is not your role.');
    r.holderId = null;
    log(sq, `${me.name} stepped down as ${r.name}`, 'task');
  },
  'role.add'(sq, me, p) {
    const name = str(p.name, 40);
    if (!name) fail('Name the role.');
    if (sq.roles.length >= 20) fail('That\'s enough roles.');
    if (sq.roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) fail('That role already exists.');
    sq.roles.push({ id: rid(6), name, desc: str(p.desc, 120), holderId: null, custom: true });
    log(sq, `${me.name} added the role “${name}”`, 'task');
  },
  'role.remove'(sq, me, p) {
    const r = sq.roles.find((x) => x.id === p.id);
    if (!r || !r.custom) fail('Built-in roles stay.');
    sq.roles = sq.roles.filter((x) => x !== r);
  },
  'task.add'(sq, me, p) {
    const t = str(p.text, 160);
    if (!t) fail('Write the task.');
    if (sq.tasks.length >= 100) fail('Too many tasks. Clear some first.');
    const assigneeId = sq.members[p.assigneeId] ? p.assigneeId : null;
    sq.tasks.push({ id: rid(6), text: t, assigneeId, done: false, by: me.id, at: now() });
    log(sq, `${me.name} added a task: ${t}`, 'task');
  },
  'task.toggle'(sq, me, p) {
    const t = sq.tasks.find((x) => x.id === p.id) || fail('That task is gone.');
    t.done = !t.done;
    if (t.done) log(sq, `${me.name} finished: ${t.text}`, 'check');
  },
  'task.assign'(sq, me, p) {
    const t = sq.tasks.find((x) => x.id === p.id) || fail('That task is gone.');
    t.assigneeId = sq.members[p.assigneeId] ? p.assigneeId : null;
  },
  'task.remove'(sq, me, p) {
    sq.tasks = sq.tasks.filter((x) => x.id !== p.id);
  },

  // money: tracking only, no money moves through the app
  'budget.set'(sq, me, p) {
    const t = roleHolder(sq, 'Treasurer');
    if (t && t.id !== me.id) fail(`Only ${t.name} (Treasurer) can change the budget.`);
    sq.budget.mode = p.mode === 'goal' ? 'goal' : 'each';
    sq.budget.amount = money(p.amount);
    if (p.currency) sq.currency = str(p.currency, 4) || sq.currency;
    log(sq, `${me.name} set the budget: ${sq.currency}${sq.budget.amount} ${sq.budget.mode === 'each' ? 'per person' : 'for the whole group'}`, 'money');
  },
  'me.pledge'(sq, me, p) {
    me.pledge = money(p.amount);
    log(sq, `${me.name} is bringing ${sq.currency}${me.pledge}`, 'money');
  },
  // Say how much you've handed over. A new or changed amount always waits
  // for the Treasurer: nobody can mark their own money as confirmed.
  'me.paid'(sq, me, p) {
    if (p.undo || p.sent === false) {
      // take back an unconfirmed claim: go back to whatever was last confirmed
      if (me.paid !== 'sent') fail('There\'s nothing waiting to take back.');
      me.paidAmt = me.confirmedAmt;
      me.paid = me.confirmedAmt > 0 ? 'confirmed' : 'none';
      return;
    }
    const amount = p.amount === undefined || p.amount === '' ? owesOf(sq, me) : money(p.amount);
    if (!(amount > 0)) fail('Enter how much you paid.');
    if (me.paid === 'confirmed' && amount === me.confirmedAmt) fail(`The Treasurer already confirmed ${sq.currency}${amount}.`);
    const changed = me.confirmedAmt > 0 || me.paid === 'sent';
    me.paidAmt = amount;
    me.paid = 'sent';
    me.nudges = me.nudges.filter((n) => n.kind !== 'pay');
    log(sq, changed ? `${me.name} changed their payment to ${sq.currency}${amount}. Waiting for the Treasurer.` : `${me.name} says they paid ${sq.currency}${amount}`, 'money');
  },
  // Treasurer only: confirm a pending amount, reject it, or undo a confirmation.
  'money.confirm'(sq, me, p) {
    const t = roleHolder(sq, 'Treasurer');
    if (!t) fail('Someone needs to claim the Treasurer role first (Crew, Roles).');
    if (t.id !== me.id) fail(`Only ${t.name} (Treasurer) can confirm money.`);
    const m = sq.members[p.memberId] || fail('That person left.');
    if (p.confirmed) {
      if (m.paid !== 'sent') fail(`${m.name} has nothing waiting to confirm.`);
      m.confirmedAmt = m.paidAmt;
      m.paid = 'confirmed';
      log(sq, `${me.name} confirmed ${m.name}'s ${sq.currency}${m.confirmedAmt}`, 'money');
    } else if (m.paid === 'sent') {
      m.paidAmt = m.confirmedAmt; // rejected: back to the last confirmed amount
      m.paid = m.confirmedAmt > 0 ? 'confirmed' : 'none';
      log(sq, `${me.name} didn't get ${m.name}'s payment update`, 'money');
    } else if (m.paid === 'confirmed') {
      m.confirmedAmt = 0; // undo: it goes back to waiting
      m.paid = 'sent';
      log(sq, `${me.name} un-confirmed ${m.name}'s payment`, 'money');
    }
  },
  'expense.add'(sq, me, p) {
    const what = str(p.what, 100);
    const amount = money(p.amount);
    if (!what || !amount) fail('Say what it was and how much.');
    if (sq.expenses.length >= 100) fail('Too many entries.');
    sq.expenses.push({ id: rid(6), what, amount, by: me.id, at: now() });
    log(sq, `${me.name} logged spending: ${what} (${sq.currency}${amount})`, 'money');
  },
  'expense.remove'(sq, me, p) {
    const e = sq.expenses.find((x) => x.id === p.id) || fail('Already gone.');
    if (e.by !== me.id && !isRole(sq, me, 'Treasurer')) fail('Only whoever logged it, or the Treasurer, can remove it.');
    sq.expenses = sq.expenses.filter((x) => x !== e);
    log(sq, `${me.name} removed spending: ${e.what}`, 'money');
  },
};

export const findByToken = (sq, token) => (token ? Object.values(sq.members).find((m) => m.token === token) : null);

export const GONE = 'This squad doesn\'t exist anymore. It was deleted, or the link is wrong.';

// Handles every per-squad request. `sub` is '' (read), 'join' or 'act'.
// Returns { status, body, changed, deleted }.
export function handle(sq, req) {
  // expired squads are gone, even if the cleanup timer hasn't fired yet
  migrate(sq);
  if (now() >= expiresAt(sq)) return { status: 404, body: { error: GONE }, deleted: true };
  const pruned = prune(sq);
  if (pruned) sq.version++;
  const r = handleInner(sq, req);
  if (pruned) r.changed = true;
  return r;
}

function handleInner(sq, { method, sub, body = {}, token, key }) {
  try {
    const me = findByToken(sq, token);
    if (sub === '' && method === 'GET') {
      if (me) return { status: 200, body: view(sq, me) };
      if (key && key === sq.key) return { status: 200, body: { preview: true, name: sq.name, members: Object.values(sq.members).map((m) => m.name) } };
      return { status: 403, body: { error: 'You need the invite link from your squad to open this.' } };
    }
    if (sub === 'join' && method === 'POST') {
      if (body.k !== sq.key) return { status: 403, body: { error: 'That invite link is not valid.' } };
      const name = str(body.name, 30) || fail('Enter your name.');
      if (Object.values(sq.members).some((m) => m.name.toLowerCase() === name.toLowerCase())) {
        fail(`Someone called ${name} is already in. If that's you on a new device, open your personal link from your old device (Crew tab). Otherwise add an initial.`);
      }
      if (Object.keys(sq.members).length >= 40) fail('This squad is full (40 people).');
      const m = newMember(name);
      sq.members[m.id] = m;
      log(sq, `${name} joined`, 'join');
      sq.version++;
      return { status: 200, body: { token: m.token }, changed: true };
    }
    if (sub === 'act' && method === 'POST') {
      if (!me) return { status: 403, body: { error: 'You are not in this squad on this device.' } };
      if (body.type === 'squad.delete') {
        if (!canDelete(sq, me)) {
          const planner = roleHolder(sq, 'Planner');
          fail(planner ? `Only ${planner.name} (the Planner) can delete the trip.` : 'Only the Planner can delete the trip. Nobody has the role yet.');
        }
        return { status: 200, body: { deleted: true }, deleted: true };
      }
      const fn = actions[body.type] || fail('Unknown action.');
      fn(sq, me, body);
      sq.version++;
      return { status: 200, body: sq.members[me.id] ? view(sq, me) : { left: true }, changed: true };
    }
    return { status: 404, body: { error: 'Not found' } };
  } catch (e) {
    if (e instanceof UserError) return { status: 400, body: { error: e.message } };
    throw e;
  }
}
