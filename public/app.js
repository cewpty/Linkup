/* Squadup — front end (vanilla JS, no build step) */
(() => {
  'use strict';

  // ---------- tiny utils ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');

  let memStore = {};
  const store = {
    all() { try { return JSON.parse(localStorage.getItem('linkup.squads') || '{}'); } catch { return memStore; } },
    put(id, v) { const all = store.all(); all[id] = { ...(all[id] || {}), ...v }; memStore = all; try { localStorage.setItem('linkup.squads', JSON.stringify(all)); } catch {} },
    drop(id) { const all = store.all(); delete all[id]; memStore = all; try { localStorage.setItem('linkup.squads', JSON.stringify(all)); } catch {} },
  };

  let toastTimer;
  function toast(msg, isErr = false) {
    toastEl.textContent = msg;
    toastEl.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = ''; }, isErr ? 4200 : 2200);
  }

  async function api(method, url, body, token) {
    let r;
    try {
      r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Member-Token': token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
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

  const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const av = (name, sm) => `<span class="av${sm ? ' sm' : ''}" style="background:hsl(${hue(name)} 62% 48%)" aria-hidden="true">${esc((name || '?').trim()[0]?.toUpperCase() || '?')}</span>`;

  function ago(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    return Math.round(s / 86400) + 'd ago';
  }
  function fmtWhen(date, time) {
    if (!date && !time) return '';
    let out = [];
    if (date) {
      const d = new Date(date + 'T12:00');
      out.push(isNaN(d) ? date : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }));
    }
    if (time) {
      const [h, m] = time.split(':').map(Number);
      const d = new Date(); d.setHours(h || 0, m || 0, 0, 0);
      out.push(d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
    }
    return out.join(' · ');
  }
  const mapsUrl = (p) => p && p.lat != null
    ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.text || p)}`;

  const icons = {
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    crew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14.5c2.3 0 4 1.5 4.6 4"/></svg>',
    rides: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V11l2.2-4.4A2 2 0 0 1 9 5.5h6a2 2 0 0 1 1.8 1.1L19 11v5"/><path d="M3 16h18v2.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V18H7v.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M5 11h14"/><circle cx="7.5" cy="14" r=".6" fill="currentColor"/><circle cx="16.5" cy="14" r=".6" fill="currentColor"/></svg>',
    jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="13" rx="3"/><path d="M2.5 10h19"/><circle cx="16.5" cy="14.5" r="1.3"/><path d="M6 6l9-3 1.5 3"/></svg>',
    // Squadup logo: three friends huddled together
    logo: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="var(--accent)"/><g fill="#fff" fill-opacity=".72"><circle cx="18" cy="25" r="6.5"/><path d="M6 48a12 12 0 0 1 24 0z"/><circle cx="46" cy="25" r="6.5"/><path d="M34 48a12 12 0 0 1 24 0z"/></g><g fill="#fff" stroke="var(--accent)" stroke-width="3"><circle cx="32" cy="23" r="8.5"/><path d="M16.5 51a15.5 15.5 0 0 1 31 0z"/></g></svg>',
  };

  // ---------- state ----------
  const S = {
    route: 'home', // home | join | squad | lost
    squadId: null, key: null, token: null,
    preview: null, data: null,
    tab: 'plan',
    drafts: {},
    ui: { editPlan: false, editBudget: false, showAllActivity: false },
    es: null,
    busy: false,
  };
  const v = (key, fallback = '') => (key in S.drafts ? S.drafts[key] : fallback);
  const clearDrafts = (prefix) => { for (const k of Object.keys(S.drafts)) if (k.startsWith(prefix)) delete S.drafts[k]; };

  // ---------- derived data ----------
  function derive(d) {
    const byId = Object.fromEntries(d.members.map((m) => [m.id, m]));
    const me = byId[d.me];
    const roleOf = (roleName) => { const r = d.roles.find((x) => x.name === roleName); return r && r.holderId ? byId[r.holderId] : null; };
    const rolesHeld = (id) => d.roles.filter((r) => r.holderId === id).map((r) => r.name);
    const counted = d.members.filter((m) => m.status !== 'out');
    const drivers = d.members.filter((m) => m.ride.mode === 'driving' && m.status !== 'out');
    const ridersOf = (id) => d.members.filter((m) => m.ride.mode === 'need' && m.ride.driverId === id);
    const stranded = d.members.filter((m) => m.ride.mode === 'need' && !m.ride.driverId && m.status !== 'out');
    const owes = (m) => (d.budget.mode === 'each' ? d.budget.amount : m.pledge);
    const cur = (n) => esc(d.currency) + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    return { byId, me, roleOf, rolesHeld, counted, drivers, ridersOf, stranded, owes, cur };
  }

  // ---------- actions ----------
  async function act(type, params = {}, okMsg) {
    if (S.busy) return;
    S.busy = true;
    try {
      const d = await api('POST', `/api/squads/${S.squadId}/act`, { type, ...params }, S.token);
      if (d.left || d.deleted) { store.drop(S.squadId); stopLive(); location.href = '/'; return; }
      S.data = d; render();
      if (okMsg) toast(okMsg);
      return true;
    } catch (e) {
      toast(e.message, true);
      if (e.status === 403) refresh();
      return false;
    } finally { S.busy = false; }
  }

  async function refresh() {
    try {
      const prev = S.data && S.data.members.find((m) => m.id === S.data.me);
      S.data = await api('GET', `/api/squads/${S.squadId}`, null, S.token);
      store.put(S.squadId, { name: S.data.name, key: S.data.key });
      const now = S.data.members.find((m) => m.id === S.data.me);
      if (prev && now && prev.ride.riderState !== 'outside' && now.ride.riderState === 'outside') {
        try { navigator.vibrate && navigator.vibrate([300, 120, 300, 120, 300]); } catch {}
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

  // Live updates: WebSocket on Cloudflare, Server-Sent Events on the local
  // Node server, and a 20s refresh as a safety net either way.
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
  function startSSE() {
    try {
      S.es = new EventSource(`/api/squads/${S.squadId}/events?t=${encodeURIComponent(S.token)}`);
      S.es.onmessage = (e) => onVersion(e.data);
    } catch { /* the 20s refresh still runs */ }
  }
  function stopLive() {
    if (S.es) { S.es.close(); S.es = null; }
    if (S.ws) { const ws = S.ws; S.ws = null; try { ws.close(); } catch {} }
  }
  setInterval(() => { if (S.ws && S.ws.readyState === 1) S.ws.send('ping'); }, 30000);
  // safety net: refresh when the tab becomes visible and every 20s
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.route === 'squad') refresh(); });
  setInterval(() => { if (S.route === 'squad' && !document.hidden) refresh(); }, 20000);

  // ---------- routing ----------
  async function boot() {
    const m = location.pathname.match(/^\/s\/([\w-]+)/);
    if (!m) { S.route = 'home'; return render(); }
    S.squadId = m[1];
    const q = new URLSearchParams(location.search);
    S.key = q.get('k');
    const personal = q.get('t');
    if (personal) store.put(S.squadId, { token: personal });
    if (personal) history.replaceState(null, '', `/s/${S.squadId}${S.key ? '?k=' + encodeURIComponent(S.key) : ''}${location.hash}`);
    const saved = store.all()[S.squadId];
    if (!S.key && saved && saved.key) S.key = saved.key;
    if (saved && saved.token) {
      S.token = saved.token;
      S.tab = (location.hash.slice(1) || 'plan');
      S.route = 'squad';
      await refresh();
      if (S.route === 'squad') startLive();
      return;
    }
    if (S.key) return openJoin();
    S.route = 'lost'; S.lostMsg = 'Ask a friend in the squad for the invite link.'; render();
  }

  async function openJoin() {
    try {
      S.preview = await api('GET', `/api/squads/${S.squadId}?k=${encodeURIComponent(S.key)}`);
      S.route = 'join';
    } catch (e) { S.route = 'lost'; S.lostMsg = e.message; }
    render();
  }

  // ---------- rendering ----------
  function render() {
    const active = document.activeElement;
    const focusKey = active && active.dataset ? active.dataset.keep : null;
    let sel = null;
    try { if (focusKey && active.selectionStart != null) sel = [active.selectionStart, active.selectionEnd]; } catch {}

    if (S.route === 'home') app.innerHTML = viewHome();
    else if (S.route === 'join') app.innerHTML = viewJoin();
    else if (S.route === 'lost') app.innerHTML = viewLost();
    else if (S.route === 'squad' && S.data) app.innerHTML = viewSquad();

    if (focusKey) {
      const el = app.querySelector(`[data-keep="${CSS.escape(focusKey)}"]`);
      if (el) { el.focus({ preventScroll: true }); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch {} }
    }
    document.title = S.route === 'squad' && S.data ? `${S.data.name} · Squadup` : 'Squadup';
  }

  function viewHome() {
    const mine = Object.entries(store.all()).filter(([, x]) => x.token);
    return `
    <main class="wrap" style="padding-bottom:40px">
      <section class="hero">
        <div class="logo">${icons.logo} Squadup</div>
        <h1>Hangouts without the <em>group-chat chaos</em>.</h1>
        <p>One link for the plan, who's coming, who's picking up who, who's doing what, and who's paid.</p>
      </section>
      <section class="card">
        <h2>Start a squad</h2>
        <form class="form" data-form="create">
          <label class="field">What's the hangout?
            <input type="text" name="name" data-keep="create.name" value="${esc(v('create.name'))}" placeholder="e.g. Saturday bowling" maxlength="60" required>
          </label>
          <div class="form-row">
            <label class="field">Your name
              <input type="text" name="you" data-keep="create.you" value="${esc(v('create.you'))}" placeholder="e.g. Sam" maxlength="30" required autocomplete="given-name">
            </label>
            <label class="field">Currency
              <select name="currency" data-keep="create.currency">
                ${['$', '₹', '€', '£', '৳', '₨', 'A$', 'C$', 'R', '₱', '¥', '₦'].map((c) => `<option ${v('create.currency', '$') === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </label>
          </div>
          <button class="btn primary block">Create squad &amp; get invite link</button>
        </form>
        <p class="sub small">No accounts. Friends join with your link and just type their name.</p>
      </section>
      <section class="card">
        <h2>Just looking?</h2>
        <p class="sub">Open a demo squad that already has five friends, a plan, cars and a budget. Try voting, grabbing a seat, or claiming the Treasurer role.</p>
        <button class="btn block" data-act="demo">🎳 Try a demo squad</button>
      </section>
      ${mine.length ? `<section class="card"><h2>Your squads</h2><div class="list">
        ${mine.map(([id, x]) => `<a class="item" href="/s/${esc(id)}" style="text-decoration:none;color:inherit">${av(x.name || '?')}<div class="grow"><div class="name">${esc(x.name || 'Squad')}</div></div><span class="muted">›</span></a>`).join('')}
      </div></section>` : ''}
      <section class="card features">
        <div><span>🗳️</span><p><b>Plan &amp; vote.</b> Suggest places and times, vote, lock the final plan.</p></div>
        <div><span>🚗</span><p><b>Pickups.</b> Drivers post seats. Riders share their spot, and only their driver sees it. It's deleted once they're picked up.</p></div>
        <div><span>✅</span><p><b>Jobs.</b> Planner, info gatherer, treasurer and a shared to-do list.</p></div>
        <div><span>💰</span><p><b>Money.</b> Everyone sees who owes what and who's paid. The treasurer confirms each payment, so nobody can argue about it later.</p></div>
      </section>
    </main>`;
  }

  function viewJoin() {
    const p = S.preview;
    return `
    <main class="wrap" style="padding-bottom:40px">
      <section class="hero"><div class="logo">${icons.logo} Squadup</div>
        <h1>You're invited to <em>${esc(p.name)}</em></h1>
        <p>${p.members.length ? esc(p.members.slice(0, 6).join(', ')) + (p.members.length > 6 ? ` +${p.members.length - 6} more` : '') + ' already joined.' : 'Be the first in.'}</p>
      </section>
      <section class="card">
        <form class="form" data-form="join">
          <label class="field">Your name
            <input type="text" name="name" data-keep="join.name" value="${esc(v('join.name'))}" placeholder="What do your friends call you?" maxlength="30" required autofocus autocomplete="given-name">
          </label>
          <button class="btn primary block">Join the squad</button>
        </form>
        <p class="sub small">No account, no password. This device remembers you.</p>
      </section>
    </main>`;
  }

  function viewLost() {
    return `<main class="wrap" style="padding-bottom:40px"><section class="hero"><div class="logo">${icons.logo} Squadup</div>
      <h1>Can't open this squad</h1><p>${esc(S.lostMsg || '')}</p></section>
      <a class="btn primary" href="/">Start your own squad</a></main>`;
  }

  function viewSquad() {
    const d = S.data, x = derive(d);
    const when = fmtWhen(d.plan.date, d.plan.time);
    const subtitle = [d.plan.venue, when].filter(Boolean).join(' · ') || `${d.members.length} in the squad`;
    const myOpenTasks = d.tasks.filter((t) => !t.done && t.assigneeId === d.me).length;
    const tabs = [
      ['plan', 'Plan', 0],
      ['crew', 'Crew', d.members.filter((m) => !m.status).length],
      ['rides', 'Rides', x.stranded.length],
      ['jobs', 'Jobs', myOpenTasks],
      ['money', 'Money', 0],
    ];
    if (!tabs.some((t) => t[0] === S.tab)) S.tab = 'plan';
    let body = { plan: tabPlan, crew: tabCrew, rides: tabRides, jobs: tabJobs, money: tabMoney }[S.tab](d, x);
    if (S.tab !== 'rides' && x.me.ride.mode === 'need' && x.me.ride.riderState === 'outside') {
      body = `<button class="alert-outside" data-act="tab" data-tab="rides" style="border:0;width:100%;cursor:pointer">${esc(x.byId[x.me.ride.driverId]?.name || 'Your driver')} is outside! Go go go 🏃</button>` + body;
    }
    return `
      <header class="top"><div class="wrap">
        <a class="icon-btn" href="/" aria-label="All squads">‹</a>
        <div class="title"><h1>${esc(d.name)}</h1><p>${esc(subtitle)}</p></div>
        <button class="btn sm primary" data-act="invite">Invite</button>
      </div></header>
      <main class="wrap">${body}</main>
      <nav class="tabs" aria-label="Sections"><div class="wrap">
        ${tabs.map(([id, label, n]) => `<button class="tab" data-act="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>${icons[id]}${label}${n ? `<span class="dot">${n}</span>` : ''}</button>`).join('')}
      </div></nav>`;
  }

  // ----- Plan tab -----
  function tabPlan(d, x) {
    const me = x.me;
    const planner = x.roleOf('Planner');
    const canEditPlan = !d.plan.locked || !planner || planner.id === me.id;
    const canPick = (!planner || planner.id === me.id) && !d.plan.locked;
    const hasPlan = d.plan.venue || d.plan.date || d.plan.time || d.plan.address || d.plan.notes;

    // my summary
    let rideLine;
    const r = me.ride;
    if (me.status === 'out') rideLine = ['🙅', 'You\'re out this time', ''];
    else if (r.mode === 'driving') rideLine = ['🚗', `You're driving · ${x.ridersOf(me.id).length}/${r.seats} seats taken`, ''];
    else if (r.mode === 'need' && r.driverId) {
      const dr = x.byId[r.driverId];
      const st = { waiting: 'tap "I\'m ready" when you are', ready: 'you said you\'re ready', outside: `${dr?.name} is OUTSIDE`, picked: 'you\'re in the car' }[r.riderState];
      rideLine = ['🙋', `Riding with ${esc(dr?.name || '?')} · ${st}`, r.riderState === 'outside' ? 'accent' : ''];
    } else if (r.mode === 'need') rideLine = ['⚠️', 'You need a pickup and nobody\'s driving you yet', 'red'];
    else if (r.mode === 'self') rideLine = ['🚶', 'Getting there on your own', ''];
    else rideLine = ['❓', 'How are you getting there?', 'amber'];

    const owe = x.owes(me);
    const moneyLine = d.budget.amount
      ? (me.paid === 'confirmed' ? ['💚', `${x.cur(owe)}: received by the treasurer`, 'green']
        : me.paid === 'sent' ? ['⏳', `${x.cur(owe)}: you've paid, waiting for the treasurer to confirm`, 'amber']
          : ['💰', owe ? `Bring ${x.cur(owe)}: not paid yet` : 'Pledge how much you\'ll bring', 'amber'])
      : ['💰', 'No budget set yet', ''];
    const myTasks = d.tasks.filter((t) => t.assigneeId === me.id && !t.done);
    const myRoles = x.rolesHeld(me.id);

    const venueIdeas = d.ideas.filter((i) => i.kind === 'venue').sort((a, b) => b.votes.length - a.votes.length);
    const timeIdeas = d.ideas.filter((i) => i.kind === 'time').sort((a, b) => b.votes.length - a.votes.length);
    const ideaRow = (i) => {
      const voted = i.votes.includes(me.id);
      const label = i.kind === 'venue' ? esc(i.text) : esc(fmtWhen(i.date, i.time));
      const voters = i.votes.map((id) => x.byId[id]?.name).filter(Boolean);
      return `<div class="item">
        <button class="btn sm vote" data-act="vote" data-id="${i.id}" aria-pressed="${voted}" aria-label="Vote">▲ ${i.votes.length}</button>
        <div class="grow"><div class="name">${label}</div><div class="meta">${voters.length ? esc(voters.join(', ')) : 'No votes'}</div></div>
        ${canPick ? `<button class="btn sm" data-act="pick" data-id="${i.id}">Make official</button>` : ''}
        ${(i.by === me.id || (planner && planner.id === me.id)) ? `<button class="icon-btn" data-act="unidea" data-id="${i.id}" aria-label="Remove">×</button>` : ''}
      </div>`;
    };

    const activity = d.activity.slice().reverse().slice(0, S.ui.showAllActivity ? 40 : 6);

    return `
    <section class="card">
      <div class="card-head"><h2>Hey ${esc(me.name)} 👋</h2>${myRoles.length ? `<span class="pill accent">${esc(myRoles.join(' · '))}</span>` : ''}</div>
      <div class="seg status" role="group" aria-label="Are you coming?">
        ${[['going', 'Going'], ['maybe', 'Maybe'], ['out', 'Can\'t']].map(([k, l]) => `<button data-act="status" data-v="${k}" aria-pressed="${me.status === k}">${l}</button>`).join('')}
      </div>
      <div class="stack">
        <button class="mine-line" data-act="tab" data-tab="rides"><span class="ico">${rideLine[0]}</span><span class="grow">${rideLine[1]}</span><span class="chev">›</span></button>
        <button class="mine-line" data-act="tab" data-tab="money"><span class="ico">${moneyLine[0]}</span><span class="grow">${moneyLine[1]}</span><span class="chev">›</span></button>
        ${myTasks.length ? `<button class="mine-line" data-act="tab" data-tab="jobs"><span class="ico">📝</span><span class="grow">${myTasks.length} task${myTasks.length > 1 ? 's' : ''} on you: ${esc(myTasks[0].text)}${myTasks.length > 1 ? '…' : ''}</span><span class="chev">›</span></button>` : ''}
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>The plan</h2>
        ${d.plan.locked ? '<span class="pill green">🔒 Final</span>' : '<span class="pill amber">Still deciding</span>'}
      </div>
      ${S.ui.editPlan ? `
        <form class="form" data-form="plan">
          <label class="field">Venue<input type="text" name="venue" data-keep="plan.venue" value="${esc(v('plan.venue', d.plan.venue))}" placeholder="e.g. Strike Bowling" maxlength="120"></label>
          <label class="field">Address or map link<input type="text" name="address" data-keep="plan.address" value="${esc(v('plan.address', d.plan.address))}" placeholder="Where exactly?" maxlength="300"></label>
          <div class="form-row">
            <label class="field">Date<input type="date" name="date" data-keep="plan.date" value="${esc(v('plan.date', d.plan.date))}"></label>
            <label class="field">Time<input type="time" name="time" data-keep="plan.time" value="${esc(v('plan.time', d.plan.time))}"></label>
          </div>
          <label class="field">Notes (meet point, what to bring, dress code)<textarea name="notes" data-keep="plan.notes" maxlength="1000" placeholder="e.g. Meet at the main entrance. Bring socks.">${esc(v('plan.notes', d.plan.notes))}</textarea></label>
          <div class="row"><button class="btn primary">Save plan</button><button type="button" class="btn ghost" data-act="cancelPlan">Cancel</button></div>
        </form>` : `
        ${hasPlan ? `
          <div class="plan-venue">${esc(d.plan.venue || 'Venue TBD')}</div>
          <dl class="plan-grid">
            <dt>When</dt><dd>${esc(fmtWhen(d.plan.date, d.plan.time) || 'TBD')}</dd>
            ${d.plan.address ? `<dt>Where</dt><dd>${esc(d.plan.address)} · <a href="${/^https?:\/\//.test(d.plan.address) ? esc(d.plan.address) : mapsUrl(d.plan.address)}" target="_blank" rel="noopener">Open in Maps</a></dd>` : ''}
            <dt>Who</dt><dd>${d.members.filter((m) => m.status === 'going').length} going${d.members.filter((m) => m.status === 'maybe').length ? `, ${d.members.filter((m) => m.status === 'maybe').length} maybe` : ''}</dd>
          </dl>
          ${d.plan.notes ? `<div class="note notes">${esc(d.plan.notes)}</div>` : ''}
          ${d.plan.updatedBy ? `<p class="sub small">Last edited by ${esc(d.plan.updatedBy)} ${ago(d.plan.updatedAt)}</p>` : ''}
        ` : `<p class="empty">Nothing decided yet. Fill it in, or suggest ideas below and vote.</p>`}
        <div class="row wrap-row">
          ${canEditPlan ? `<button class="btn" data-act="editPlan">✏️ Edit plan</button>` : ''}
          ${(!planner || planner.id === me.id) ? `<button class="btn ${d.plan.locked ? '' : 'green'}" data-act="lock" data-v="${!d.plan.locked}">${d.plan.locked ? '🔓 Unlock' : '🔒 Lock it in'}</button>` : `<span class="sub small">${esc(planner.name)} is the Planner${d.plan.locked ? ' and has locked the plan' : ''}.</span>`}
        </div>`}
    </section>

    <section class="card">
      <div class="card-head"><h2>Can't decide? Vote.</h2></div>
      <h3>Places</h3>
      <div class="list">${venueIdeas.map(ideaRow).join('') || '<p class="empty">No place ideas yet.</p>'}</div>
      <form class="inline-form" data-form="ideaVenue">
        <input type="text" name="text" data-keep="idea.venue" value="${esc(v('idea.venue'))}" placeholder="Suggest a place" maxlength="120">
        <button class="btn">Add</button>
      </form>
      <h3>Times</h3>
      <div class="list">${timeIdeas.map(ideaRow).join('') || '<p class="empty">No time ideas yet.</p>'}</div>
      <form class="inline-form" data-form="ideaTime">
        <input type="date" name="date" data-keep="idea.date" value="${esc(v('idea.date'))}" aria-label="Date">
        <input type="time" name="time" data-keep="idea.time" value="${esc(v('idea.time'))}" aria-label="Time">
        <button class="btn">Add</button>
      </form>
    </section>

    <section class="card">
      <div class="card-head"><h2>Info board</h2>${x.roleOf('Info gatherer') ? `<span class="sub small">Gatherer: ${esc(x.roleOf('Info gatherer').name)}</span>` : ''}</div>
      <p class="sub">Prices, opening hours, ticket links, menus. Pin them here so nobody has to scroll through the chat.</p>
      <div class="list">${d.info.slice().reverse().map((i) => `
        <div class="item">${av(x.byId[i.by]?.name || '?', true)}<div class="grow"><div class="notes">${linkify(i.text)}</div><div class="meta">${esc(x.byId[i.by]?.name || 'Someone')} · ${ago(i.at)}</div></div>
        <button class="icon-btn" data-act="uninfo" data-id="${i.id}" aria-label="Unpin">×</button></div>`).join('') || '<p class="empty">Nothing pinned yet.</p>'}</div>
      <form class="form" data-form="info">
        <textarea name="text" data-keep="info.text" maxlength="600" placeholder="e.g. Lanes are $8/game, shoes $3. Open till 11pm.">${esc(v('info.text'))}</textarea>
        <button class="btn">📌 Pin it</button>
      </form>
    </section>

    <section class="card">
      <h2>What changed</h2>
      <div class="feed">${activity.map((a) => `<div class="row"><span class="grow">${esc(a.text)}</span><span class="t">${ago(a.at)}</span></div>`).join('')}</div>
      ${d.activity.length > 6 ? `<button class="btn ghost sm" data-act="moreActivity">${S.ui.showAllActivity ? 'Show less' : 'Show everything'}</button>` : ''}
    </section>`;
  }

  function linkify(t) {
    return esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  }

  // ----- Crew tab -----
  function tabCrew(d, x) {
    const groups = [
      ['going', 'Going', 'green'],
      ['maybe', 'Maybe', 'amber'],
      [null, 'Hasn\'t answered', ''],
      ['out', 'Can\'t make it', ''],
    ];
    const rideTxt = (m) => {
      if (m.ride.mode === 'driving') return `🚗 Driving · ${x.ridersOf(m.id).length}/${m.ride.seats}`;
      if (m.ride.mode === 'need') return m.ride.driverId ? `🙋 With ${esc(x.byId[m.ride.driverId]?.name || '?')}` : '⚠️ Needs a pickup';
      if (m.ride.mode === 'self') return '🚶 Own way';
      return '';
    };
    const inviteUrl = `${location.origin}/s/${d.id}?k=${encodeURIComponent(d.key)}`;
    return `
    <section class="card">
      <div class="card-head"><h2>The crew</h2><span class="sub">${d.members.length} people</span></div>
      <div class="row wrap-row">
        ${groups.map(([k, l, c]) => { const n = d.members.filter((m) => (m.status || null) === k).length; return n ? `<span class="pill ${c}">${n} ${l.toLowerCase()}</span>` : ''; }).join('')}
      </div>
      ${groups.map(([k, l]) => {
        const ms = d.members.filter((m) => (m.status || null) === k);
        if (!ms.length) return '';
        return `<h3>${l}</h3><div class="list">${ms.map((m) => `
          <div class="item">${av(m.name)}
            <div class="grow"><div class="name">${esc(m.name)}${m.id === d.me ? ' <span class="pill">you</span>' : ''}</div>
              <div class="meta">${[x.rolesHeld(m.id).join(' · '), rideTxt(m)].filter(Boolean).join(' · ') || 'No ride or role yet'}</div></div>
          </div>`).join('')}</div>`;
      }).join('')}
    </section>
    <section class="card">
      <h2>Invite friends</h2>
      <p class="sub">Only people with this link can join. Send it to the group chat once.</p>
      <div class="inline-form"><input type="text" readonly value="${esc(inviteUrl)}" aria-label="Invite link"><button class="btn primary" data-act="invite">Share</button></div>
    </section>
    <section class="card">
      <h2>On another device?</h2>
      <p class="sub">Your personal link logs you in as ${esc(x.me.name)} anywhere. Don't share it, because anyone with it can act as you.</p>
      <button class="btn" data-act="personal">Copy my personal link</button>
      <hr class="hr">
      <button class="btn danger" data-act="leave">Leave this squad</button>
    </section>
    <section class="card">
      <h2>🔒 Your data</h2>
      <ul class="sub" style="margin:0;padding-left:18px;display:grid;gap:6px">
        <li>Pickup spots are only shown to your driver. They're deleted when you're picked up, or ${Math.round(d.pickupTtl / 3600000)} hours after you share them, whichever comes first.</li>
        <li>No emails, phone numbers or passwords are ever collected.</li>
        <li>This whole squad deletes itself automatically on <b>${esc(new Date(d.expiresAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</b>${d.demo ? ' (demo squads last 2 days after their last use)' : d.plan.date ? ' (a week after the hangout)' : ' (30 days after the last activity, or a week after the hangout once a date is set)'}.</li>
      </ul>
      ${d.canDelete ? '<button class="btn danger" data-act="deleteSquad">Delete this squad for everyone now</button>' : ''}
    </section>`;
  }

  // ----- Rides tab -----
  function tabRides(d, x) {
    const me = x.me, r = me.ride;
    const choose = `
      <div class="big-choice" role="group" aria-label="How are you getting there?">
        <button data-act="rideMode" data-v="driving" aria-pressed="${r.mode === 'driving'}"><span>🚗</span>I'm driving</button>
        <button data-act="rideMode" data-v="need" aria-pressed="${r.mode === 'need'}"><span>🙋</span>I need a pickup</button>
        <button data-act="rideMode" data-v="self" aria-pressed="${r.mode === 'self'}"><span>🚶</span>I'll get there myself</button>
      </div>`;

    let mine = '';
    if (me.status === 'out') {
      mine = '<p class="note">You marked yourself as can\'t make it. Switch to Going on the Plan tab to sort a ride.</p>';
    } else if (r.mode === 'driving') {
      const riders = x.ridersOf(me.id);
      const stateTxt = { waiting: ['Not ready yet', ''], ready: ['Ready, waiting for you', 'green'], outside: ['You told them you\'re outside', 'accent'], picked: ['In the car ✓', 'blue'] };
      mine = `
        <div class="row wrap-row">
          <span class="grow"><b>Seats for friends</b></span>
          <div class="stepper"><button data-act="seats" data-v="${r.seats - 1}" aria-label="Fewer seats">−</button><b>${r.seats}</b><button data-act="seats" data-v="${r.seats + 1}" aria-label="More seats">+</button></div>
        </div>
        <button class="btn block ${r.driverState === 'onway' ? '' : 'primary'}" data-act="driverState" data-v="${r.driverState === 'onway' ? 'idle' : 'onway'}">
          ${r.driverState === 'onway' ? '↩︎ Not on the way yet' : '🚗 I\'m leaving now'}
        </button>
        <h3>Your riders (${riders.length}/${r.seats})</h3>
        ${riders.map((m) => `
          <div class="rider">
            <div class="row">${av(m.name)}<div class="grow"><div class="name">${esc(m.name)}</div></div><span class="pill ${stateTxt[m.ride.riderState][1]}">${stateTxt[m.ride.riderState][0]}</span></div>
            ${m.ride.riderState === 'picked' ? '' : m.ride.pickup
              ? `<div class="note">📍 ${esc(m.ride.pickup.text || 'Shared their GPS location')}${m.ride.pickup.lat != null && m.ride.pickup.text ? ' (+ GPS)' : ''}<br><a href="${mapsUrl(m.ride.pickup)}" target="_blank" rel="noopener">Open in Maps</a> · <span class="small">shared ${ago(m.ride.pickup.at)}</span></div>`
              : `<div class="note">No pickup spot shared yet.</div>`}
            ${m.ride.riderState === 'picked' ? '' : `<div class="row wrap-row">
              ${m.ride.riderState !== 'outside' ? `<button class="btn sm primary" data-act="outside" data-id="${m.id}">📍 I'm outside</button>` : ''}
              <button class="btn sm green" data-act="picked" data-id="${m.id}">✓ Picked up</button>
              <button class="btn sm ghost" data-act="kick" data-id="${m.id}">Remove</button>
            </div>`}
          </div>`).join('') || '<p class="empty">No riders yet. They\'ll see your car and grab a seat.</p>'}
        <p class="sub small">You only see pickup spots for people in your car. Each spot is deleted as soon as you mark them picked up.</p>`;
    } else if (r.mode === 'need') {
      const dr = r.driverId ? x.byId[r.driverId] : null;
      const pickupForm = `
        <h3>Your pickup spot</h3>
        ${r.pickup ? `<div class="note">📍 ${esc(r.pickup.text || 'Your GPS location')}${r.pickup.lat != null ? ' (+ GPS pin)' : ''} · <a href="${mapsUrl(r.pickup)}" target="_blank" rel="noopener">check on Maps</a>
          <br><button class="btn sm ghost" data-act="clearPickup" style="padding-left:0">Remove my location</button></div>` : ''}
        <form class="form" data-form="pickup">
          <input type="text" name="text" data-keep="pickup.text" value="${esc(v('pickup.text', r.pickup?.text || ''))}" placeholder="e.g. Blue gate, 12 Lake Road" maxlength="300">
          <div class="row wrap-row"><button class="btn primary">Save spot</button><button type="button" class="btn" data-act="gps">📍 Use my current location</button></div>
        </form>
        <p class="sub small">🔒 Only ${dr ? esc(dr.name) : 'the driver you ride with'} can see this. It's deleted once you're picked up, or after ${Math.round(S.data.pickupTtl / 3600000)} hours.</p>`;
      if (dr) {
        const st = r.riderState;
        mine = `
          ${st === 'outside' ? `<div class="alert-outside">${esc(dr.name)} is outside! Go go go 🏃</div>` : ''}
          ${st === 'picked' ? `<div class="note" style="text-align:center;font-size:16px">✅ You're in ${esc(dr.name)}'s car. Enjoy!</div>` : `
          <div class="row">${av(dr.name)}<div class="grow"><div class="name">${esc(dr.name)} is picking you up</div>
            <div class="meta">${dr.ride.driverState === 'onway' ? '🚗 On the way now' : 'Hasn\'t left yet'}</div></div></div>
          ${st !== 'outside' ? `<button class="btn block ${st === 'ready' ? '' : 'green'}" data-act="ready" data-v="${st !== 'ready'}">${st === 'ready' ? '✓ You said you\'re ready. Tap to undo' : '🙌 I\'m ready, come get me'}</button>` : ''}
          ${pickupForm}
          <button class="btn sm ghost" data-act="leaveCar">Leave ${esc(dr.name)}'s car</button>`}`;
      } else {
        const open = x.drivers.filter((m) => m.id !== me.id);
        mine = `
          <h3>Pick a car</h3>
          ${open.map((m) => { const n = x.ridersOf(m.id).length; const full = n >= m.ride.seats; return `
            <div class="item row" style="padding:6px 0">${av(m.name)}<div class="grow"><div class="name">${esc(m.name)}</div><div class="meta">${m.ride.seats - n} seat${m.ride.seats - n === 1 ? '' : 's'} free${m.ride.driverState === 'onway' ? ' · already on the way' : ''}</div></div>
              <button class="btn sm ${full ? '' : 'primary'}" data-act="joinCar" data-id="${m.id}" ${full ? 'disabled' : ''}>${full ? 'Full' : 'Ride with ' + esc(m.name)}</button></div>`; }).join('') || '<p class="note">Nobody has offered to drive yet. You\'re on the "needs a pickup" list so drivers can see you.</p>'}
          ${pickupForm}`;
      }
    } else if (r.mode === 'self') {
      mine = '<p class="note">Cool, you\'re getting there on your own. If that changes, tap another option above.</p>';
    } else {
      mine = '<p class="note">Choose one so drivers know who needs a seat.</p>';
    }

    const overview = `
      <section class="card">
        <h2>All cars</h2>
        ${x.drivers.map((m) => { const riders = x.ridersOf(m.id); return `
          <div class="car">
            <div class="row">${av(m.name)}<div class="grow"><div class="name">${esc(m.name)}'s car</div><div class="meta">${m.ride.driverState === 'onway' ? '🚗 On the way' : 'Not left yet'}</div></div>
              <div class="seats" aria-label="${riders.length} of ${m.ride.seats} seats taken">${Array.from({ length: m.ride.seats }, (_, i) => `<span class="seat ${i < riders.length ? 'taken' : ''}"></span>`).join('')}</div></div>
            <div class="row wrap-row">${riders.map((rr) => `<span class="pill ${rr.ride.riderState === 'picked' ? 'blue' : ''}">${rr.ride.riderState === 'picked' ? '✓ ' : ''}${esc(rr.name)}</span>`).join('') || '<span class="sub small">No riders yet</span>'}</div>
          </div>`; }).join('') || '<p class="empty">No drivers yet.</p>'}
        ${x.stranded.length ? `<h3>Still needs a car</h3><div class="row wrap-row">${x.stranded.map((m) => `<span class="pill red">${esc(m.name)}</span>`).join('')}</div>` : (d.members.some((m) => m.ride.mode === 'need') ? '<p class="pill green">Everyone who needs a ride has one 🎉</p>' : '')}
        ${d.members.filter((m) => m.status !== 'out' && !m.ride.mode).length ? `<p class="sub small">Haven't said how they're getting there: ${esc(d.members.filter((m) => m.status !== 'out' && !m.ride.mode).map((m) => m.name).join(', '))}</p>` : ''}
      </section>`;

    return `<section class="card"><h2>How are you getting there?</h2>${choose}${mine}</section>${overview}`;
  }

  // ----- Jobs tab -----
  function tabJobs(d, x) {
    const me = x.me;
    const memberOptions = (sel) => `<option value="">Anyone</option>` + d.members.map((m) => `<option value="${m.id}" ${sel === m.id ? 'selected' : ''}>${esc(m.name)}${m.id === me.id ? ' (you)' : ''}</option>`).join('');
    const open = d.tasks.filter((t) => !t.done), done = d.tasks.filter((t) => t.done);
    const taskRow = (t) => `
      <div class="item">
        <button class="check" data-act="toggleTask" data-id="${t.id}" aria-pressed="${t.done}" aria-label="Done">${t.done ? '✓' : ''}</button>
        <div class="grow"><div class="${t.done ? 'done-text' : 'name'}">${esc(t.text)}</div></div>
        <select data-change="assign" data-id="${t.id}" style="width:auto;max-width:130px;padding:6px 8px;font-size:14px" aria-label="Who's doing it">${memberOptions(t.assigneeId)}</select>
        <button class="icon-btn" data-act="rmTask" data-id="${t.id}" aria-label="Delete">×</button>
      </div>`;
    return `
    <section class="card">
      <h2>Who's in charge of what</h2>
      <div class="list">${d.roles.map((r) => { const h = r.holderId ? x.byId[r.holderId] : null; return `
        <div class="item">
          ${h ? av(h.name) : '<span class="av" style="background:var(--line);color:var(--muted)">?</span>'}
          <div class="grow"><div class="name">${esc(r.name)}${h ? ` · <span style="font-weight:500">${esc(h.name)}</span>` : ''}</div><div class="meta">${esc(r.desc || '')}</div></div>
          ${!h ? `<button class="btn sm primary" data-act="claim" data-id="${r.id}">I'll do it</button>` : h.id === me.id ? `<button class="btn sm" data-act="release" data-id="${r.id}">Step down</button>` : ''}
          ${r.custom && !h ? `<button class="icon-btn" data-act="rmRole" data-id="${r.id}" aria-label="Remove role">×</button>` : ''}
        </div>`; }).join('')}</div>
      <form class="inline-form" data-form="role">
        <input type="text" name="name" data-keep="role.name" value="${esc(v('role.name'))}" placeholder="Add a role, e.g. Snacks, DJ, Photographer" maxlength="40">
        <button class="btn">Add</button>
      </form>
    </section>
    <section class="card">
      <div class="card-head"><h2>To-do</h2><span class="sub">${open.length} open</span></div>
      <form class="form" data-form="task">
        <input type="text" name="text" data-keep="task.text" value="${esc(v('task.text'))}" placeholder="e.g. Book 2 lanes, check if they take cards" maxlength="160">
        <div class="inline-form"><select name="assigneeId" data-keep="task.who" aria-label="Who's doing it">${memberOptions(v('task.who', ''))}</select><button class="btn primary">Add task</button></div>
      </form>
      <div class="list">${open.map(taskRow).join('') || '<p class="empty">Nothing to do. Nice.</p>'}</div>
      ${done.length ? `<h3>Done</h3><div class="list">${done.map(taskRow).join('')}</div>` : ''}
    </section>`;
  }

  // ----- Money tab -----
  function tabMoney(d, x) {
    const me = x.me;
    const treasurer = x.roleOf('Treasurer');
    const canSetBudget = !treasurer || treasurer.id === me.id;
    const isTreasurer = treasurer && treasurer.id === me.id;
    const b = d.budget;
    const people = x.counted;
    const target = b.mode === 'each' ? b.amount * people.length : b.amount;
    const pledged = people.reduce((s, m) => s + x.owes(m), 0);
    const confirmed = people.filter((m) => m.paid === 'confirmed').reduce((s, m) => s + x.owes(m), 0);
    const sent = people.filter((m) => m.paid === 'sent').reduce((s, m) => s + x.owes(m), 0);
    const spent = d.expenses.reduce((s, e) => s + e.amount, 0);
    const pct = (n) => (target > 0 ? Math.min(100, (n / target) * 100) : 0);
    const fair = b.mode === 'goal' && people.length ? Math.ceil((b.amount / people.length) * 100) / 100 : 0;
    const paidPill = (m) => m.paid === 'confirmed' ? '<span class="pill green">✓ Received</span>' : m.paid === 'sent' ? '<span class="pill amber">Says paid</span>' : '<span class="pill red">Not yet</span>';

    const budgetForm = `
      <form class="form" data-form="budget">
        <div class="seg" role="group">
          <button type="button" data-act="budgetMode" data-v="each" aria-pressed="${v('budget.mode', b.mode) === 'each'}">Same amount each</button>
          <button type="button" data-act="budgetMode" data-v="goal" aria-pressed="${v('budget.mode', b.mode) === 'goal'}">Group target</button>
        </div>
        <div class="form-row">
          <label class="field">${v('budget.mode', b.mode) === 'each' ? 'Each person brings' : 'The whole group needs'}
            <input type="number" name="amount" min="0" step="any" inputmode="decimal" data-keep="budget.amount" value="${esc(v('budget.amount', b.amount || ''))}" placeholder="0" required></label>
          <label class="field">Currency<input type="text" name="currency" maxlength="4" data-keep="budget.currency" value="${esc(v('budget.currency', d.currency))}"></label>
        </div>
        <div class="row"><button class="btn primary">Save budget</button>${b.amount ? '<button type="button" class="btn ghost" data-act="cancelBudget">Cancel</button>' : ''}</div>
      </form>`;

    return `
    <p class="note">💡 Squadup doesn't move any money. It keeps track of who owes what and who's paid, so nobody can argue about it later. Hand the money to the treasurer however your group normally does.</p>
    <section class="card">
      <div class="card-head"><h2>Budget</h2>${treasurer ? `<span class="sub small">Treasurer: ${esc(treasurer.name)}</span>` : `<button class="btn sm" data-act="tab" data-tab="jobs">Pick a treasurer</button>`}</div>
      ${!b.amount || S.ui.editBudget ? (canSetBudget ? budgetForm : `<p class="empty">${esc(treasurer.name)} hasn't set the budget yet.</p>`) : `
        <div class="plan-venue">${b.mode === 'each' ? `${x.cur(b.amount)} each` : `${x.cur(b.amount)} total`}</div>
        <p class="sub">${b.mode === 'each' ? `${people.length} people × ${x.cur(b.amount)} = ${x.cur(target)}` : `≈ ${x.cur(fair)} each if split between ${people.length} people. Everyone pledges what they can.`}</p>
        <div class="money-big">
          <div class="stat"><div class="k">Received</div><div class="v">${x.cur(confirmed)}</div></div>
          <div class="stat"><div class="k">${b.mode === 'goal' ? 'Pledged' : 'Target'}</div><div class="v">${x.cur(b.mode === 'goal' ? pledged : target)}</div></div>
          <div class="stat"><div class="k">Spent</div><div class="v">${x.cur(spent)}</div></div>
          <div class="stat"><div class="k">Left in the kitty</div><div class="v" style="color:${confirmed - spent < 0 ? 'var(--red)' : 'inherit'}">${x.cur(confirmed - spent)}</div></div>
        </div>
        <div class="bar" role="img" aria-label="${Math.round(pct(confirmed))}% received"><i class="confirmed" style="width:${pct(confirmed)}%"></i><i class="sent" style="width:${pct(sent)}%"></i></div>
        <div class="legend"><span><i style="background:var(--green)"></i>Received ${Math.round(pct(confirmed))}%</span><span><i style="background:color-mix(in srgb,var(--green) 40%,transparent)"></i>Says paid, not confirmed</span>${b.mode === 'goal' && pledged < target ? `<span style="color:var(--red)">Pledges are ${x.cur(target - pledged)} short</span>` : ''}</div>
        ${canSetBudget ? '<button class="btn sm" data-act="editBudget">Change budget</button>' : ''}`}
    </section>

    ${b.amount && me.status !== 'out' ? `
    <section class="card">
      <h2>Your part</h2>
      ${b.mode === 'goal' ? `
        <form class="inline-form" data-form="pledge">
          <input type="number" name="amount" min="0" step="any" inputmode="decimal" data-keep="pledge.amount" value="${esc(v('pledge.amount', me.pledge || ''))}" placeholder="Fair share ≈ ${esc(String(fair))}" aria-label="How much you'll bring">
          <button class="btn">${me.pledge ? 'Update' : 'Pledge'}</button>
        </form>` : `<p>You bring <b>${x.cur(b.amount)}</b>.</p>`}
      ${x.owes(me) ? (me.paid === 'confirmed'
        ? `<p class="pill green">✓ ${esc(treasurer?.name || 'The treasurer')} confirmed they got your ${x.cur(x.owes(me))}</p>`
        : `<button class="btn block ${me.paid === 'sent' ? '' : 'green'}" data-act="paid" data-v="${me.paid !== 'sent'}">${me.paid === 'sent' ? `⏳ Waiting for ${esc(treasurer?.name || 'the treasurer')} to confirm. Tap to undo` : `I've paid ${treasurer ? esc(treasurer.name) : 'the treasurer'}`}</button>`) : ''}
    </section>` : ''}

    ${b.amount ? `
    <section class="card">
      <div class="card-head"><h2>Who's paid</h2>${isTreasurer ? '<span class="pill accent">You confirm</span>' : ''}</div>
      <div class="list">${people.map((m) => `
        <div class="item">${av(m.name, true)}<div class="grow"><div class="name">${esc(m.name)}</div><div class="meta">${x.owes(m) ? x.cur(x.owes(m)) : 'No pledge yet'}</div></div>
          ${paidPill(m)}
          ${isTreasurer && x.owes(m) ? (m.paid === 'confirmed' ? `<button class="btn sm ghost" data-act="confirm" data-id="${m.id}" data-v="false">Undo</button>` : `<button class="btn sm green" data-act="confirm" data-id="${m.id}" data-v="true">Got it</button>`) : ''}
        </div>`).join('')}</div>
    </section>` : ''}

    <section class="card">
      <div class="card-head"><h2>Where the money went</h2><span class="num">${x.cur(spent)}</span></div>
      <div class="list">${d.expenses.slice().reverse().map((e) => `
        <div class="item"><div class="grow"><div class="name">${esc(e.what)}</div><div class="meta">${esc(x.byId[e.by]?.name || 'Someone')} · ${ago(e.at)}</div></div>
          <span class="num">${x.cur(e.amount)}</span>
          ${(e.by === me.id || isTreasurer) ? `<button class="icon-btn" data-act="rmExpense" data-id="${e.id}" aria-label="Remove">×</button>` : ''}</div>`).join('') || '<p class="empty">Nothing spent yet. Log each payment here so everyone can see.</p>'}</div>
      <form class="form" data-form="expense">
        <div class="form-row">
          <input type="text" name="what" data-keep="exp.what" value="${esc(v('exp.what'))}" placeholder="What? e.g. Lanes" maxlength="100">
          <input type="number" name="amount" min="0" step="any" inputmode="decimal" data-keep="exp.amount" value="${esc(v('exp.amount'))}" placeholder="How much?">
        </div>
        <button class="btn">Log spending</button>
      </form>
    </section>`;
  }

  // ---------- events ----------
  document.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.keep;
    if (k) S.drafts[k] = e.target.value;
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.keep) S.drafts[t.dataset.keep] = t.value;
    if (t.dataset && t.dataset.change === 'assign') act('task.assign', { id: t.dataset.id, assigneeId: t.value || null });
  });

  const clicks = {
    demo: async () => {
      try {
        const r = await api('POST', '/api/demo', { you: (S.drafts['create.you'] || '').trim() || 'You', currency: '$' });
        store.put(r.id, { token: r.token, key: r.key, name: 'Demo: Saturday bowling 🎳' });
        location.href = `/s/${r.id}`;
      } catch (e) { toast(e.message, true); }
    },
    tab:(el) => { S.tab = el.dataset.tab; history.replaceState(null, '', '#' + S.tab); render(); window.scrollTo({ top: 0 }); },
    invite: async () => {
      const url = `${location.origin}/s/${S.data.id}?k=${encodeURIComponent(S.data.key)}`;
      const textMsg = `Join "${S.data.name}" on Squadup. Plan, rides and money in one place:`;
      if (navigator.share) { try { await navigator.share({ title: S.data.name, text: textMsg, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      toast((await copyText(url)) ? 'Invite link copied. Paste it in the group chat.' : url);
    },
    personal: async () => {
      const url = `${location.origin}/s/${S.data.id}?t=${encodeURIComponent(S.token)}`;
      toast((await copyText(url)) ? 'Personal link copied. Open it on your other device.' : url);
    },
    leave: () => { if (confirm(`Leave ${S.data.name}? Your ride, roles and pledge will be cleared.`)) act('me.leave'); },
    deleteSquad: () => {
      if (!confirm(`Delete "${S.data.name}" for everyone? The plan, rides, money records and everyone's pickup spots are erased for good. This can't be undone.`)) return;
      act('squad.delete');
    },
    status: (el) => act('me.status', { status: el.dataset.v }),
    editPlan: () => { S.ui.editPlan = true; clearDrafts('plan.'); render(); },
    cancelPlan: () => { S.ui.editPlan = false; clearDrafts('plan.'); render(); },
    lock: (el) => act('plan.lock', { locked: el.dataset.v === 'true' }, el.dataset.v === 'true' ? 'Plan locked 🔒' : 'Plan unlocked'),
    vote: (el) => act('idea.vote', { id: el.dataset.id }),
    pick: (el) => act('idea.pick', { id: el.dataset.id }, 'Added to the plan'),
    unidea: (el) => act('idea.remove', { id: el.dataset.id }),
    uninfo: (el) => act('info.remove', { id: el.dataset.id }),
    moreActivity: () => { S.ui.showAllActivity = !S.ui.showAllActivity; render(); },
    rideMode: (el) => act('ride.mode', { mode: el.dataset.v }),
    seats: (el) => act('ride.seats', { seats: Number(el.dataset.v) }),
    driverState: (el) => act('ride.driverState', { state: el.dataset.v }, el.dataset.v === 'onway' ? 'Your riders can see you\'re on the way' : null),
    outside: (el) => act('ride.outside', { riderId: el.dataset.id }, 'They\'ve been told you\'re outside'),
    picked: (el) => act('ride.picked', { riderId: el.dataset.id }, 'Picked up. Their location is deleted.'),
    kick: (el) => { if (confirm('Remove them from your car?')) act('ride.kick', { riderId: el.dataset.id }); },
    joinCar: (el) => act('ride.join', { driverId: el.dataset.id }, 'Seat saved 🎉 Share your pickup spot below.'),
    leaveCar: () => act('ride.leave'),
    ready: (el) => act('ride.ready', { ready: el.dataset.v === 'true' }),
    clearPickup: () => { clearDrafts('pickup.'); act('ride.clearPickup', {}, 'Location removed'); },
    gps: () => {
      if (!navigator.geolocation) return toast('Your browser can\'t share location. Type it instead.', true);
      toast('Getting your location…');
      navigator.geolocation.getCurrentPosition(
        (pos) => act('ride.pickup', { text: v('pickup.text', S.data.members.find((m) => m.id === S.data.me)?.ride.pickup?.text || ''), lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) }, 'Location shared with your driver only'),
        (err) => toast(err.code === 1 ? 'Location permission was blocked. Type your spot instead.' : 'Couldn\'t get your location. Type it instead.', true),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    },
    claim: (el) => act('role.claim', { id: el.dataset.id }),
    release: (el) => act('role.release', { id: el.dataset.id }),
    rmRole: (el) => act('role.remove', { id: el.dataset.id }),
    toggleTask: (el) => act('task.toggle', { id: el.dataset.id }),
    rmTask: (el) => act('task.remove', { id: el.dataset.id }),
    budgetMode: (el) => { S.drafts['budget.mode'] = el.dataset.v; render(); },
    editBudget: () => { S.ui.editBudget = true; clearDrafts('budget.'); render(); },
    cancelBudget: () => { S.ui.editBudget = false; clearDrafts('budget.'); render(); },
    paid: (el) => act('me.paid', { sent: el.dataset.v === 'true' }),
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
        location.href = `/s/${r.id}#crew`;
      } catch (e) { toast(e.message, true); }
    },
    async join(f) {
      try {
        const r = await api('POST', `/api/squads/${S.squadId}/join`, { k: S.key, name: f.name });
        store.put(S.squadId, { token: r.token, key: S.key, name: S.preview.name });
        S.token = r.token; S.route = 'squad'; S.tab = 'plan';
        clearDrafts('join.');
        await refresh(); startLive();
        toast(`You're in! 👋`);
      } catch (e) { toast(e.message, true); }
    },
    async plan(f) { if (await act('plan.update', f, 'Plan saved')) { S.ui.editPlan = false; clearDrafts('plan.'); render(); } },
    async ideaVenue(f) { if (await act('idea.add', { kind: 'venue', text: f.text })) { clearDrafts('idea.venue'); render(); } },
    async ideaTime(f) { if (await act('idea.add', { kind: 'time', date: f.date, time: f.time })) { clearDrafts('idea.date'); clearDrafts('idea.time'); render(); } },
    async info(f) { if (await act('info.add', f, 'Pinned 📌')) { clearDrafts('info.'); render(); } },
    async pickup(f) { if (await act('ride.pickup', { text: f.text }, 'Saved. Only your driver can see it.')) { clearDrafts('pickup.'); render(); } },
    async role(f) { if (await act('role.add', f)) { clearDrafts('role.'); render(); } },
    async task(f) { if (await act('task.add', { text: f.text, assigneeId: f.assigneeId || null })) { delete S.drafts['task.text']; render(); } },
    async budget(f) {
      if (await act('budget.set', { mode: v('budget.mode', S.data.budget.mode), amount: f.amount, currency: f.currency }, 'Budget saved')) { S.ui.editBudget = false; clearDrafts('budget.'); render(); }
    },
    async pledge(f) { if (await act('me.pledge', f, 'Pledge saved')) { clearDrafts('pledge.'); render(); } },
    async expense(f) { if (await act('expense.add', f, 'Logged')) { clearDrafts('exp.'); render(); } },
  };

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = forms[form.dataset.form];
    if (fn) fn(Object.fromEntries(new FormData(form).entries()));
  });

  window.addEventListener('hashchange', () => {
    const t = location.hash.slice(1);
    if (S.route === 'squad' && t && t !== S.tab) { S.tab = t; render(); }
  });

  boot();
})();
