// Linkup on Cloudflare: a Worker serves the API, the files in /public are
// served as static assets, and each squad lives in its own Durable Object
// (its own little database). Live updates use hibernating WebSockets, so
// idle connections cost nothing on the free plan.

import { DurableObject } from 'cloudflare:workers';
import { rid, createSquad, createDemo, handle, findByToken, UserError } from './core.js';

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

async function readJson(request) {
  const raw = await request.text();
  if (raw.length > 64 * 1024) throw new UserError('Too much data.');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new UserError('Bad JSON.'); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      // create a squad (or a demo squad): pick a fresh id and hand it to that squad's Durable Object
      if (request.method === 'POST' && (url.pathname === '/api/squads' || url.pathname === '/api/demo')) {
        const body = await readJson(request);
        const id = rid(8);
        const stub = env.SQUADS.get(env.SQUADS.idFromName(id));
        return stub.fetch(new Request(`https://squad/__create?id=${id}&demo=${url.pathname === '/api/demo' ? 1 : 0}`, {
          method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
        }));
      }
      const m = url.pathname.match(/^\/api\/squads\/([A-Za-z0-9_-]{4,40})(?:\/(join|act|ws))?\/?$/);
      if (!m) return json(404, { error: 'Not found' });
      const stub = env.SQUADS.get(env.SQUADS.idFromName(m[1]));
      return stub.fetch(request);
    } catch (e) {
      if (e instanceof UserError) return json(400, { error: e.message });
      console.error(e);
      return json(500, { error: 'Something broke on our side. Try again.' });
    }
  },
};

export class Squad extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sq = undefined;
    // answer keep-alive pings without waking the object up
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async load() {
    if (this.sq === undefined) this.sq = (await this.ctx.storage.get('sq')) || null;
    return this.sq;
  }

  async save() { await this.ctx.storage.put('sq', this.sq); }

  broadcast() {
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(String(this.sq.version)); } catch { /* closed */ } }
  }

  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/__create') {
        if (await this.load()) return json(409, { error: 'Try again.' });
        const body = await readJson(request);
        const id = url.searchParams.get('id');
        const { sq, token } = url.searchParams.get('demo') === '1' ? createDemo(id, body) : createSquad(id, body);
        this.sq = sq;
        await this.save();
        return json(200, { id, key: sq.key, token });
      }

      const sq = await this.load();
      if (!sq) return json(404, { error: 'This squad does not exist (or the link is wrong).' });
      const parts = url.pathname.split('/').filter(Boolean); // api, squads, id, sub?
      const sub = parts[3] || '';
      const token = request.headers.get('X-Member-Token') || url.searchParams.get('t');

      if (sub === 'ws') {
        if (request.headers.get('Upgrade') !== 'websocket') return json(426, { error: 'Expected a WebSocket.' });
        if (!findByToken(sq, token)) return json(403, { error: 'Not in this squad.' });
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        pair[1].send(String(sq.version));
        return new Response(null, { status: 101, webSocket: pair[0] });
      }

      const body = request.method === 'POST' ? await readJson(request) : {};
      const r = handle(sq, { method: request.method, sub, body, token, key: url.searchParams.get('k') });
      if (r.changed) { await this.save(); this.broadcast(); }
      return json(r.status, r.body);
    } catch (e) {
      if (e instanceof UserError) return json(400, { error: e.message });
      console.error(e);
      // drop any half-applied change by reloading from storage next time
      this.sq = undefined;
      return json(500, { error: 'Something broke on our side. Try again.' });
    }
  }

  webSocketMessage() { /* clients only send pings, handled by auto-response */ }
  webSocketClose(ws, code) { try { ws.close(code, 'bye'); } catch { /* already closed */ } }
  webSocketError() { /* nothing to clean up: getWebSockets() drops dead sockets */ }
}
