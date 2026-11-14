// Linkup core: all squad rules live here. Shared by the local Node server
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
    ride: { mode: null, seats: 3, driverId: null, riderState: 'waiting', driverState: 'idle', pickup: null },
    pledge: 0,
    paid: 'none', // none | sent | confirmed
    joinedAt: now(),
  };
}

function log(sq, t) {
  sq.activity.push({ at: now(), text: t });
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

// Who may delete the whole squad: the Planner; with no Planner, whoever started
// it; if they've left too, the longest-standing member.
function canDelete(sq, me) {
  const planner = roleHolder(sq, 'Planner');
  if (planner) return planner.id === me.id;
  if (sq.creatorId && sq.members[sq.creatorId]) return sq.creatorId === me.id;
  const oldest = Object.values(sq.members).sort((a, b) => a.joinedAt - b.joinedAt)[0];
  return !!oldest && oldest.id === me.id;
}

// ---------- create ----------
function blankSquad(id, name, currency) {
  return {
    id, key: rid(12), name, currency: str(currency, 4) || '$', createdAt: now(), version: 1,
    plan: { venue: '', address: '', date: '', time: '', notes: '', locked: false, updatedBy: null, updatedAt: null },
    ideas: [], info: [], tasks: [], expenses: [], activity: [], members: {},
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
  log(sq, `${you} started the squad`);
  return { sq, token: m.token };
}

// A ready-made squad full of friends, so judges and teammates can try every
// feature in one click.
export function createDemo(id, body = {}) {
  const you = str(body.you, 30) || 'You';
  const sq = blankSquad(id, 'Demo: Saturday bowling 🎳', body.currency || '$');
  sq.demo = true;
  const add = (name) => { const m = newMember(name); sq.members[m.id] = m; return m; };
  const t0 = now() - 1000 * 60 * 90;
  const tick = (mins) => t0 + mins * 60 * 1000;
  const sam = add('Sam'), aisha = add('Aisha'), ravi = add('Ravi'), mia = add('Mia'), leo = add('Leo');
  const me = add(you === 'Sam' || you === 'Aisha' || you === 'Ravi' || you === 'Mia' || you === 'Leo' ? you + ' (you)' : you);
  for (const m of [sam, aisha, ravi, mia]) m.status = 'going';
  leo.status = 'maybe';
  const role = (n) => sq.roles.find((r) => r.name === n);
  role('Planner').holderId = sam.id;
  role('Info gatherer').holderId = mia.id;
  // Treasurer left open on purpose: claim it to try confirming payments.

  const day = new Date(Date.now() + 7 * 86400000);
  const date = day.toISOString().slice(0, 10);
  sq.ideas.push(
    { id: rid(6), kind: 'venue', text: 'Strike Bowling', by: sam.id, votes: [sam.id, mia.id, leo.id], at: tick(5) },
    { id: rid(6), kind: 'venue', text: 'Lucky Lanes', by: ravi.id, votes: [ravi.id], at: tick(7) },
    { id: rid(6), kind: 'time', date, time: '18:30', by: aisha.id, votes: [aisha.id, sam.id], at: tick(9) },
  );
  Object.assign(sq.plan, { venue: 'Strike Bowling', address: '120 Market St', date, time: '18:30', notes: 'Meet at the main entrance. Bring socks!', updatedBy: 'Sam', updatedAt: tick(20) });
  sq.info.push({ id: rid(6), text: 'Lanes are $8/game, shoe rental $3. Open till 11pm.', by: mia.id, at: tick(25) });

  aisha.ride = { ...aisha.ride, mode: 'driving', seats: 3 };
  ravi.ride = { ...ravi.ride, mode: 'need', driverId: aisha.id, riderState: 'ready', pickup: { text: 'Blue gate, 12 Lake Road', lat: null, lng: null, at: tick(40) } };
  mia.ride = { ...mia.ride, mode: 'need' };
  sam.ride = { ...sam.ride, mode: 'self' };

  sq.budget = { mode: 'each', amount: 20 };
  sam.paid = 'sent'; aisha.paid = 'sent'; ravi.paid = 'sent';
  sq.expenses.push({ id: rid(6), what: 'Lane deposit', amount: 16, by: aisha.id, at: tick(60) });
  sq.tasks.push(
    { id: rid(6), text: 'Book 2 lanes for 6:30', assigneeId: sam.id, done: true, by: sam.id, at: tick(30) },
    { id: rid(6), text: 'Check if they take cards', assigneeId: mia.id, done: false, by: mia.id, at: tick(31) },
    { id: rid(6), text: 'Decide on food after', assigneeId: null, done: false, by: leo.id, at: tick(32) },
  );
  sq.activity = [
    [0, 'Sam started the squad'], [3, '👋 Aisha joined'], [3, '👋 Ravi joined'], [4, '👋 Mia joined'], [4, '👋 Leo joined'],
    [5, 'Sam suggested Strike Bowling'], [20, 'Sam made a venue official'], [25, 'Mia pinned some info'],
    [35, 'Aisha is driving (3 seats)'], [40, 'Ravi got a seat in Aisha\'s car'], [50, 'Mia needs a pickup'],
    [55, 'Sam set the budget: $20 per person'], [60, 'Aisha logged spending: Lane deposit ($16)'],
  ].map(([m, t]) => ({ at: tick(m), text: t }));
  log(sq, `👋 ${me.name} joined`);
  sq.creatorId = me.id;
  return { sq, token: me.token };
}

// ---------- view (what a member is allowed to see) ----------
export function view(sq, me) {
  const members = Object.values(sq.members).map((m) => {
    const seePickup = m.id === me.id || (m.ride.driverId && m.ride.driverId === me.id);
    return {
      id: m.id, name: m.name, status: m.status, joinedAt: m.joinedAt, pledge: m.pledge, paid: m.paid,
      ride: {
        mode: m.ride.mode, seats: m.ride.seats, driverId: m.ride.driverId,
        riderState: m.ride.riderState, driverState: m.ride.driverState,
        hasPickup: !!m.ride.pickup,
        pickup: seePickup ? m.ride.pickup : undefined, // pickup spots only reach the rider and their driver
      },
    };
  });
  return {
    id: sq.id, key: sq.key, name: sq.name, currency: sq.currency, createdAt: sq.createdAt, version: sq.version,
    plan: sq.plan, ideas: sq.ideas, roles: sq.roles, tasks: sq.tasks, info: sq.info, budget: sq.budget,
    expenses: sq.expenses, activity: sq.activity.slice(-40), members, me: me.id,
    demo: !!sq.demo, expiresAt: expiresAt(sq), pickupTtl: PICKUP_TTL, canDelete: canDelete(sq, me),
  };
}

// ---------- actions ----------
const PLAN_FIELDS = { venue: 120, address: 300, date: 10, time: 5, notes: 1000 };

const actions = {
  'plan.update'(sq, me, p) {
    const planner = roleHolder(sq, 'Planner');
    if (sq.plan.locked && planner && planner.id !== me.id) fail(`The plan is locked. Ask ${planner.name} (Planner) to unlock it.`);
    for (const [k, max] of Object.entries(PLAN_FIELDS)) {
      if (p[k] !== undefined) sq.plan[k] = k === 'notes' ? text(p[k], max) : str(p[k], max);
    }
    sq.plan.updatedBy = me.name;
    sq.plan.updatedAt = now();
    log(sq, `${me.name} updated the plan`);
  },
  'plan.lock'(sq, me, p) {
    const planner = roleHolder(sq, 'Planner');
    if (planner && planner.id !== me.id) fail(`Only ${planner.name} (Planner) can lock or unlock the plan.`);
    sq.plan.locked = !!p.locked;
    log(sq, `${me.name} ${sq.plan.locked ? 'locked the plan. It\'s final' : 'unlocked the plan'}`);
  },
  'idea.add'(sq, me, p) {
    const kind = p.kind === 'time' ? 'time' : 'venue';
    const idea = { id: rid(6), kind, by: me.id, votes: [me.id], at: now() };
    if (kind === 'venue') {
      idea.text = str(p.text, 120);
      if (!idea.text) fail('Type a place first.');
    } else {
      idea.date = str(p.date, 10);
      idea.time = str(p.time, 5);
      if (!idea.date && !idea.time) fail('Pick a date or a time.');
    }
    if (sq.ideas.length >= 60) fail('That\'s a lot of ideas. Remove some first.');
    sq.ideas.push(idea);
    log(sq, `${me.name} suggested ${kind === 'venue' ? idea.text : 'a time'}`);
  },
  'idea.vote'(sq, me, p) {
    const idea = sq.ideas.find((i) => i.id === p.id) || fail('That idea is gone.');
    const i = idea.votes.indexOf(me.id);
    if (i >= 0) idea.votes.splice(i, 1); else idea.votes.push(me.id);
  },
  'idea.pick'(sq, me, p) {
    const idea = sq.ideas.find((i) => i.id === p.id) || fail('That idea is gone.');
    const planner = roleHolder(sq, 'Planner');
    if (planner && planner.id !== me.id) fail(`Only ${planner.name} (Planner) can make it official.`);
    if (sq.plan.locked) fail('Unlock the plan first.');
    if (idea.kind === 'venue') sq.plan.venue = idea.text;
    else { if (idea.date) sq.plan.date = idea.date; if (idea.time) sq.plan.time = idea.time; }
    sq.plan.updatedBy = me.name;
    sq.plan.updatedAt = now();
    log(sq, `${me.name} made a ${idea.kind === 'venue' ? 'venue' : 'time'} official`);
  },
  'idea.remove'(sq, me, p) {
    const idea = sq.ideas.find((i) => i.id === p.id) || fail('That idea is gone.');
    if (idea.by !== me.id && !isRole(sq, me, 'Planner')) fail('Only whoever suggested it, or the Planner, can remove it.');
    sq.ideas = sq.ideas.filter((i) => i !== idea);
  },
  'info.add'(sq, me, p) {
    const t = text(p.text, 600);
    if (!t) fail('Write something to pin.');
    if (sq.info.length >= 60) fail('The info board is full. Unpin something first.');
    sq.info.push({ id: rid(6), text: t, by: me.id, at: now() });
    log(sq, `${me.name} pinned some info`);
  },
  'info.remove'(sq, me, p) {
    sq.info = sq.info.filter((i) => i.id !== p.id);
  },

  'me.status'(sq, me, p) {
    if (!['going', 'maybe', 'out'].includes(p.status)) fail('Unknown status.');
    me.status = p.status;
    if (p.status === 'out') {
      if (me.ride.mode === 'driving') releaseRiders(sq, me);
      me.ride.mode = null; me.ride.driverId = null; me.ride.pickup = null;
    }
    log(sq, `${me.name} is ${{ going: 'going', maybe: 'a maybe', out: 'out this time' }[p.status]}`);
  },
  'me.leave'(sq, me) {
    if (me.ride.mode === 'driving') releaseRiders(sq, me);
    for (const r of sq.roles) if (r.holderId === me.id) r.holderId = null;
    for (const t of sq.tasks) if (t.assigneeId === me.id) t.assigneeId = null;
    delete sq.members[me.id];
    log(sq, `${me.name} left the squad`);
  },

  'ride.mode'(sq, me, p) {
    const mode = p.mode;
    if (!['driving', 'need', 'self', null].includes(mode)) fail('Unknown ride option.');
    if (me.ride.mode === 'driving' && mode !== 'driving') releaseRiders(sq, me);
    if (mode !== 'need') { me.ride.driverId = null; me.ride.pickup = null; }
    me.ride.mode = mode;
    me.ride.riderState = 'waiting';
    if (mode === 'driving') { me.ride.seats = me.ride.seats || 3; me.ride.driverState = 'idle'; }
    if (!me.status) me.status = 'going';
    log(sq, `${me.name} ${{ driving: `is driving (${me.ride.seats} seats)`, need: 'needs a pickup', self: 'is getting there on their own' }[mode] || 'cleared their ride'}`);
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
    if (p.state === 'onway') log(sq, `🚗 ${me.name} has left and is doing pickups`);
  },
  'ride.join'(sq, me, p) {
    const d = sq.members[p.driverId];
    if (!d || d.ride.mode !== 'driving') fail('That person is not driving anymore.');
    if (ridersOf(sq, d.id).filter((r) => r.id !== me.id).length >= d.ride.seats) fail(`${d.name}'s car is full.`);
    me.ride.mode = 'need';
    me.ride.driverId = d.id;
    me.ride.riderState = 'waiting';
    if (!me.status) me.status = 'going';
    log(sq, `${me.name} got a seat in ${d.name}'s car`);
  },
  'ride.leave'(sq, me) {
    const d = sq.members[me.ride.driverId];
    me.ride.driverId = null;
    me.ride.riderState = 'waiting';
    if (d) log(sq, `${me.name} left ${d.name}'s car`);
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
    if (p.ready) log(sq, `${me.name} is ready for ${d ? d.name : 'their driver'}`);
  },
  'ride.outside'(sq, me, p) {
    const r = sq.members[p.riderId];
    if (!r || r.ride.driverId !== me.id) fail('That person is not in your car.');
    r.ride.riderState = 'outside';
    log(sq, `📍 ${me.name} is outside ${r.name}'s place`);
  },
  'ride.picked'(sq, me, p) {
    const r = sq.members[p.riderId];
    if (!r || r.ride.driverId !== me.id) fail('That person is not in your car.');
    r.ride.riderState = 'picked';
    r.ride.pickup = null; // location is deleted the moment it is no longer needed
    log(sq, `✅ ${me.name} picked up ${r.name}`);
  },
  'ride.kick'(sq, me, p) {
    const r = sq.members[p.riderId];
    if (!r || r.ride.driverId !== me.id) fail('That person is not in your car.');
    r.ride.driverId = null;
    r.ride.riderState = 'waiting';
    log(sq, `${me.name} removed ${r.name} from their car`);
  },

  'role.claim'(sq, me, p) {
    const r = sq.roles.find((x) => x.id === p.id) || fail('That role is gone.');
    if (r.holderId && r.holderId !== me.id && sq.members[r.holderId]) fail(`${sq.members[r.holderId].name} already has this role.`);
    r.holderId = me.id;
    log(sq, `${me.name} is now the ${r.name}`);
  },
  'role.release'(sq, me, p) {
    const r = sq.roles.find((x) => x.id === p.id) || fail('That role is gone.');
    if (r.holderId !== me.id) fail('That is not your role.');
    r.holderId = null;
    log(sq, `${me.name} stepped down as ${r.name}`);
  },
  'role.add'(sq, me, p) {
    const name = str(p.name, 40);
    if (!name) fail('Name the role.');
    if (sq.roles.length >= 20) fail('That\'s enough roles.');
    if (sq.roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) fail('That role already exists.');
    sq.roles.push({ id: rid(6), name, desc: str(p.desc, 120), holderId: null, custom: true });
    log(sq, `${me.name} added the role “${name}”`);
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
    log(sq, `${me.name} added a task: ${t}`);
  },
  'task.toggle'(sq, me, p) {
    const t = sq.tasks.find((x) => x.id === p.id) || fail('That task is gone.');
    t.done = !t.done;
    if (t.done) log(sq, `${me.name} finished: ${t.text}`);
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
    log(sq, `${me.name} set the budget: ${sq.currency}${sq.budget.amount} ${sq.budget.mode === 'each' ? 'per person' : 'for the whole group'}`);
  },
  'me.pledge'(sq, me, p) {
    me.pledge = money(p.amount);
    log(sq, `${me.name} is bringing ${sq.currency}${me.pledge}`);
  },
  'me.paid'(sq, me, p) {
    if (me.paid === 'confirmed' && !p.sent) fail('The Treasurer already confirmed your money. Ask them to undo it.');
    me.paid = p.sent ? 'sent' : 'none';
    if (p.sent) log(sq, `${me.name} says they've handed over their money`);
  },
  'money.confirm'(sq, me, p) {
    const t = roleHolder(sq, 'Treasurer');
    if (!t) fail('Someone needs to claim the Treasurer role first (Jobs tab).');
    if (t.id !== me.id) fail(`Only ${t.name} (Treasurer) can confirm money.`);
    const m = sq.members[p.memberId] || fail('That person left.');
    m.paid = p.confirmed ? 'confirmed' : (m.paid === 'confirmed' ? 'sent' : m.paid);
    if (p.confirmed) log(sq, `💰 ${me.name} confirmed they got ${m.name}'s money`);
  },
  'expense.add'(sq, me, p) {
    const what = str(p.what, 100);
    const amount = money(p.amount);
    if (!what || !amount) fail('Say what it was and how much.');
    if (sq.expenses.length >= 100) fail('Too many entries.');
    sq.expenses.push({ id: rid(6), what, amount, by: me.id, at: now() });
    log(sq, `${me.name} logged spending: ${what} (${sq.currency}${amount})`);
  },
  'expense.remove'(sq, me, p) {
    const e = sq.expenses.find((x) => x.id === p.id) || fail('Already gone.');
    if (e.by !== me.id && !isRole(sq, me, 'Treasurer')) fail('Only whoever logged it, or the Treasurer, can remove it.');
    sq.expenses = sq.expenses.filter((x) => x !== e);
    log(sq, `${me.name} removed spending: ${e.what}`);
  },
};

export const findByToken = (sq, token) => (token ? Object.values(sq.members).find((m) => m.token === token) : null);

export const GONE = 'This squad doesn\'t exist anymore. It was deleted, or the link is wrong.';

// Handles every per-squad request. `sub` is '' (read), 'join' or 'act'.
// Returns { status, body, changed, deleted }.
export function handle(sq, req) {
  // expired squads are gone, even if the cleanup timer hasn't fired yet
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
      log(sq, `👋 ${name} joined`);
      sq.version++;
      return { status: 200, body: { token: m.token }, changed: true };
    }
    if (sub === 'act' && method === 'POST') {
      if (!me) return { status: 403, body: { error: 'You are not in this squad on this device.' } };
      if (body.type === 'squad.delete') {
        if (!canDelete(sq, me)) fail('Only the Planner (or whoever started the squad, if there is no Planner) can delete it.');
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
