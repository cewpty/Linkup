/* Squadup front end: plain JS, no build step.
   World: "Departures". Home is your boarding pass, Rides is a departure board.
   Tabs: Home · Plan · Polls · Rides · Money, plus a Crew page and bottom sheets. */
(() => {
  'use strict';

  // ================= utilities =================
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');

  let memStore = {};
  const STORE_KEY = 'linkup.squads'; // kept from the old name so nobody gets logged out
  const store = {
    all() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return memStore; } },
    save(all) { memStore = all; try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch {} },
    put(id, v) { const all = store.all(); all[id] = { ...(all[id] || {}), ...v }; store.save(all); },
    drop(id) { const all = store.all(); delete all[id]; store.save(all); },
  };

  let toastTimer;
  function toast(msg, isErr = false) {
    toastEl.textContent = msg;
    toastEl.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = ''; }, isErr ? 4500 : 2400);
  }

  async function api(method, url, body, token) {
    let r;
    try {
      r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Member-Token': token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch { throw new Error('No connection. Check your internet.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Something went wrong.'); e.status = r.status; throw e; }
    return j;
  }

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch {}
      ta.remove(); return ok;
    }
  }

  // avatars: muted hues so faces never fight the violet
  const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const av = (name, size = '', mine = false) => `<span class="av ${size} ${mine ? 'mine' : ''}" style="background:hsl(${hue(name)} 32% 34%)" aria-hidden="true">${esc((String(name || '?').trim()[0] || '?').toUpperCase())}</span>`;

  function ago(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 45) return 'now';
    if (s < 3600) return Math.round(s / 60) + 'm';
    if (s < 86400) return Math.round(s / 3600) + 'h';
    return Math.round(s / 86400) + 'd';
  }
  const fmtDate = (date) => { const d = new Date(date + 'T12:00'); return isNaN(d) ? date : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };
  const fmtTime = (time) => { const [h, m] = String(time).split(':').map(Number); const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); };
  const fmtWhen = (date, time) => [date && fmtDate(date), time && fmtTime(time)].filter(Boolean).join(' · ');
  const fmtClock = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  function daysUntil(date) {
    if (!date) return null;
    const d = new Date(date + 'T00:00'); if (isNaN(d)) return null;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  }
  const countdown = (n) => n === null ? '' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n > 1 ? `In ${n} days` : n === -1 ? 'Yesterday' : `${-n} days ago`;
  const mapsUrl = (p) => p && p.lat != null
    ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(typeof p === 'string' ? p : p.text)}`;
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
  // "(you)" after your own name, unless your name already is "You" (the demo user)
  const youTag = (m, meId) => (m.id === meId && !/^you$/i.test(String(m.name).trim()) ? ' (you)' : '');
  const linkify = (t) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

  // ================= icons (authored, one stroke family) =================
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    polls: '<path d="M5 20V11M12 20V5M19 20v-6M3 20h18"/>',
    rides: '<path d="M5 16v-5l2.2-4.4A2 2 0 0 1 9 5.5h6a2 2 0 0 1 1.8 1.1L19 11v5"/><path d="M3 16h18v2.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V18H7v.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M5 11h14"/>',
    money: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19"/><circle cx="16.5" cy="14.5" r="1.3"/><path d="M6 6l9-3 1.5 3"/>',
    crew: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14.5c2.3 0 4 1.5 4.6 4"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    share: '<path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', back: '<path d="m15 6-6 6 6 6"/>',
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    send: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    task: '<path d="m4 7 2 2 3-3M4 15l2 2 3-3M13 8h7M13 16h7"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    leave: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
    nav: '<path d="M3 11 21 3l-8 18-2-8z"/>',
    gps: '<circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="2"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    join: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5M18 8v6M15 11h6"/>',
    dot: '<circle cx="12" cy="12" r="3" fill="currentColor"/>',
    crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    hand: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 6 17.5L4 13.5a1.6 1.6 0 0 1 2.7-1.7L8 13.5"/>',
  };
  P.car = P.rides; P.vote = P.polls; P.place = P.pin; P.time = P.clock; P.custom = P.polls; P.decide = P.polls;
  const ic = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.dot}</svg>`;
  const MARK = '<img class="mark" src="/brand/mark.png" alt="" width="32" height="32">';

  // ================= split-flap (the signature move) =================
  // A status cell remembers what it showed and when that changed; for a moment after a change it
  // flips letter by letter. A redraw mid-flip resumes the animation where it was (negative delay)
  // instead of restarting or cutting it off.
  const flapMemory = {};
  const FLIP_MS = 900;
  // The first time a cell appears on this page load it flips in too (the board "arriving"),
  // so the signature move shows on the first screen anyone sees.
  function flap(key, text, tone = '') {
    const t = String(text).toUpperCase();
    const now = performance.now();
    const m = flapMemory[key];
    if (!m) flapMemory[key] = { t, at: now };
    else if (m.t !== t) flapMemory[key] = { t, at: now };
    const elapsed = now - flapMemory[key].at;
    const flip = elapsed < FLIP_MS;
    return `<span class="flap ${tone} ${flip ? 'flip' : ''}" role="img" aria-label="${esc(text)}"${flip ? ` style="--e:${Math.round(elapsed)}ms"` : ''}>${[...t].map((c, i) => `<i style="--i:${i}" aria-hidden="true">${c === ' ' ? '&nbsp;' : esc(c)}</i>`).join('')}</span>`;
  }
  // Once the last letter lands, the cell goes back to plain static tiles, so nothing
  // (a screen recorder, a capture, a tab coming back) can replay it from mid-flip.
  document.addEventListener('animationend', (e) => {
    if (e.animationName !== 'flapflip') return;
    const cell = e.target.parentElement;
    if (cell && e.target === cell.lastElementChild) { cell.classList.remove('flip'); cell.style.removeProperty('--e'); }
  });

  // ================= state =================
  const S = {
    route: 'home', squadId: null, key: null, token: null, preview: null, data: null,
    tab: 'home', sheet: null, drafts: {},
    ui: { editPlan: false, editBudget: false, editPaid: false, crewSeg: 'people', allFeed: false, showClosed: false, pollKind: 'custom', pollN: 3 },
    es: null, ws: null, noWs: false, busy: false,
  };
  const TABS = ['home', 'plan', 'polls', 'rides', 'money'];
  const v = (key, fb = '') => (key in S.drafts ? S.drafts[key] : fb);
  const clearDrafts = (prefix) => { for (const k of Object.keys(S.drafts)) if (k.startsWith(prefix)) delete S.drafts[k]; };

  // ================= derived data =================
  function derive(d) {
    const byId = Object.fromEntries(d.members.map((m) => [m.id, m]));
    const me = byId[d.me];
    const roleOf = (n) => { const r = d.roles.find((x) => x.name === n); return r && r.holderId ? byId[r.holderId] : null; };
    const rolesHeld = (id) => d.roles.filter((r) => r.holderId === id).map((r) => r.name);
    const counted = d.members.filter((m) => m.status !== 'out');
    const drivers = d.members.filter((m) => m.ride.mode === 'driving' && m.status !== 'out').sort((a, b) => a.joinedAt - b.joinedAt);
    const carCode = (m) => `SQ${10 + drivers.findIndex((x) => x.id === m.id)}`;
    const ridersOf = (id) => d.members.filter((m) => m.ride.mode === 'need' && m.ride.driverId === id);
    const freeSeats = (m) => m.ride.seats - ridersOf(m.id).length;
    const isWaiting = (m) => m.status !== 'out' && m.ride.mode !== 'driving' && m.ride.mode !== 'self' && !m.ride.driverId;
    const waiting = d.members.filter((m) => isWaiting(m) && m.ride.mode === 'need');
    const undecided = d.members.filter((m) => m.status !== 'out' && !m.ride.mode);
    const receiver = (q) => (q.kind === 'ask' ? q.driverId : q.riderId);
    const incoming = d.rideReqs.filter((q) => receiver(q) === d.me);
    const outgoing = d.rideReqs.filter((q) => receiver(q) !== d.me);
    const reqBetween = (riderId, driverId) => d.rideReqs.find((q) => q.riderId === riderId && q.driverId === driverId);
    const owes = (m) => (d.budget.mode === 'each' ? d.budget.amount : m.pledge);
    const conf = (m) => m.confirmedAmt || 0;
    const pending = (m) => (m.paid === 'sent' ? m.paidAmt - conf(m) : 0);
    const cur = (n) => (Number(n) < 0 ? '-' : '') + esc(d.currency) + Math.abs(Number(n || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const pollsByAge = d.polls.slice().sort((a, b) => a.at - b.at);
    const pollCode = (p) => `P${String(pollsByAge.indexOf(p) + 1).padStart(2, '0')}`;
    const openPolls = d.polls.filter((p) => !p.closed);
    const voted = (p) => p.options.some((o) => o.votes.includes(d.me));
    const unvoted = openPolls.filter((p) => !voted(p));
    const planner = roleOf('Planner'), treasurer = roleOf('Treasurer');
    const myTasks = d.tasks.filter((t) => !t.done && t.assigneeId === d.me);
    // a car's line on the departure board
    const carStatus = (m) => {
      const riders = ridersOf(m.id);
      if (m.arrived) return ['Arrived', 'good'];
      if (riders.some((r) => r.ride.riderState === 'outside')) return ['Outside', 'bad'];
      if (m.ride.driverState === 'onway') return ['On way', 'good'];
      if (freeSeats(m) <= 0) return ['Full', 'warn'];
      return [`${freeSeats(m)} free`, 'lav'];
    };
    return { byId, me, roleOf, rolesHeld, counted, drivers, carCode, ridersOf, freeSeats, isWaiting, waiting, undecided, receiver, incoming, outgoing, reqBetween, owes, conf, pending, cur, pollCode, openPolls, voted, unvoted, planner, treasurer, myTasks, carStatus };
  }

  const NUDGE_TEXT = { rsvp: 'say if you\'re coming', ride: 'sort out your ride', pay: 'hand over your money', task: 'check your to-do' };
  const reqTitle = (q, other) => q.kind === 'ask' ? `${esc(other?.name)} is asking you for a lift` : `${esc(other?.name)} wants to pick you up`;

  // Everything waiting on you, most urgent first: the heart of Home.
  function needsYou(d, x) {
    const me = x.me, out = [];
    for (const q of x.incoming) {
      const other = x.byId[q.kind === 'ask' ? q.riderId : q.driverId];
      out.push({ tone: 'bad', icon: 'car', title: reqTitle(q, other), sub: [q.kind === 'ask' && other?.ride.area ? esc(other.ride.area) : '', `${ago(q.at)} ago`].filter(Boolean).join(' · '),
        acts: `<button class="btn sm good" data-act="respond" data-id="${q.id}" data-v="true">${ic('check', 'sm')}Accept</button><button class="btn sm" data-act="respond" data-id="${q.id}" data-v="false">Decline</button>` });
    }
    if ((me.nudges || []).length) {
      const groups = {};
      for (const n of me.nudges) (groups[n.kind] ||= []).push(x.byId[n.from]?.name || 'Someone');
      for (const [kind, names] of Object.entries(groups)) out.push({ tone: 'warn', icon: 'bell', title: `${esc([...new Set(names)].join(', '))} nudged you to ${NUDGE_TEXT[kind]}`, sub: 'Only you can see this', acts: `<button class="btn sm quiet" data-act="clearNudges">Dismiss</button>` });
    }
    if (me.status !== 'out') {
      if (!me.ride.mode) out.push({ tone: 'warn', icon: 'car', title: 'How are you getting there?', sub: 'Drive, get picked up, or make your own way', go: 'rides' });
      else if (me.ride.mode === 'need' && !me.ride.driverId) {
        const asked = x.outgoing.some((q) => q.riderId === me.id);
        out.push({ tone: 'warn', icon: 'hand', title: asked ? 'Waiting for a driver to answer' : 'You still need a lift', sub: asked ? 'You asked for a seat' : `${plural(x.drivers.filter((m) => x.freeSeats(m) > 0).length, 'car')} with free seats`, go: 'rides' });
      } else if (me.ride.mode === 'need' && me.ride.driverId && !me.ride.pickup && me.ride.riderState !== 'picked') {
        out.push({ tone: '', icon: 'pin', title: `Share your pickup spot with ${esc(x.byId[me.ride.driverId]?.name)}`, sub: 'Only your driver sees it', go: 'rides' });
      }
      const others = x.waiting.filter((m) => m.id !== me.id);
      if (me.ride.mode === 'driving' && x.freeSeats(me) > 0 && others.length) out.push({ tone: '', icon: 'hand', title: `${plural(others.length, 'friend')} still ${others.length === 1 ? 'needs' : 'need'} a lift`, sub: `You have ${plural(x.freeSeats(me), 'free seat')}`, go: 'rides' });
      if (d.budget.amount) {
        const bal = x.owes(me) - x.conf(me);
        if (d.budget.mode === 'goal' && !me.pledge) out.push({ tone: 'warn', icon: 'money', title: 'Pledge what you\'ll bring', sub: `Group target ${x.cur(d.budget.amount)}`, go: 'money' });
        else if (me.paid !== 'sent' && bal > 0) out.push({ tone: 'warn', icon: 'money', title: `Bring ${x.cur(bal)}`, sub: x.conf(me) ? `${x.cur(x.conf(me))} confirmed so far` : 'Not paid yet', go: 'money' });
      }
    }
    if (x.treasurer && x.treasurer.id === me.id) {
      const n = d.members.filter((m) => m.paid === 'sent').length;
      if (n) out.push({ tone: 'good', icon: 'money', title: `${plural(n, 'payment')} to confirm`, sub: 'You\'re the Treasurer', go: 'money' });
    }
    if (x.unvoted.length) out.push({ tone: '', icon: 'polls', title: `${plural(x.unvoted.length, 'poll')} waiting for your vote`, sub: esc(x.unvoted[0].q), go: 'polls' });
    if (x.myTasks.length) out.push({ tone: '', icon: 'task', title: `${plural(x.myTasks.length, 'task')} on you`, sub: esc(x.myTasks[0].text), go: 'crew', seg: 'todo' });
    if (d.canPlan && (!d.plan.venue || !d.plan.date)) out.push({ tone: '', icon: 'crown', title: 'Set the venue and date', sub: 'You\'re the Planner', go: 'plan' });
    if (!x.planner) out.push({ tone: 'warn', icon: 'crown', title: 'Nobody is the Planner yet', sub: 'Someone has to claim it to edit the plan', go: 'crew', seg: 'roles' });
    return out;
  }

  // ================= talking to the server =================
  async function act(type, params = {}, okMsg) {
    if (S.busy) return false;
    S.busy = true;
    try {
      const d = await api('POST', `/api/squads/${S.squadId}/act`, { type, ...params }, S.token);
      if (d.left || d.deleted) { store.drop(S.squadId); stopLive(); location.href = '/'; return true; }
      S.data = d; render();
      if (okMsg) toast(okMsg);
      return true;
    } catch (e) {
      toast(e.message, true);
      if (e.status === 403 || e.status === 404) refresh();
      return false;
    } finally { S.busy = false; }
  }

  async function refresh() {
    try {
      const prev = S.data;
      const d = await api('GET', `/api/squads/${S.squadId}`, null, S.token);
      S.data = d;
      store.put(S.squadId, { name: d.name, key: d.key });
      if (prev) {
        const was = prev.members.find((m) => m.id === prev.me), now = d.members.find((m) => m.id === d.me);
        const oldIn = new Set(derive(prev).incoming.map((q) => q.id));
        const fresh = derive(d).incoming.filter((q) => !oldIn.has(q.id));
        if ((was && now && was.ride.riderState !== 'outside' && now.ride.riderState === 'outside') || fresh.length) {
          try { navigator.vibrate && navigator.vibrate([250, 100, 250]); } catch {}
          if (fresh.length) toast('New ride request on Home.');
        }
      }
      render();
    } catch (e) {
      if (e.status === 403 || e.status === 404) {
        store.drop(S.squadId); stopLive();
        S.token = null;
        if (S.key && e.status === 403) return openJoin();
        S.route = 'lost'; S.lostMsg = e.message; render();
      }
    }
  }

  // Live updates: WebSocket on Cloudflare, Server-Sent Events on the local Node server, 20s refresh as a net.
  const onVersion = (ver) => { if (!S.data || Number(ver) !== S.data.version) refresh(); };
  function startLive() {
    stopLive();
    if (S.noWs) return startSSE();
    let opened = false;
    try {
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/squads/${S.squadId}/ws?t=${encodeURIComponent(S.token)}`);
      S.ws = ws;
      ws.onopen = () => { opened = true; };
      ws.onmessage = (e) => { if (e.data !== 'pong') onVersion(e.data); };
      ws.onclose = () => {
        if (S.ws !== ws) return;
        S.ws = null;
        if (!opened) { S.noWs = true; return startSSE(); }
        setTimeout(() => { if (S.route === 'squad' && !S.ws) { startLive(); refresh(); } }, 2000);
      };
    } catch { S.noWs = true; startSSE(); }
  }
  function startSSE() { try { S.es = new EventSource(`/api/squads/${S.squadId}/events?t=${encodeURIComponent(S.token)}`); S.es.onmessage = (e) => onVersion(e.data); } catch {} }
  function stopLive() {
    if (S.es) { S.es.close(); S.es = null; }
    if (S.ws) { const ws = S.ws; S.ws = null; try { ws.close(); } catch {} }
  }
  setInterval(() => { if (S.ws && S.ws.readyState === 1) S.ws.send('ping'); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.route === 'squad') refresh(); });
  setInterval(() => { if (S.route === 'squad' && !document.hidden) refresh(); }, 20000);

  // ================= routing =================
  async function boot() {
    const m = location.pathname.match(/^\/s\/([\w-]+)/);
    if (!m) { S.route = 'home'; return render(); }
    S.squadId = m[1];
    const q = new URLSearchParams(location.search);
    S.key = q.get('k');
    const personal = q.get('t');
    if (personal) {
      store.put(S.squadId, { token: personal });
      history.replaceState(null, '', `/s/${S.squadId}${S.key ? '?k=' + encodeURIComponent(S.key) : ''}${location.hash}`);
    }
    const saved = store.all()[S.squadId];
    if (!S.key && saved && saved.key) S.key = saved.key;
    if (saved && saved.token) {
      S.token = saved.token;
      setTabFromHash();
      S.route = 'squad';
      await refresh();
      if (S.route === 'squad') startLive();
      return;
    }
    if (S.key) return openJoin();
    S.route = 'lost'; S.lostMsg = 'Ask a friend in the squad for the invite link.'; render();
  }
  function setTabFromHash() {
    let t = location.hash.slice(1);
    if (t === 'decide') t = 'polls';
    S.tab = TABS.includes(t) || t === 'crew' ? t : 'home';
  }
  function go(tab, seg) {
    S.tab = tab;
    if (seg) S.ui.crewSeg = seg;
    S.sheet = null;
    history.replaceState(null, '', '#' + tab);
    render();
    window.scrollTo({ top: 0 });
  }
  async function openJoin() {
    try { S.preview = await api('GET', `/api/squads/${S.squadId}?k=${encodeURIComponent(S.key)}`); S.route = 'join'; }
    catch (e) { S.route = 'lost'; S.lostMsg = e.message; }
    render();
  }

  // ================= rendering =================
  let lastSheet = null;
  function render() {
    const active = document.activeElement;
    const focusKey = active && active.dataset ? active.dataset.keep : null;
    let sel = null;
    try { if (focusKey && active.selectionStart != null) sel = [active.selectionStart, active.selectionEnd]; } catch {}
    if (S.route === 'home') app.innerHTML = viewLanding();
    else if (S.route === 'join') app.innerHTML = viewJoin();
    else if (S.route === 'lost') app.innerHTML = viewLost();
    else if (S.route === 'squad' && S.data) app.innerHTML = viewSquad();
    document.body.classList.toggle('sheet-open', !!S.sheet);
    const sheetKey = S.sheet ? JSON.stringify(S.sheet) : null;
    if (focusKey) {
      const el = app.querySelector(`[data-keep="${CSS.escape(focusKey)}"]`);
      if (el) { el.focus({ preventScroll: true }); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch {} }
    } else if (sheetKey && sheetKey !== lastSheet) {
      const h = app.querySelector('#sheet-title'); if (h) h.focus();
    }
    lastSheet = sheetKey;
    document.title = S.route === 'squad' && S.data ? `${S.data.name} · Squadup` : 'Squadup';
  }

  // ---------- landing / join / lost ----------
  function viewLanding() {
    const mine = Object.entries(store.all()).filter(([, x]) => x.token);
    return `
    <main class="wrap landing">
      <section>
        <img class="logo" src="/brand/logo.png" alt="Squadup" width="132" height="124">
        <h1 class="manifesto" style="margin-top:22px">Plans that don't die in the <em>group chat</em>.</h1>
        <p class="lead">One link for the plan, the polls, who's picking up who, and who's actually paid.</p>
      </section>
      <section class="board board-demo" aria-label="How a squad works">
        <div class="board-row"><div class="who"><b><span class="code">PLAN</span> The Planner locks it in</b><small>Everyone else just views it</small></div>${flap('demo-plan', 'Locked', 'lav')}</div>
        <div class="board-row"><div class="who"><b><span class="code">RIDES</span> Ask for a lift, or get offered one</b><small>They say yes or no</small></div>${flap('demo-rides', 'Asked', 'warn')}</div>
        <div class="board-row"><div class="who"><b><span class="code">MONEY</span> The Treasurer confirms payments</b><small>No "I already paid you" fights</small></div>${flap('demo-money', 'Paid', 'good')}</div>
      </section>
      <section class="pass">
        <div class="pass-band"><img src="/brand/mark.png" alt="" width="26" height="26"><span class="carrier">Start a squad</span></div>
        <form class="form pass-body" data-form="create">
          <label class="field">What's the hangout?
            <input type="text" name="name" data-keep="create.name" value="${esc(v('create.name'))}" placeholder="Saturday bowling" maxlength="60" required>
          </label>
          <div class="form-row">
            <label class="field">Your name
              <input type="text" name="you" data-keep="create.you" value="${esc(v('create.you'))}" placeholder="Sam" maxlength="30" required autocomplete="given-name">
            </label>
            <label class="field">Currency
              <select name="currency" data-keep="create.currency">
                ${['$', '₹', '€', '£', '৳', '₨', 'A$', 'C$', 'R', '₱', '¥', '₦'].map((c) => `<option ${v('create.currency', '$') === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </label>
          </div>
          <button class="btn primary block">Create squad</button>
          <p class="sub small">No accounts. You start as the Planner; friends join with your link.</p>
        </form>
        <div class="tear"></div>
        <div class="pass-stub"><span class="sub">Just looking? Open a squad with friends, cars, polls and a budget already in it.</span><button class="btn block" data-act="demo">Try the demo squad</button></div>
      </section>
      ${mine.length ? `<section class="sec"><div class="sec-head"><h2>Your squads</h2></div><div class="list">
        ${mine.map(([id, x]) => `<a class="item" href="/s/${esc(id)}" style="text-decoration:none;color:inherit">${av(x.name || '?', 'sm')}<div class="grow"><div class="name">${esc(x.name || 'Squad')}</div></div>${ic('chev')}</a>`).join('')}
      </div></section>` : ''}
    </main>`;
  }

  function viewJoin() {
    const p = S.preview;
    return `
    <main class="wrap landing">
      <section><img class="logo" src="/brand/logo.png" alt="Squadup" width="132" height="124">
        <h1 class="manifesto" style="margin-top:22px">You're on the list for <em>${esc(p.name)}</em></h1>
        <p class="lead">${p.members.length ? esc(p.members.slice(0, 6).join(', ')) + (p.members.length > 6 ? ` and ${p.members.length - 6} more` : '') + ' already joined.' : 'Be the first in.'}</p>
      </section>
      <section class="pass"><form class="form pass-body" data-form="join">
        <label class="field">Your name
          <input type="text" name="name" data-keep="join.name" value="${esc(v('join.name'))}" placeholder="What do your friends call you?" maxlength="30" required autofocus autocomplete="given-name">
        </label>
        <button class="btn primary block">Join the squad</button>
        <p class="sub small">No account and no password. This device remembers you.</p>
      </form></section>
    </main>`;
  }

  function viewLost() {
    return `<main class="wrap landing"><section><img class="logo" src="/brand/logo.png" alt="Squadup" width="132" height="124">
      <h1 class="manifesto" style="margin-top:22px">Can't open this squad</h1><p class="lead">${esc(S.lostMsg || '')}</p></section>
      <a class="btn primary" href="/">Start your own squad</a></main>`;
  }

  // ---------- squad shell ----------
  function viewSquad() {
    const d = S.data, x = derive(d);
    if (!x.me) return '<div class="boot">Loading…</div>';
    const needs = needsYou(d, x);
    const badges = { home: needs.length, polls: x.unvoted.length, rides: x.incoming.length, money: x.treasurer && x.treasurer.id === d.me ? d.members.filter((m) => m.paid === 'sent').length : 0 };
    const labels = { home: 'Home', plan: 'Plan', polls: 'Polls', rides: 'Rides', money: 'Money' };
    const subtitle = [d.plan.venue, fmtWhen(d.plan.date, d.plan.time)].filter(Boolean).join(' · ') || `${plural(d.members.length, 'person', 'people')} in the squad`;
    const isCrew = S.tab === 'crew';
    const body = { home: tabHome, plan: tabPlan, polls: tabPolls, rides: tabRides, money: tabMoney, crew: pageCrew }[S.tab](d, x, needs);
    return `
      <header class="appbar"><div class="wrap">
        ${isCrew ? `<button class="icon-btn" data-act="tab" data-tab="home" aria-label="Back to Home">${ic('back', 'lg')}</button>` : MARK}
        <div class="title"><h1>${esc(d.name)}</h1><p>${esc(subtitle)}</p></div>
        ${isCrew ? '' : `<button class="icon-btn" data-act="tab" data-tab="crew" aria-label="Crew, ${d.members.length} people">${ic('crew', 'lg')}<span class="count quiet">${d.members.length}</span></button>`}
        <button class="icon-btn" data-act="sheet" data-type="settings" aria-label="Squad settings and invite">${ic('more', 'lg')}</button>
      </div></header>
      <main class="wrap page">${body}</main>
      <nav class="tabbar" aria-label="Sections"><div class="wrap">
        ${TABS.map((id) => `<button class="tab" data-act="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>${ic(id)}${labels[id]}${badges[id] ? `<span class="count" aria-label="${badges[id]} waiting">${badges[id]}</span>` : ''}</button>`).join('')}
      </div></nav>
      ${S.sheet ? viewSheet(d, x) : ''}`;
  }

  const outsideBanner = (d, x) => (x.me.ride.mode === 'need' && x.me.ride.riderState === 'outside'
    ? `<button class="outside" data-act="tab" data-tab="rides">${ic('pin', 'lg')}${esc(x.byId[x.me.ride.driverId]?.name || 'Your driver')} is outside</button>` : '');

  const needRow = (n) => n.go
    ? `<button class="need ${n.tone}" data-act="tab" data-tab="${n.go}" ${n.seg ? `data-seg="${n.seg}"` : ''}><span class="glyph">${ic(n.icon)}</span><span class="t">${n.title}<small>${n.sub || ''}</small></span><span class="chev">${ic('chev')}</span></button>`
    : `<div class="need ${n.tone} has-acts"><span class="glyph">${ic(n.icon)}</span><span class="t">${n.title}<small>${n.sub || ''}</small></span><span class="acts">${n.acts || ''}</span></div>`;

  function boardRows(d, x, compact) {
    if (!x.drivers.length) return `<p class="empty">${ic('car')}<span>No cars yet.${x.me.ride.mode ? '' : ' Driving? Say so on Rides.'}</span></p>`;
    return `<div class="board" role="list">
      <div class="board-head" aria-hidden="true"><span>Car</span><span>Driver, riders</span><span>Status</span></div>
      ${x.drivers.map((m) => {
        const riders = x.ridersOf(m.id);
        const [st, tone] = x.carStatus(m);
        const mine = m.id === d.me || riders.some((r) => r.id === d.me);
        return `<div class="board-row ${mine ? 'mine' : ''}" role="listitem">
          <span class="code">${x.carCode(m)}</span>
          <div class="who"><b>${esc(m.name)}${m.id === d.me ? youTag(m, d.me) : mine ? ' · your car' : ''}</b><small>${riders.length ? esc(riders.map((r) => r.name).join(', ')) : 'No riders yet'}${!compact && m.ride.eta && m.ride.driverState === 'onway' ? ` · ETA ${fmtClock(m.ride.etaAt + m.ride.eta * 60000)}` : ''}</small></div>
          ${flap('car-' + m.id, st, tone)}
        </div>`;
      }).join('')}
    </div>`;
  }

  // ---------- HOME: your boarding pass ----------
  function tabHome(d, x, needs) {
    const me = x.me, p = d.plan, r = me.ride;
    const days = daysUntil(p.date);
    const going = d.members.filter((m) => m.status === 'going');
    const arrived = d.members.filter((m) => m.arrived);
    const showCheckin = me.status !== 'out' && days !== null && days <= 0 && days >= -1;
    const feed = d.activity.slice().reverse().slice(0, S.ui.allFeed ? 40 : 5);
    let depart = p.time ? fmtTime(p.time) : '--:--', car = '—', seat = '—';
    if (r.mode === 'driving') { car = x.carCode(me); seat = `${x.ridersOf(me.id).length}/${r.seats}`; }
    else if (r.mode === 'need' && r.driverId) {
      const dr = x.byId[r.driverId];
      car = dr ? dr.name : '—';
      const riders = dr ? x.ridersOf(dr.id) : [];
      seat = dr ? `${riders.findIndex((m) => m.id === me.id) + 1}/${dr.ride.seats}` : '—';
      if (dr && dr.ride.driverState === 'onway' && dr.ride.eta) depart = fmtClock(dr.ride.etaAt + dr.ride.eta * 60000);
    } else if (r.mode === 'self') car = 'Own way';
    else {
      // a pending request shows on the pass, so accepting visibly fills it in
      const offer = x.incoming.find((q) => q.kind === 'invite');
      const asked = x.outgoing.find((q) => q.kind === 'ask' && q.riderId === me.id);
      const q = offer || asked;
      if (q) { car = `${x.byId[q.driverId]?.name || '?'}?`; seat = offer ? 'Offer' : 'Asked'; }
      else if (r.mode === 'need') car = 'Needed';
    }
    const pending = /\?$/.test(car);
    const carIsText = !/^SQ\d+$/.test(car) && car !== '—';
    const seatIsText = /^[A-Za-z]/.test(seat);

    return `
    ${outsideBanner(d, x)}
    <section class="pass" aria-label="Your pass for ${esc(d.name)}">
      <div class="pass-band"><img src="/brand/mark.png" alt="" width="26" height="26"><span class="carrier">${esc(me.name)}</span><span class="when">${p.date ? countdown(days) : 'Date TBC'}</span></div>
      <div class="pass-body">
        <p class="pass-date">${p.date ? esc(fmtDate(p.date)) : 'Date TBC'}</p>
        <p class="pass-venue">${p.venue ? esc(p.venue) : 'Venue not set'}${p.address ? ` <span>· ${esc(p.address)}</span>` : ''}</p>
      </div>
      <dl class="pass-fields">
        <div><dt>Depart</dt><dd class="data">${esc(depart)}</dd></div>
        <div><dt>Car</dt><dd class="${carIsText ? 'txt' : 'data'} ${pending ? 'pending' : ''}">${esc(car)}</dd></div>
        <div><dt>Seat</dt><dd class="${seatIsText ? 'txt' : 'data'} ${pending ? 'pending' : ''}">${esc(seat)}</dd></div>
      </dl>
      <div class="tear"></div>
      <div class="pass-stub">
        <span class="q" id="rsvp-q">Coming?</span>
        <div class="seg" role="group" aria-labelledby="rsvp-q">${[['going', 'Going'], ['maybe', 'Maybe'], ['out', 'Can\'t']].map(([k, l]) => `<button data-act="status" data-v="${k}" aria-pressed="${me.status === k}">${l}</button>`).join('')}</div>
        <div class="pass-actions">
          ${p.date ? `<button class="btn sm" data-act="ics">${ic('download', 'sm')}Calendar</button>` : `<button class="btn sm" data-act="tab" data-tab="polls">${ic('polls', 'sm')}Vote on a date</button>`}
          ${p.address || p.venue ? `<a class="btn sm" href="${/^https?:\/\//.test(p.address) ? esc(p.address) : mapsUrl(p.address || p.venue)}" target="_blank" rel="noopener">${ic('pin', 'sm')}Maps</a>` : ''}
          <button class="btn sm quiet" data-act="tab" data-tab="plan">Plan details${ic('chev', 'sm')}</button>
        </div>
      </div>
    </section>

    <section class="sec" aria-labelledby="needs-h">
      <div class="sec-head"><h2 id="needs-h">Needs you</h2><span class="side">${needs.length ? plural(needs.length, 'thing') : 'all clear'}</span></div>
      ${needs.length ? `<div>${needs.map(needRow).join('')}</div>` : `<p class="empty">${ic('check')}<span>Nothing is waiting on you.</span></p>`}
    </section>

    ${showCheckin ? `
    <section class="sec">
      <div class="sec-head"><h2>At the venue</h2><span class="side">${arrived.length}/${going.length} here</span></div>
      ${me.arrived ? `<div class="note good">${ic('check')}<span>You checked in ${ago(me.arrived)} ago.</span></div><button class="btn sm quiet" data-act="arrived" data-v="false">Undo check-in</button>`
        : `<button class="btn primary block" data-act="arrived" data-v="true">${ic('flag')}I'm here</button>`}
      ${arrived.length ? `<div class="row wrap-row">${arrived.map((m) => `<span class="tag good">${esc(m.name)}</span>`).join('')}</div>` : ''}
    </section>` : ''}

    <section class="sec" aria-labelledby="dep-h">
      <div class="sec-head"><h2 id="dep-h">Departures</h2><button class="btn sm quiet" data-act="tab" data-tab="rides">Rides${ic('chev', 'sm')}</button></div>
      ${boardRows(d, x, true)}
      <p class="sub small">${going.length} going · ${d.members.filter((m) => m.status === 'maybe').length} maybe · ${d.members.filter((m) => !m.status).length} haven't answered${x.waiting.length ? ` · <span style="color:var(--bad)">${x.waiting.length} still need a lift</span>` : ''}</p>
    </section>

    <section class="sec" aria-labelledby="log-h">
      <div class="sec-head"><h2 id="log-h">Log</h2>${d.activity.length > 5 ? `<button class="btn sm quiet" data-act="allFeed">${S.ui.allFeed ? 'Less' : 'Everything'}</button>` : ''}</div>
      <ul class="log">${feed.map((a) => `<li><span class="when">${ago(a.at)}</span><span>${esc(a.text)}</span></li>`).join('')}</ul>
    </section>`;
  }

  // ---------- PLAN: the Planner edits, everyone else views ----------
  function tabPlan(d, x) {
    const p = d.plan, planner = x.planner;
    const authority = d.canPlan
      ? `<p class="authority owner">${ic('crown')}<span>You're the Planner. Only you can change the plan.</span></p>`
      : planner ? `<p class="authority">${ic('eye')}<span>View only. ${esc(planner.name)} is the Planner. Got an idea? Start a <a href="#polls" data-act="tab" data-tab="polls">poll</a>.</span></p>`
        : `<p class="authority">${ic('eye')}<span>Nobody is the Planner yet. <a href="#crew" data-act="tab" data-tab="crew" data-seg="roles">Claim the role</a> to edit the plan.</span></p>`;
    const details = S.ui.editPlan && d.canPlan ? `
      <form class="form" data-form="plan">
        <label class="field">Venue<input type="text" name="venue" data-keep="plan.venue" value="${esc(v('plan.venue', p.venue))}" placeholder="Strike Bowling" maxlength="120"></label>
        <label class="field">Address or map link<input type="text" name="address" data-keep="plan.address" value="${esc(v('plan.address', p.address))}" placeholder="120 Market St" maxlength="300"></label>
        <div class="form-row">
          <label class="field">Date<input type="date" name="date" data-keep="plan.date" value="${esc(v('plan.date', p.date))}"></label>
          <label class="field">Time<input type="time" name="time" data-keep="plan.time" value="${esc(v('plan.time', p.time))}"></label>
        </div>
        <label class="field">Notes <span class="hint">Meet point, what to bring, dress code</span><textarea name="notes" data-keep="plan.notes" maxlength="1000">${esc(v('plan.notes', p.notes))}</textarea></label>
        <div class="row"><button class="btn primary">Save plan</button><button type="button" class="btn quiet" data-act="cancelPlan">Cancel</button></div>
      </form>` : `
      <dl class="facts">
        <div><dt>What</dt><dd class="big">${p.venue ? esc(p.venue) : '<span class="muted">Not set</span>'}</dd></div>
        <div><dt>When</dt><dd class="data">${p.date || p.time ? esc(fmtWhen(p.date, p.time)) : '<span class="muted">Not set</span>'}</dd></div>
        <div><dt>Where</dt><dd>${p.address ? `${esc(p.address)}<br><a href="${/^https?:\/\//.test(p.address) ? esc(p.address) : mapsUrl(p.address)}" target="_blank" rel="noopener">Open in Maps</a>` : '<span class="muted">No address yet</span>'}</dd></div>
        <div><dt>Who</dt><dd>${d.members.filter((m) => m.status === 'going').length} going, ${d.members.filter((m) => m.status === 'maybe').length} maybe</dd></div>
        ${p.notes ? `<div><dt>Notes</dt><dd class="wrap-text">${esc(p.notes)}</dd></div>` : ''}
      </dl>
      ${p.updatedBy ? `<p class="sub small">Last changed by ${esc(p.updatedBy)}, ${ago(p.updatedAt)} ago</p>` : ''}
      ${d.canPlan ? `<div class="row wrap-row">
        <button class="btn" data-act="editPlan">${ic('edit', 'sm')}Edit plan</button>
        <button class="btn ${p.locked ? '' : 'primary'}" data-act="lock" data-v="${!p.locked}">${ic(p.locked ? 'unlock' : 'lock', 'sm')}${p.locked ? 'Reopen' : 'Lock it in'}</button>
      </div>` : ''}`;
    return `
    <div class="screen-head"><div><h2>The plan</h2><p>${p.locked ? 'Locked in. This is happening.' : 'Still being decided.'}</p></div>${flap('plan-state', p.locked ? 'Final' : 'Draft', p.locked ? 'good' : 'warn')}</div>
    ${authority}
    <section class="sec" aria-label="Details">${details}</section>
    <section class="sec" aria-labelledby="tt-h">
      <div class="sec-head"><h2 id="tt-h">Timetable</h2><span class="side">${d.schedule.length ? plural(d.schedule.length, 'stop') : ''}</span></div>
      ${d.schedule.length ? `<div class="timetable">${d.schedule.map((s) => `
        <div class="tt-row"><span class="tx">${esc(s.text)}</span><span class="tm">${esc(fmtTime(s.time))}</span>
          ${d.canPlan ? `<button class="icon-btn" data-act="rmSched" data-id="${s.id}" aria-label="Remove ${esc(s.text)}">${ic('x', 'sm')}</button>` : '<span></span>'}</div>`).join('')}</div>`
        : `<p class="empty">${ic('clock')}<span>${d.canPlan ? 'Add the stops: meet up, main event, food.' : 'No timetable yet.'}</span></p>`}
      ${d.canPlan ? `<form class="inline-form" data-form="sched">
        <input type="time" name="time" data-keep="sched.time" value="${esc(v('sched.time'))}" aria-label="Time" style="max-width:128px" required>
        <input type="text" name="text" data-keep="sched.text" value="${esc(v('sched.text'))}" placeholder="What happens" maxlength="100" aria-label="What happens" required>
        <button class="btn" aria-label="Add to timetable">${ic('plus')}</button>
      </form>` : ''}
    </section>
    <section class="sec" aria-labelledby="info-h">
      <div class="sec-head"><h2 id="info-h">Good to know</h2><span class="side">${x.roleOf('Info gatherer') ? `gatherer: ${esc(x.roleOf('Info gatherer').name)}` : ''}</span></div>
      <p class="sub">Prices, opening hours, ticket links. Anyone can pin them here.</p>
      <div class="list">${d.info.slice().reverse().map((i) => `
        <div class="item">${av(x.byId[i.by]?.name || '?', 'sm')}<div class="grow"><div class="wrap-text">${linkify(i.text)}</div><div class="meta">${esc(x.byId[i.by]?.name || 'Someone')} · ${ago(i.at)} ago</div></div>
        <button class="icon-btn" data-act="uninfo" data-id="${i.id}" aria-label="Unpin">${ic('x', 'sm')}</button></div>`).join('') || `<p class="empty">${ic('pin')}<span>Nothing pinned yet.</span></p>`}</div>
      <form class="form" data-form="info">
        <label class="field"><span class="sr-only">Info to pin</span><textarea name="text" data-keep="info.text" maxlength="600" placeholder="Lanes are $8 a game, shoes $3. Open till 11pm.">${esc(v('info.text'))}</textarea></label>
        <button class="btn">${ic('pin', 'sm')}Pin it</button>
      </form>
    </section>`;
  }

  // ---------- POLLS: anyone starts one, anyone votes ----------
  function optLabel(poll, o) { return poll.kind === 'time' ? fmtWhen(o.date, o.time) || o.text : o.text; }
  function pollCard(d, x, poll) {
    const voters = new Set(poll.options.flatMap((o) => o.votes));
    const top = poll.closed ? [...poll.options].sort((a, b) => b.votes.length - a.votes.length)[0] : null;
    const canManage = poll.by === d.me || d.canPlan;
    const kindName = { place: 'Where', time: 'When', custom: 'Poll' }[poll.kind];
    return `
    <article class="poll" aria-labelledby="poll-${poll.id}">
      <div class="poll-head">
        <span class="code" style="padding-top:2px">${x.pollCode(poll)}</span>
        <div class="grow"><h3 id="poll-${poll.id}">${esc(poll.q)}</h3>
          <p class="meta">${kindName} · ${esc(x.byId[poll.by]?.name || 'Someone')} · ${plural(voters.size, 'vote')} · ${poll.multi ? 'pick any' : 'pick one'}</p></div>
        ${poll.closed ? `<span class="tag ${poll.picked ? 'good' : ''}">${poll.picked ? 'In the plan' : 'Closed'}</span>` : ''}
      </div>
      <div class="opts">${poll.options.map((o) => {
        const mine = o.votes.includes(d.me);
        const win = poll.picked ? o.id === poll.picked : top && o === top && o.votes.length;
        const names = o.votes.map((id) => x.byId[id]?.name).filter(Boolean);
        return `<div class="opt-row">
          <button class="opt ${poll.multi ? 'multi' : ''} ${win ? 'winner' : ''}" data-act="vote" data-id="${poll.id}" data-opt="${o.id}" aria-pressed="${mine}" ${poll.closed ? 'disabled' : ''}
            aria-label="${esc(optLabel(poll, o))}, ${plural(o.votes.length, 'vote')}${mine ? ', your vote' : ''}">
            <span class="fill" style="width:${Math.round((o.votes.length / Math.max(1, voters.size)) * 100)}%"></span>
            <span class="mark">${mine ? ic('check', 'sm') : ''}</span>
            <span class="ot">${esc(optLabel(poll, o))}${names.length ? `<small>${esc(names.join(', '))}</small>` : ''}</span>
            <span class="oc">${o.votes.length}</span>
          </button>
          ${d.canPlan && poll.kind !== 'custom' && poll.picked !== o.id ? `<button class="btn sm" data-act="pick" data-id="${poll.id}" data-opt="${o.id}" aria-label="Make ${esc(optLabel(poll, o))} official">Use</button>` : ''}
        </div>`;
      }).join('')}</div>
      ${!poll.closed ? (poll.kind === 'time' ? `
        <form class="inline-form" data-form="pollOpt" data-id="${poll.id}">
          <input type="date" name="date" data-keep="po.${poll.id}.d" value="${esc(v(`po.${poll.id}.d`))}" aria-label="Date">
          <input type="time" name="time" data-keep="po.${poll.id}.t" value="${esc(v(`po.${poll.id}.t`))}" aria-label="Time" style="max-width:120px">
          <button class="btn" aria-label="Add this time">${ic('plus')}</button>
        </form>` : `
        <form class="inline-form" data-form="pollOpt" data-id="${poll.id}">
          <input type="text" name="text" data-keep="po.${poll.id}" value="${esc(v(`po.${poll.id}`))}" placeholder="${poll.kind === 'place' ? 'Suggest a place' : 'Add an option'}" maxlength="80" aria-label="New option">
          <button class="btn" aria-label="Add option">${ic('plus')}</button>
        </form>`) : ''}
      ${canManage ? `<div class="row end">
        <button class="btn sm quiet" data-act="closePoll" data-id="${poll.id}">${poll.closed ? 'Reopen' : 'Close poll'}</button>
        <button class="btn sm quiet" data-act="rmPoll" data-id="${poll.id}" aria-label="Delete poll ${x.pollCode(poll)}">${ic('trash', 'sm')}</button>
      </div>` : ''}
    </article>`;
  }
  function tabPolls(d, x) {
    const open = x.openPolls.slice().sort((a, b) => Number(x.voted(a)) - Number(x.voted(b)) || b.at - a.at);
    const closed = d.polls.filter((p) => p.closed).sort((a, b) => b.at - a.at);
    return `
    <div class="screen-head"><div><h2>Polls</h2><p>Anyone can start one. Tap an option to vote.</p></div>
      <button class="btn primary" data-act="sheet" data-type="poll">${ic('plus', 'sm')}New poll</button></div>
    ${d.canPlan ? `<p class="authority owner">${ic('crown')}<span>As Planner, tap <b>Use</b> on a place or time to put it in the plan.</span></p>` : ''}
    ${open.length ? open.map((p) => pollCard(d, x, p)).join('') : `<p class="empty">${ic('polls')}<span>No open polls. Can't agree on something? Start one.</span></p>`}
    ${closed.length ? `<button class="btn quiet" data-act="toggleClosed" aria-expanded="${S.ui.showClosed}">${S.ui.showClosed ? 'Hide' : 'Show'} ${plural(closed.length, 'closed poll')}</button>
      ${S.ui.showClosed ? closed.map((p) => pollCard(d, x, p)).join('') : ''}` : ''}`;
  }

  // ---------- RIDES: the departure board ----------
  function reqCard(d, x, q) {
    const other = x.byId[q.kind === 'ask' ? q.riderId : q.driverId];
    return `<div class="req">
      <div class="row">${av(other?.name || '?')}<div class="grow"><div class="name">${reqTitle(q, other)}</div>
        <div class="meta">${q.kind === 'ask' && other?.ride.area ? `${esc(other.ride.area)} · ` : ''}${ago(q.at)} ago</div></div></div>
      <div class="row"><button class="btn sm good grow" data-act="respond" data-id="${q.id}" data-v="true">${ic('check', 'sm')}Accept</button><button class="btn sm grow" data-act="respond" data-id="${q.id}" data-v="false">Decline</button></div>
    </div>`;
  }
  function pickupForm(d, x, driver) {
    const r = x.me.ride;
    return `
      <div class="sec-head"><h3>Exact pickup spot</h3><span class="side">private</span></div>
      ${r.pickup ? `<div class="note">${ic('pin')}<span>${esc(r.pickup.text || 'Your GPS location')}${r.pickup.lat != null ? ' (with GPS pin)' : ''}<br><a href="${mapsUrl(r.pickup)}" target="_blank" rel="noopener">Check on Maps</a> · <button class="btn sm quiet" data-act="clearPickup" style="min-height:30px;padding:0 4px">Remove</button></span></div>` : ''}
      <form class="form" data-form="pickup">
        <label class="field"><span class="sr-only">Pickup spot</span><input type="text" name="text" data-keep="pickup.text" value="${esc(v('pickup.text', r.pickup?.text || ''))}" placeholder="Blue gate, 12 Lake Road" maxlength="300"></label>
        <div class="row wrap-row"><button class="btn primary">Save spot</button><button type="button" class="btn" data-act="gps">${ic('gps', 'sm')}Use my location</button></div>
      </form>
      <p class="sub small">Only ${driver ? esc(driver.name) : 'the driver whose car you\'re in'} can see this. It's deleted once you're picked up, or after ${Math.round(d.pickupTtl / 3600000)} hours.</p>`;
  }
  function tabRides(d, x) {
    const me = x.me, r = me.ride;
    const choose = `
      <div class="seg" role="group" aria-label="How are you getting there?">
        <button data-act="rideMode" data-v="driving" aria-pressed="${r.mode === 'driving'}">${ic('car', 'sm')}Driving</button>
        <button data-act="rideMode" data-v="need" aria-pressed="${r.mode === 'need'}">${ic('hand', 'sm')}Need a lift</button>
        <button data-act="rideMode" data-v="self" aria-pressed="${r.mode === 'self'}">${ic('nav', 'sm')}Own way</button>
      </div>`;
    let panel = '';
    if (me.status === 'out') {
      panel = `<div class="note">${ic('info')}<span>You said you can't make it. Switch to Going on Home to sort a ride.</span></div>`;
    } else if (r.mode === 'driving') {
      const riders = x.ridersOf(me.id), free = x.freeSeats(me);
      const stateTxt = { waiting: ['Not ready', ''], ready: ['Ready', 'good'], outside: ['You\'re outside', 'lav'], picked: ['In the car', 'good'] };
      const others = d.members.filter((m) => m.id !== me.id && x.isWaiting(m));
      panel = `
        <div class="row"><span class="code">${x.carCode(me)}</span><div class="grow"><div class="strong">Seats for friends</div><div class="sub small">${riders.length} taken · ${free} free</div></div>
          <div class="stepper" role="group" aria-label="Seats"><button data-act="seats" data-v="${r.seats - 1}" aria-label="Fewer seats">${ic('minus', 'sm')}</button><output aria-live="polite">${r.seats}</output><button data-act="seats" data-v="${r.seats + 1}" aria-label="More seats">${ic('plus', 'sm')}</button></div></div>
        ${r.driverState === 'onway'
          ? `<div class="note good">${ic('car')}<span><b>You're on the way.</b>${r.eta ? ` Riders see you arriving around ${fmtClock(r.etaAt + r.eta * 60000)}.` : ''}</span></div>
             <button class="btn sm quiet" data-act="driverState" data-v="idle">Not left yet</button>`
          : `<form class="inline-form" data-form="leaving">
              <select name="eta" data-keep="leave.eta" aria-label="How long until you arrive?">${[['', 'Arrive in…'], ['5', '5 min'], ['10', '10 min'], ['15', '15 min'], ['20', '20 min'], ['30', '30 min'], ['45', '45 min']].map(([val, l]) => `<option value="${val}" ${v('leave.eta') === val ? 'selected' : ''}>${l}</option>`).join('')}</select>
              <button class="btn primary">${ic('car', 'sm')}Leaving now</button>
            </form>`}
        <div class="sec-head"><h3>In your car</h3><span class="seats" role="img" aria-label="${riders.length} of ${r.seats} seats taken">${Array.from({ length: r.seats }, (_, i) => `<span class="seat ${i < riders.length ? 'taken' : ''}"></span>`).join('')}</span></div>
        ${riders.map((m) => `
          <div class="rider">
            <div class="row">${av(m.name)}<div class="grow"><div class="name">${esc(m.name)}</div>${m.ride.area ? `<div class="meta">${esc(m.ride.area)}</div>` : ''}</div><span class="tag ${stateTxt[m.ride.riderState][1]}">${stateTxt[m.ride.riderState][0]}</span></div>
            ${m.ride.riderState === 'picked' ? '' : m.ride.pickup
              ? `<div class="note">${ic('pin')}<span>${esc(m.ride.pickup.text || 'Shared a GPS location')}<br><a href="${mapsUrl(m.ride.pickup)}" target="_blank" rel="noopener">Open in Maps</a> · shared ${ago(m.ride.pickup.at)} ago</span></div>`
              : `<div class="note">${ic('pin')}<span>No pickup spot shared yet.</span></div>`}
            ${m.ride.riderState === 'picked' ? '' : `<div class="row wrap-row">
              ${m.ride.riderState !== 'outside' ? `<button class="btn sm primary" data-act="outside" data-id="${m.id}">${ic('pin', 'sm')}I'm outside</button>` : ''}
              <button class="btn sm good" data-act="picked" data-id="${m.id}">${ic('check', 'sm')}Picked up</button>
              <button class="btn sm quiet" data-act="kick" data-id="${m.id}">Remove</button></div>`}
          </div>`).join('') || `<p class="empty">${ic('car')}<span>Nobody in your car yet. Offer a lift below.</span></p>`}
        <div class="sec-head"><h3>Need a lift</h3><span class="side">${others.length}</span></div>
        ${others.length ? `<div class="list">${others.map((m) => {
          const q = x.reqBetween(m.id, me.id);
          return `<div class="item">${av(m.name)}<div class="grow"><div class="name">${esc(m.name)}</div><div class="meta">${m.ride.mode === 'need' ? 'Needs a lift' : 'Hasn\'t picked yet'}${m.ride.area ? ` · ${esc(m.ride.area)}` : ''}</div></div>
            ${q ? (q.kind === 'invite' ? `<button class="btn sm quiet" data-act="cancelReq" data-id="${q.id}">Offered · cancel</button>` : `<span class="tag lav">Asked you</span>`)
              : `<button class="btn sm" data-act="invite" data-id="${m.id}" ${free <= 0 ? 'disabled' : ''}>${ic('send', 'sm')}Offer a lift</button>`}</div>`;
        }).join('')}</div>` : `<p class="sub">Everyone who needs a lift has one.</p>`}`;
    } else if (r.mode === 'need') {
      const dr = r.driverId ? x.byId[r.driverId] : null;
      if (dr) {
        const st = r.riderState;
        panel = st === 'picked' ? `<div class="note good">${ic('check')}<span><b>You're in ${esc(dr.name)}'s car.</b> Enjoy.</span></div>` : `
          <div class="row">${av(dr.name)}<div class="grow"><div class="name">${esc(dr.name)} is picking you up</div>
            <div class="meta">${dr.ride.driverState === 'onway' ? `On the way${dr.ride.eta ? `, around ${fmtClock(dr.ride.etaAt + dr.ride.eta * 60000)}` : ''}` : 'Hasn\'t left yet'}</div></div><span class="code">${x.carCode(dr)}</span></div>
          ${st !== 'outside' ? `<button class="btn block ${st === 'ready' ? '' : 'good'}" data-act="ready" data-v="${st !== 'ready'}">${st === 'ready' ? `${ic('check', 'sm')}You said you're ready. Undo` : 'I\'m ready, come get me'}</button>` : ''}
          ${pickupForm(d, x, dr)}
          <button class="btn sm quiet" data-act="leaveCar">Leave ${esc(dr.name)}'s car</button>`;
      } else {
        const cars = x.drivers.filter((m) => m.id !== me.id);
        panel = `
          <form class="form" data-form="area">
            <label class="field">Roughly where are you? <span class="hint">Everyone sees this, so keep it rough. Your exact spot stays private.</span>
              <span class="inline-form"><input type="text" name="area" data-keep="area" value="${esc(v('area', r.area))}" placeholder="Library area" maxlength="60"><button class="btn">Save</button></span></label>
          </form>
          <div class="sec-head"><h3>Cars</h3><span class="side">${cars.length}</span></div>
          ${cars.length ? `<div class="list">${cars.map((m) => {
            const free = x.freeSeats(m), q = x.reqBetween(me.id, m.id);
            return `<div class="item"><span class="code">${x.carCode(m)}</span><div class="grow"><div class="name">${esc(m.name)}</div><div class="meta">${plural(Math.max(0, free), 'seat')} free${m.ride.driverState === 'onway' ? ' · on the way' : ''}</div></div>
              ${q ? (q.kind === 'ask' ? `<button class="btn sm quiet" data-act="cancelReq" data-id="${q.id}">Asked · cancel</button>` : '<span class="tag lav">Offered you</span>')
                : `<button class="btn sm" data-act="ask" data-id="${m.id}" ${free > 0 ? '' : 'disabled'}>${free > 0 ? `${ic('send', 'sm')}Ask for a lift` : 'Full'}</button>`}</div>`;
          }).join('')}</div>` : `<div class="note">${ic('info')}<span>Nobody is driving yet. Drivers can see you need a lift and offer one.</span></div>`}
          ${pickupForm(d, x, null)}`;
      }
    } else if (r.mode === 'self') {
      panel = `<div class="note">${ic('nav')}<span>You're making your own way. Tap another option if that changes.</span></div>`;
    } else {
      panel = `<div class="note warn">${ic('info')}<span>Pick one so drivers know who needs a seat.</span></div>`;
    }
    return `
    ${outsideBanner(d, x)}
    <div class="screen-head"><div><h2>Rides</h2><p>Offer a lift or ask for one. The other person says yes or no.</p></div></div>
    ${x.incoming.length ? `<section class="sec" aria-labelledby="req-h"><div class="sec-head"><h2 id="req-h">Requests for you</h2><span class="count">${x.incoming.length}</span></div><div class="stack">${x.incoming.map((q) => reqCard(d, x, q)).join('')}</div></section>` : ''}
    <section class="sec" aria-labelledby="mode-h"><div class="sec-head"><h2 id="mode-h">Getting there</h2></div>${choose}${panel}</section>
    <section class="sec" aria-labelledby="board-h">
      <div class="sec-head"><h2 id="board-h">Departures</h2><span class="side">${plural(x.drivers.length, 'car')}</span></div>
      ${boardRows(d, x, false)}
      ${x.waiting.length ? `<div class="row wrap-row"><span class="sub small">Still need a lift:</span>${x.waiting.map((m) => `<span class="tag bad">${esc(m.name)}${m.ride.area ? ` · ${esc(m.ride.area)}` : ''}</span>`).join('')}</div>` : ''}
      ${x.undecided.length ? `<p class="sub small">Haven't picked yet: ${esc(x.undecided.map((m) => m.name).join(', '))}</p>` : ''}
    </section>`;
  }

  // ---------- MONEY: every amount waits for the Treasurer ----------
  function tabMoney(d, x) {
    const me = x.me, t = x.treasurer;
    const canSet = !t || t.id === me.id, isT = t && t.id === me.id;
    const b = d.budget, people = x.counted;
    const target = b.mode === 'each' ? b.amount * people.length : b.amount;
    const pledged = people.reduce((s, m) => s + x.owes(m), 0);
    const received = d.members.reduce((s, m) => s + x.conf(m), 0);
    const waitingAmt = d.members.reduce((s, m) => s + Math.max(0, x.pending(m)), 0);
    const spent = d.expenses.reduce((s, e) => s + e.amount, 0);
    const pct = (n) => (target > 0 ? Math.min(100, (n / target) * 100) : 0);
    const fair = b.mode === 'goal' && people.length ? Math.ceil((b.amount / people.length) * 100) / 100 : 0;
    const tName = t ? (isT ? 'you' : esc(t.name)) : 'the Treasurer';
    const status = (m) => m.paid === 'sent'
      ? `<span class="tag warn">${x.cur(m.paidAmt)} waiting${x.conf(m) ? ` · was ${x.cur(x.conf(m))}` : ''}</span>`
      : m.paid === 'confirmed' ? `<span class="tag good">${ic('check', 'sm')}${x.cur(x.conf(m))}</span>` : '<span class="tag bad">Not yet</span>';
    const mode = v('budget.mode', b.mode);
    const form = `
      <form class="form" data-form="budget">
        <div class="seg" role="group" aria-label="Budget type">
          <button type="button" data-act="budgetMode" data-v="each" aria-pressed="${mode === 'each'}">Same each</button>
          <button type="button" data-act="budgetMode" data-v="goal" aria-pressed="${mode === 'goal'}">Group target</button>
        </div>
        <div class="form-row">
          <label class="field">${mode === 'each' ? 'Each person brings' : 'Whole group needs'}<input type="number" name="amount" min="0" step="any" inputmode="decimal" data-keep="budget.amount" value="${esc(v('budget.amount', b.amount || ''))}" required></label>
          <label class="field">Currency<input type="text" name="currency" maxlength="4" data-keep="budget.currency" value="${esc(v('budget.currency', d.currency))}"></label>
        </div>
        <div class="row"><button class="btn primary">Save budget</button>${b.amount ? '<button type="button" class="btn quiet" data-act="cancelBudget">Cancel</button>' : ''}</div>
      </form>`;
    const owe = x.owes(me), bal = owe - x.conf(me);
    const payForm = `
      <form class="inline-form" data-form="paid">
        <label class="sr-only" for="paid-amt">Total you've handed over</label>
        <input id="paid-amt" type="number" name="amount" min="0" step="any" inputmode="decimal" data-keep="paid.amount" value="${esc(v('paid.amount', me.paidAmt || owe || ''))}" placeholder="Amount">
        <button class="btn primary">${me.paid === 'none' ? 'I\'ve paid' : 'Update'}</button>
      </form>
      <p class="sub small">Enter the total you've handed over. ${isT ? 'You confirm' : (t ? esc(t.name) + ' confirms' : 'The Treasurer confirms')} it, and every change after that.</p>`;

    return `
    <div class="screen-head"><div><h2>Money</h2><p>${isT ? 'You\'re the Treasurer. Confirm each payment under Who\'s paid.' : `Squadup only keeps score. Pay ${tName} however your group normally does.`}</p></div></div>
    <section class="sec" aria-labelledby="budget-h">
      <div class="sec-head"><h2 id="budget-h">Budget</h2>${t ? `<span class="side">treasurer: ${esc(t.name)}</span>` : `<button class="btn sm" data-act="tab" data-tab="crew" data-seg="roles">Pick a Treasurer</button>`}</div>
      ${!b.amount || S.ui.editBudget ? (canSet ? form : `<p class="empty">${esc(t.name)} hasn't set the budget yet.</p>`) : `
        <p class="pass-date" style="font-size:38px">${b.mode === 'each' ? `${x.cur(b.amount)} each` : `${x.cur(b.amount)} total`}</p>
        <p class="sub">${b.mode === 'each' ? `${people.length} people × ${x.cur(b.amount)} = ${x.cur(target)}` : `About ${x.cur(fair)} each across ${people.length} people. Pledged so far: ${x.cur(pledged)}.`}</p>
        <dl class="fare">
          <div><dt>Received <small>confirmed by ${tName}</small></dt><dd>${x.cur(received)}</dd></div>
          <div><dt>Waiting <small>to be confirmed</small></dt><dd style="color:var(--warn)">${x.cur(waitingAmt)}</dd></div>
          <div><dt>Spent <small>see below</small></dt><dd>${x.cur(spent)}</dd></div>
          <div class="total"><dt>Left in the kitty</dt><dd style="${received - spent < 0 ? 'color:var(--bad)' : ''}">${x.cur(received - spent)}</dd></div>
        </dl>
        <div class="meter" role="img" aria-label="${Math.round(pct(received))}% received, ${Math.round(pct(waitingAmt))}% waiting for the Treasurer"><i class="ok" style="width:${pct(received)}%"></i><i class="pend" style="width:${pct(waitingAmt)}%"></i></div>
        <div class="legend"><span><i style="background:var(--good)"></i>Confirmed ${Math.round(pct(received))}%</span><span><i style="background:var(--warn)"></i>Waiting for ${tName}</span></div>
        ${canSet ? `<button class="btn sm" data-act="editBudget">${ic('edit', 'sm')}Change budget</button>` : ''}`}
    </section>

    ${b.amount && me.status !== 'out' ? `
    <section class="sec" aria-labelledby="mine-h">
      <div class="sec-head"><h2 id="mine-h">Your part</h2><span class="side">${owe ? `owe ${x.cur(owe)}` : ''}</span></div>
      ${b.mode === 'goal' ? `<form class="inline-form" data-form="pledge">
          <input type="number" name="amount" min="0" step="any" inputmode="decimal" data-keep="pledge.amount" value="${esc(v('pledge.amount', me.pledge || ''))}" placeholder="Fair share ≈ ${esc(String(fair))}" aria-label="How much you'll bring">
          <button class="btn">${me.pledge ? 'Update pledge' : 'Pledge'}</button></form>` : ''}
      ${me.paid === 'sent' ? `
        <div class="note warn">${ic('clock')}<span>You said <b>${x.cur(me.paidAmt)}</b>. Waiting for ${tName} to confirm.${x.conf(me) ? ` Last confirmed: ${x.cur(x.conf(me))}.` : ''}</span></div>
        <button class="btn sm quiet" data-act="unpay">Take it back</button>`
      : me.paid === 'confirmed' && !S.ui.editPaid ? `
        <div class="note good">${ic('check')}<span>${tName} confirmed <b>${x.cur(x.conf(me))}</b>.${bal > 0 ? ` Still to bring: ${x.cur(bal)}.` : ''}</span></div>
        <button class="btn sm" data-act="editPaid">${ic('edit', 'sm')}Change amount</button>`
      : owe || me.paid !== 'none' ? payForm : ''}
    </section>` : ''}

    ${b.amount ? `
    <section class="sec" aria-labelledby="who-h">
      <div class="sec-head"><h2 id="who-h">Who's paid</h2><span class="side">${isT ? 'you confirm' : ''}</span></div>
      <div class="list">${people.map((m) => `
        <div class="item">${av(m.name, 'sm', m.id === me.id)}<div class="grow"><div class="name">${esc(m.name)}${youTag(m, me.id)}</div><div class="meta">${x.owes(m) ? `owes ${x.cur(x.owes(m))}` : 'No pledge yet'}</div></div>
          ${status(m)}
          ${isT && m.paid === 'sent' ? `<button class="btn sm good" data-act="confirm" data-id="${m.id}" data-v="true" aria-label="Confirm ${esc(m.name)}'s ${x.cur(m.paidAmt)}">${ic('check', 'sm')}</button><button class="btn sm quiet" data-act="confirm" data-id="${m.id}" data-v="false" aria-label="Reject ${esc(m.name)}'s update">${ic('x', 'sm')}</button>`
            : isT && m.paid === 'confirmed' ? `<button class="btn sm quiet" data-act="confirm" data-id="${m.id}" data-v="false">Undo</button>`
            : m.id !== me.id && m.paid === 'none' ? `<button class="icon-btn" data-act="nudge" data-id="${m.id}" data-kind="pay" aria-label="Nudge ${esc(m.name)} to pay">${ic('bell')}</button>` : ''}
        </div>`).join('')}</div>
    </section>` : ''}

    <section class="sec" aria-labelledby="spent-h">
      <div class="sec-head"><h2 id="spent-h">Where it went</h2><span class="side">${x.cur(spent)}</span></div>
      <div class="list">${d.expenses.slice().reverse().map((e) => `
        <div class="item"><div class="grow"><div class="name">${esc(e.what)}</div><div class="meta">${esc(x.byId[e.by]?.name || 'Someone')} · ${ago(e.at)} ago</div></div>
          <span class="data strong">${x.cur(e.amount)}</span>
          ${(e.by === me.id || isT) ? `<button class="icon-btn" data-act="rmExpense" data-id="${e.id}" aria-label="Remove ${esc(e.what)}">${ic('x', 'sm')}</button>` : ''}</div>`).join('') || `<p class="empty">${ic('money')}<span>Nothing spent yet. Log every payment so everyone can see.</span></p>`}</div>
      <form class="form" data-form="expense">
        <div class="form-row">
          <label class="field">What<input type="text" name="what" data-keep="exp.what" value="${esc(v('exp.what'))}" placeholder="Lanes" maxlength="100"></label>
          <label class="field">How much<input type="number" name="amount" min="0" step="any" inputmode="decimal" data-keep="exp.amount" value="${esc(v('exp.amount'))}"></label>
        </div>
        <button class="btn">${ic('plus', 'sm')}Log spending</button>
      </form>
    </section>`;
  }

  // ---------- CREW (people · roles · to-do) ----------
  function pageCrew(d, x) {
    const seg = S.ui.crewSeg;
    const segBtn = (k, l, n) => `<button data-act="crewSeg" data-v="${k}" aria-pressed="${seg === k}">${l}${n ? ` <span class="count">${n}</span>` : ''}</button>`;
    let body = '';
    if (seg === 'people') {
      const groups = [['going', 'Going', 'good'], ['maybe', 'Maybe', 'warn'], [null, 'No answer', 'bad'], ['out', 'Can\'t make it', '']];
      const rideTxt = (m) => m.ride.mode === 'driving' ? `Driving ${x.carCode(m)} · ${x.ridersOf(m.id).length}/${m.ride.seats}` : m.ride.mode === 'need' ? (m.ride.driverId ? `Riding with ${x.byId[m.ride.driverId]?.name || '?'}` : 'Needs a lift') : m.ride.mode === 'self' ? 'Own way' : '';
      body = `
        <div class="row wrap-row">${groups.map(([k, l, c]) => { const n = d.members.filter((m) => (m.status || null) === k).length; return n ? `<span class="tag ${c}">${n} ${l.toLowerCase()}</span>` : ''; }).join('')}</div>
        ${groups.map(([k, l]) => {
          const ms = d.members.filter((m) => (m.status || null) === k);
          if (!ms.length) return '';
          return `<section class="sec"><div class="sec-head"><h2>${l}</h2><span class="side">${ms.length}</span></div><div class="list">${ms.map((m) => `
            <button class="item" data-act="sheet" data-type="person" data-id="${m.id}">${av(m.name, '', m.id === d.me)}
              <span class="grow"><span class="name" style="display:block">${esc(m.name)}${youTag(m, d.me)}</span>
              <span class="meta" style="display:block">${esc([x.rolesHeld(m.id).join(' · '), rideTxt(m), m.arrived ? 'At the venue' : ''].filter(Boolean).join(' · ') || 'No ride or role yet')}</span></span>${ic('chev')}</button>`).join('')}</div></section>`;
        }).join('')}`;
    } else if (seg === 'roles') {
      body = `<section class="sec"><p class="sub">The <b>Planner</b> edits and locks the plan and is the only one who can delete the trip. The <b>Treasurer</b> confirms every payment.</p>
        <div class="list">${d.roles.map((r) => { const h = r.holderId ? x.byId[r.holderId] : null; return `
          <div class="item">${h ? av(h.name, '', h.id === d.me) : `<span class="av" style="background:var(--surface-2);color:var(--muted)">${ic(r.name === 'Planner' ? 'crown' : 'task', 'sm')}</span>`}
            <div class="grow"><div class="name">${esc(r.name)}${h ? ` · <span style="font-weight:400">${esc(h.name)}</span>` : ''}</div><div class="meta">${esc(r.desc || '')}</div></div>
            ${!h ? `<button class="btn sm primary" data-act="claim" data-id="${r.id}">I'll do it</button>` : h.id === d.me ? `<button class="btn sm" data-act="release" data-id="${r.id}">Step down</button>` : ''}
            ${r.custom && !h ? `<button class="icon-btn" data-act="rmRole" data-id="${r.id}" aria-label="Remove role ${esc(r.name)}">${ic('x', 'sm')}</button>` : ''}
          </div>`; }).join('')}</div>
        <form class="inline-form" data-form="role"><input type="text" name="name" data-keep="role.name" value="${esc(v('role.name'))}" placeholder="New role: Snacks, DJ…" maxlength="40" aria-label="New role"><button class="btn" aria-label="Add role">${ic('plus')}</button></form></section>`;
    } else {
      const opts = (sel) => `<option value="">Anyone</option>` + d.members.map((m) => `<option value="${m.id}" ${sel === m.id ? 'selected' : ''}>${esc(m.name)}${youTag(m, d.me)}</option>`).join('');
      const row = (t) => `<div class="item">
        <span class="check-wrap"><button class="check" data-act="toggleTask" data-id="${t.id}" aria-pressed="${t.done}" aria-label="${t.done ? 'Mark not done' : 'Mark done'}: ${esc(t.text)}">${t.done ? ic('check', 'sm') : ''}</button></span>
        <div class="grow"><div class="${t.done ? 'struck' : 'name'}">${esc(t.text)}</div></div>
        <select data-change="assign" data-id="${t.id}" style="width:auto;max-width:128px" aria-label="Who's doing ${esc(t.text)}">${opts(t.assigneeId)}</select>
        <button class="icon-btn" data-act="rmTask" data-id="${t.id}" aria-label="Delete ${esc(t.text)}">${ic('trash', 'sm')}</button></div>`;
      const open = d.tasks.filter((t) => !t.done), done = d.tasks.filter((t) => t.done);
      body = `<section class="sec">
        <form class="form" data-form="task">
          <label class="field">New task<input type="text" name="text" data-keep="task.text" value="${esc(v('task.text'))}" placeholder="Book 2 lanes" maxlength="160"></label>
          <div class="inline-form"><select name="assigneeId" data-keep="task.who" aria-label="Who's doing it">${opts(v('task.who', ''))}</select><button class="btn primary">${ic('plus', 'sm')}Add</button></div>
        </form>
        <div class="list">${open.map(row).join('') || `<p class="empty">${ic('check')}<span>Nothing to do. Nice.</span></p>`}</div>
        ${done.length ? `<div class="sec-head"><h3>Done</h3><span class="side">${done.length}</span></div><div class="list">${done.map(row).join('')}</div>` : ''}</section>`;
    }
    return `
    <div class="screen-head"><div><h2>Crew</h2><p>Tap someone to offer a lift, ask for one, or nudge them.</p></div>
      <button class="btn" data-act="invite-link">${ic('share', 'sm')}Invite</button></div>
    <div class="seg" role="group" aria-label="Crew sections">${segBtn('people', 'People')}${segBtn('roles', 'Roles')}${segBtn('todo', 'To-do', x.myTasks.length)}</div>
    ${body}`;
  }

  // ---------- sheets ----------
  function viewSheet(d, x) {
    const s = S.sheet;
    let title = '', body = '';
    if (s.type === 'settings') {
      const inviteUrl = `${location.origin}/s/${d.id}?k=${encodeURIComponent(d.key)}`;
      title = 'Squad';
      body = `
        <div class="block"><h3>Invite friends</h3>
          <p class="sub" style="margin-bottom:8px">Only people with this link can join.</p>
          <div class="inline-form"><input type="text" readonly value="${esc(inviteUrl)}" aria-label="Invite link"><button class="btn primary" data-act="invite-link">${ic('share', 'sm')}Share</button></div></div>
        ${d.plan.date ? `<div class="block"><h3>Calendar</h3><button class="btn" data-act="ics">${ic('download', 'sm')}Add to my calendar</button></div>` : ''}
        <div class="block"><h3>Another device</h3>
          <p class="sub" style="margin-bottom:8px">Your personal link logs you in as ${esc(x.me.name)} anywhere. Keep it to yourself.</p>
          <button class="btn" data-act="personal">${ic('copy', 'sm')}Copy my personal link</button></div>
        <div class="block"><h3>Your data</h3>
          <ul class="stack sub small">
            <li class="row">${ic('shield', 'sm')}<span>Pickup spots go only to your driver and are deleted after pickup or ${Math.round(d.pickupTtl / 3600000)} hours.</span></li>
            <li class="row">${ic('shield', 'sm')}<span>No emails, phone numbers or passwords, ever.</span></li>
            <li class="row">${ic('trash', 'sm')}<span>This squad deletes itself on <b class="data">${esc(new Date(d.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}</b>${d.demo ? ' (demos last 2 days after their last use)' : d.plan.date ? ' (a week after the hangout)' : ' (30 days after the last activity)'}.</span></li>
          </ul></div>
        <div class="block stack">
          <button class="btn danger" data-act="leave">${ic('leave', 'sm')}Leave this squad</button>
          ${d.canDelete ? `<button class="btn danger" data-act="deleteSquad">${ic('trash', 'sm')}Delete the trip for everyone</button>` : `<p class="sub small">Only the Planner can delete the trip.</p>`}
        </div>`;
    } else if (s.type === 'person') {
      const m = x.byId[s.id];
      if (!m) { S.sheet = null; return ''; }
      const me = x.me, isMe = m.id === me.id;
      const status = { going: ['Going', 'good'], maybe: ['Maybe', 'warn'], out: ['Can\'t make it', ''] }[m.status] || ['No answer yet', 'bad'];
      const ride = m.ride.mode === 'driving' ? `Driving ${x.carCode(m)}, ${x.freeSeats(m)} of ${m.ride.seats} seats free` : m.ride.mode === 'need' ? (m.ride.driverId ? `Riding with ${x.byId[m.ride.driverId]?.name}` : 'Needs a lift') : m.ride.mode === 'self' ? 'Making their own way' : 'Hasn\'t picked a ride';
      const acts = [];
      if (!isMe) {
        if (me.ride.mode === 'driving' && x.isWaiting(m)) {
          const q = x.reqBetween(m.id, me.id);
          acts.push(q ? (q.kind === 'invite' ? `<button class="btn" data-act="cancelReq" data-id="${q.id}">Cancel my offer</button>` : `<button class="btn good" data-act="respond" data-id="${q.id}" data-v="true">${ic('check', 'sm')}Accept their ask</button>`)
            : `<button class="btn primary" data-act="invite" data-id="${m.id}" ${x.freeSeats(me) <= 0 ? 'disabled' : ''}>${ic('send', 'sm')}Offer ${esc(m.name)} a lift</button>`);
        }
        if (m.ride.mode === 'driving' && m.status !== 'out' && me.ride.mode !== 'driving' && !me.ride.driverId && me.status !== 'out') {
          const q = x.reqBetween(me.id, m.id);
          acts.push(q ? (q.kind === 'ask' ? `<button class="btn" data-act="cancelReq" data-id="${q.id}">Cancel my ask</button>` : `<button class="btn good" data-act="respond" data-id="${q.id}" data-v="true">${ic('check', 'sm')}Accept their offer</button>`)
            : `<button class="btn primary" data-act="ask" data-id="${m.id}" ${x.freeSeats(m) <= 0 ? 'disabled' : ''}>${ic('send', 'sm')}Ask ${esc(m.name)} for a lift</button>`);
        }
        const nudge = (kind, label) => `<button class="btn" data-act="nudge" data-id="${m.id}" data-kind="${kind}">${ic('bell', 'sm')}${label}</button>`;
        if (!m.status) acts.push(nudge('rsvp', 'Nudge to answer'));
        if (m.status && m.status !== 'out' && !m.ride.mode) acts.push(nudge('ride', 'Nudge about a ride'));
        if (d.budget.amount && m.status !== 'out' && x.owes(m) && m.paid === 'none') acts.push(nudge('pay', 'Nudge to pay'));
        if (d.tasks.some((t) => !t.done && t.assigneeId === m.id)) acts.push(nudge('task', 'Nudge about to-do'));
      }
      title = m.name;
      body = `
        <div class="row" style="margin-bottom:12px">${av(m.name, '', isMe)}<div class="grow row wrap-row"><span class="tag ${status[1]}">${status[0]}</span>${m.arrived ? '<span class="tag good">At the venue</span>' : ''}</div></div>
        <dl class="facts">
          <div><dt>Ride</dt><dd>${esc(ride)}${m.ride.area ? ` · ${esc(m.ride.area)}` : ''}</dd></div>
          <div><dt>Roles</dt><dd>${esc(x.rolesHeld(m.id).join(', ') || 'None')}</dd></div>
          <div><dt>To-do</dt><dd>${plural(d.tasks.filter((t) => !t.done && t.assigneeId === m.id).length, 'open task')}</dd></div>
        </dl>
        ${isMe ? `<p class="sub" style="margin-top:12px">This is you.</p>` : acts.length ? `<div class="stack" style="margin-top:14px">${acts.join('')}</div><p class="sub small" style="margin-top:8px">Nudges are private. Only ${esc(m.name)} sees them.</p>` : ''}`;
    } else if (s.type === 'poll') {
      const k = S.ui.pollKind, n = S.ui.pollN;
      title = 'New poll';
      body = `
        <form class="form" data-form="newPoll">
          <div class="seg" role="group" aria-label="What's it about?">
            ${[['place', 'Where'], ['time', 'When'], ['custom', 'Anything']].map(([kk, l]) => `<button type="button" data-act="pollKind" data-v="${kk}" aria-pressed="${k === kk}">${ic(kk, 'sm')}${l}</button>`).join('')}
          </div>
          <label class="field">Question <input type="text" name="q" data-keep="np.q" value="${esc(v('np.q'))}" maxlength="100" placeholder="${{ place: 'Where should we go?', time: 'When works for everyone?', custom: 'Food after?' }[k]}" ${k === 'custom' ? 'required' : ''}></label>
          <fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="strong" style="margin-bottom:6px">Options</legend>
            ${Array.from({ length: n }, (_, i) => k === 'time'
              ? `<div class="form-row"><input type="date" name="d${i}" data-keep="np.d${i}" value="${esc(v('np.d' + i))}" aria-label="Option ${i + 1} date"><input type="time" name="t${i}" data-keep="np.t${i}" value="${esc(v('np.t' + i))}" aria-label="Option ${i + 1} time"></div>`
              : `<input type="text" name="o${i}" data-keep="np.o${i}" value="${esc(v('np.o' + i))}" maxlength="80" placeholder="${k === 'place' ? `Place ${i + 1}` : `Option ${i + 1}`}" aria-label="Option ${i + 1}">`).join('')}
            ${n < 8 ? `<button type="button" class="btn sm quiet" data-act="pollMore">${ic('plus', 'sm')}Another option</button>` : ''}
          </fieldset>
          ${k === 'custom' ? `<label class="check-line"><input type="checkbox" name="multi" ${v('np.multi') === 'on' ? 'checked' : ''} data-keep="np.multi">People can pick more than one</label>` : `<p class="sub small">${k === 'time' ? 'People can pick every time that works.' : 'Anyone can add places later.'} The Planner can make the winner official.</p>`}
          <button class="btn primary block">Start poll</button>
        </form>`;
    }
    return `
      <div class="scrim" data-act="closeSheet"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="grabber" aria-hidden="true"></div>
        <div class="sheet-head"><h2 id="sheet-title" tabindex="-1">${esc(title)}</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">${ic('x')}</button></div>
        ${body}
      </div>`;
  }

  // ---------- calendar file ----------
  function downloadIcs() {
    const d = S.data, p = d.plan;
    if (!p.date) return toast('No date set yet.', true);
    const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
    const start = p.date.replace(/-/g, '') + (p.time ? 'T' + p.time.replace(':', '') + '00' : '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Squadup//EN', 'BEGIN:VEVENT', `UID:${d.id}@squadup`, `DTSTAMP:${stamp}`,
      p.time ? `DTSTART:${start}` : `DTSTART;VALUE=DATE:${start}`, p.time ? 'DURATION:PT3H' : 'DURATION:P1D',
      `SUMMARY:${icsEsc(d.name)}`, `LOCATION:${icsEsc([p.venue, p.address].filter(Boolean).join(', '))}`,
      `DESCRIPTION:${icsEsc([p.notes, `${location.origin}/s/${d.id}`].filter(Boolean).join('\n\n'))}`, 'END:VEVENT', 'END:VCALENDAR'];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = (d.name.replace(/[^\w\- ]+/g, '').trim() || 'squadup') + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ================= events =================
  document.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.keep; if (k) S.drafts[k] = e.target.type === 'checkbox' ? (e.target.checked ? 'on' : '') : e.target.value; });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.keep) S.drafts[t.dataset.keep] = t.type === 'checkbox' ? (t.checked ? 'on' : '') : t.value;
    if (t.dataset && t.dataset.change === 'assign') act('task.assign', { id: t.dataset.id, assigneeId: t.value || null });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.sheet) { S.sheet = null; render(); } });

  const shareInvite = async () => {
    const url = `${location.origin}/s/${S.data.id}?k=${encodeURIComponent(S.data.key)}`;
    if (navigator.share) { try { await navigator.share({ title: S.data.name, text: `Join "${S.data.name}" on Squadup. Plan, polls, rides and money in one place:`, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    toast((await copyText(url)) ? 'Invite link copied. Paste it in the group chat.' : url);
  };

  const clicks = {
    demo: async () => {
      try {
        const r = await api('POST', '/api/demo', { you: (S.drafts['create.you'] || '').trim() || 'You', currency: '$' });
        store.put(r.id, { token: r.token, key: r.key, name: 'Demo: Saturday bowling' });
        location.href = `/s/${r.id}`;
      } catch (e) { toast(e.message, true); }
    },
    tab: (el) => go(el.dataset.tab, el.dataset.seg),
    sheet: (el) => { S.sheet = { type: el.dataset.type, id: el.dataset.id }; if (el.dataset.type === 'poll') S.ui.pollN = S.ui.pollKind === 'custom' ? 3 : 2; render(); },
    closeSheet: () => { S.sheet = null; render(); },
    'invite-link': shareInvite,
    personal: async () => toast((await copyText(`${location.origin}/s/${S.data.id}?t=${encodeURIComponent(S.token)}`)) ? 'Personal link copied. Open it on your other device.' : 'Couldn\'t copy. Try again.'),
    ics: () => downloadIcs(),
    leave: () => { if (confirm(`Leave ${S.data.name}? Your ride, roles and pledge will be cleared.`)) act('me.leave'); },
    deleteSquad: () => { if (confirm(`Delete "${S.data.name}" for everyone? The plan, polls, rides, money records and pickup spots are erased for good. This can't be undone.`)) act('squad.delete'); },
    status: (el) => act('me.status', { status: el.dataset.v }),
    arrived: (el) => act('me.arrived', { arrived: el.dataset.v === 'true' }, el.dataset.v === 'true' ? 'Checked in. Have fun.' : null),
    clearNudges: () => act('me.clearNudges'),
    nudge: (el) => act('nudge', { memberId: el.dataset.id, kind: el.dataset.kind }, 'Nudge sent. Only they can see it.'),
    allFeed: () => { S.ui.allFeed = !S.ui.allFeed; render(); },
    editPlan: () => { S.ui.editPlan = true; clearDrafts('plan.'); render(); },
    cancelPlan: () => { S.ui.editPlan = false; clearDrafts('plan.'); render(); },
    lock: (el) => act('plan.lock', { locked: el.dataset.v === 'true' }, el.dataset.v === 'true' ? 'Plan locked in' : 'Plan reopened'),
    rmSched: (el) => act('sched.remove', { id: el.dataset.id }),
    uninfo: (el) => act('info.remove', { id: el.dataset.id }),
    vote: (el) => act('poll.vote', { id: el.dataset.id, optionId: el.dataset.opt }),
    pick: (el) => act('poll.pick', { id: el.dataset.id, optionId: el.dataset.opt }, 'Added to the plan'),
    closePoll: (el) => act('poll.close', { id: el.dataset.id }),
    rmPoll: (el) => { if (confirm('Delete this poll and its votes?')) act('poll.remove', { id: el.dataset.id }); },
    toggleClosed: () => { S.ui.showClosed = !S.ui.showClosed; render(); },
    pollKind: (el) => { S.ui.pollKind = el.dataset.v; S.ui.pollN = el.dataset.v === 'custom' ? 3 : 2; clearDrafts('np.'); render(); },
    pollMore: () => { S.ui.pollN = Math.min(8, S.ui.pollN + 1); render(); },
    rideMode: (el) => act('ride.mode', { mode: el.dataset.v }),
    seats: (el) => act('ride.seats', { seats: Number(el.dataset.v) }),
    driverState: (el) => act('ride.driverState', { state: el.dataset.v }),
    invite: (el) => act('ride.invite', { riderId: el.dataset.id }, 'Offer sent. They get to say yes or no.'),
    ask: (el) => act('ride.ask', { driverId: el.dataset.id }, 'Asked. The driver gets to say yes or no.'),
    respond: (el) => act('ride.respond', { id: el.dataset.id, accept: el.dataset.v === 'true' }, el.dataset.v === 'true' ? 'Accepted. You\'re in the same car now.' : 'Declined'),
    cancelReq: (el) => act('ride.cancel', { id: el.dataset.id }, 'Request cancelled'),
    outside: (el) => act('ride.outside', { riderId: el.dataset.id }, 'They\'ve been told you\'re outside'),
    picked: (el) => act('ride.picked', { riderId: el.dataset.id }, 'Picked up. Their location is deleted.'),
    kick: (el) => { if (confirm('Remove them from your car?')) act('ride.kick', { riderId: el.dataset.id }); },
    leaveCar: () => { if (confirm('Leave this car? You\'ll need to find another lift.')) act('ride.leave'); },
    ready: (el) => act('ride.ready', { ready: el.dataset.v === 'true' }),
    clearPickup: () => { clearDrafts('pickup.'); act('ride.clearPickup', {}, 'Location removed'); },
    gps: () => {
      if (!navigator.geolocation) return toast('Your browser can\'t share location. Type it instead.', true);
      toast('Getting your location…');
      navigator.geolocation.getCurrentPosition(
        (pos) => act('ride.pickup', { text: v('pickup.text', S.data.members.find((m) => m.id === S.data.me)?.ride.pickup?.text || ''), lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) }, 'Location saved. Only your driver can see it.'),
        (err) => toast(err.code === 1 ? 'Location permission was blocked. Type your spot instead.' : 'Couldn\'t get your location. Type it instead.', true),
        { enableHighAccuracy: true, timeout: 12000 },
      );
    },
    crewSeg: (el) => { S.ui.crewSeg = el.dataset.v; render(); },
    claim: (el) => act('role.claim', { id: el.dataset.id }),
    release: (el) => act('role.release', { id: el.dataset.id }),
    rmRole: (el) => act('role.remove', { id: el.dataset.id }),
    toggleTask: (el) => act('task.toggle', { id: el.dataset.id }),
    rmTask: (el) => act('task.remove', { id: el.dataset.id }),
    budgetMode: (el) => { S.drafts['budget.mode'] = el.dataset.v; render(); },
    editBudget: () => { S.ui.editBudget = true; clearDrafts('budget.'); render(); },
    cancelBudget: () => { S.ui.editBudget = false; clearDrafts('budget.'); render(); },
    editPaid: () => { S.ui.editPaid = true; clearDrafts('paid.'); render(); },
    unpay: () => act('me.paid', { undo: true }, 'Taken back'),
    confirm: (el) => act('money.confirm', { memberId: el.dataset.id, confirmed: el.dataset.v === 'true' }),
    rmExpense: (el) => act('expense.remove', { id: el.dataset.id }),
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = clicks[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el); }
  });

  const forms = {
    async create(f) {
      try {
        const r = await api('POST', '/api/squads', { name: f.name, you: f.you, currency: f.currency });
        store.put(r.id, { token: r.token, key: r.key, name: f.name });
        clearDrafts('create.');
        location.href = `/s/${r.id}#plan`;
      } catch (e) { toast(e.message, true); }
    },
    async join(f) {
      try {
        const r = await api('POST', `/api/squads/${S.squadId}/join`, { k: S.key, name: f.name });
        store.put(S.squadId, { token: r.token, key: S.key, name: S.preview.name });
        S.token = r.token; S.route = 'squad'; S.tab = 'home';
        clearDrafts('join.');
        await refresh(); startLive();
        toast('You\'re in.');
      } catch (e) { toast(e.message, true); }
    },
    async plan(f) { if (await act('plan.update', f, 'Plan saved')) { S.ui.editPlan = false; clearDrafts('plan.'); render(); } },
    async sched(f) { if (await act('sched.add', f)) { clearDrafts('sched.'); render(); } },
    async info(f) { if (await act('info.add', f, 'Pinned')) { clearDrafts('info.'); render(); } },
    async newPoll(f) {
      const k = S.ui.pollKind, options = [];
      for (let i = 0; i < S.ui.pollN; i++) {
        if (k === 'time') { if (f['d' + i] || f['t' + i]) options.push({ date: f['d' + i], time: f['t' + i] }); }
        else if ((f['o' + i] || '').trim()) options.push(f['o' + i]);
      }
      if (await act('poll.add', { kind: k, q: f.q, options, multi: k === 'custom' ? f.multi === 'on' : undefined }, 'Poll started')) {
        clearDrafts('np.'); S.sheet = null; S.tab = 'polls'; history.replaceState(null, '', '#polls'); render();
      }
    },
    async pollOpt(f, form) { const id = form.dataset.id; if (await act('poll.option', { id, text: f.text, date: f.date, time: f.time })) { clearDrafts(`po.${id}`); render(); } },
    async leaving(f) { if (await act('ride.driverState', { state: 'onway', eta: f.eta }, 'Your riders can see you\'re on the way')) { clearDrafts('leave.'); render(); } },
    async area(f) { if (await act('ride.area', f, 'Saved')) { delete S.drafts.area; render(); } },
    async pickup(f) { if (await act('ride.pickup', { text: f.text }, 'Saved. Only your driver can see it.')) { clearDrafts('pickup.'); render(); } },
    async role(f) { if (await act('role.add', f)) { clearDrafts('role.'); render(); } },
    async task(f) { if (await act('task.add', { text: f.text, assigneeId: f.assigneeId || null })) { delete S.drafts['task.text']; render(); } },
    async budget(f) { if (await act('budget.set', { mode: v('budget.mode', S.data.budget.mode), amount: f.amount, currency: f.currency }, 'Budget saved')) { S.ui.editBudget = false; clearDrafts('budget.'); render(); } },
    async pledge(f) { if (await act('me.pledge', f, 'Pledge saved')) { clearDrafts('pledge.'); render(); } },
    async paid(f) { if (await act('me.paid', { amount: f.amount }, 'Sent to the Treasurer to confirm')) { S.ui.editPaid = false; clearDrafts('paid.'); render(); } },
    async expense(f) { if (await act('expense.add', f, 'Logged')) { clearDrafts('exp.'); render(); } },
  };
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = forms[form.dataset.form];
    if (fn) fn(Object.fromEntries(new FormData(form).entries()), form);
  });

  window.addEventListener('hashchange', () => {
    if (S.route !== 'squad') return;
    const before = S.tab; setTabFromHash();
    if (S.tab !== before) { S.sheet = null; render(); }
  });

  boot();
})();
