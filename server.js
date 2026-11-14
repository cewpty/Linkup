// Linkup: local development server. Zero dependencies: `node server.js`.
// In production the same logic runs on Cloudflare (src/worker.js).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rid, createSquad, createDemo, handle, findByToken, UserError, prune, expiresAt, GONE } from './src/core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'squads.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

let db = { squads: {} };
try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); if (!db.squads) db = { squads: {} }; } catch { /* first run */ }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(db));
      fs.renameSync(DATA_FILE + '.tmp', DATA_FILE);
    } catch (e) { console.error('save failed', e); }
  }, 250);
}

// live updates via Server-Sent Events (the Cloudflare version uses WebSockets)
const listeners = new Map();
function broadcast(sq) {
  for (const res of listeners.get(sq.id) || []) res.write(`data: ${sq.version}\n\n`);
}
setInterval(() => { for (const set of listeners.values()) for (const res of set) res.write(': ping\n\n'); }, 25000);

function deleteSquad(id) {
  delete db.squads[id];
  for (const res of listeners.get(id) || []) res.end();
  listeners.delete(id);
  save();
}

// cleanup sweep: delete expired squads and old pickup spots every 5 minutes
function sweep() {
  for (const sq of Object.values(db.squads)) {
    if (Date.now() >= expiresAt(sq)) deleteSquad(sq.id);
    else if (prune(sq)) { sq.version++; save(); broadcast(sq); }
  }
}
sweep();
setInterval(sweep, 5 * 60 * 1000);

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on('data', (c) => { size += c.length; if (size > 64 * 1024) { reject(new UserError('Too much data.')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new UserError('Bad JSON.')); } });
  req.on('error', reject);
});

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
function serveStatic(res, pathname) {
  let file = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) file = path.join(PUBLIC_DIR, 'index.html');
    fs.readFile(file, (err2, buf) => {
      if (err2) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (parts[0] !== 'api') return serveStatic(res, url.pathname);

    if (req.method === 'POST' && (url.pathname === '/api/squads' || url.pathname === '/api/demo')) {
      const b = await readBody(req);
      const id = rid(8);
      const { sq, token } = url.pathname === '/api/demo' ? createDemo(id, b) : createSquad(id, b);
      db.squads[id] = sq; save();
      return send(res, 200, { id, key: sq.key, token });
    }

    const sq = parts[1] === 'squads' && parts[2] ? db.squads[parts[2]] : null;
    if (!sq) return send(res, 404, { error: GONE });
    const token = req.headers['x-member-token'] || url.searchParams.get('t');
    const sub = parts[3] || '';

    if (sub === 'events' && req.method === 'GET') {
      if (!findByToken(sq, token)) return send(res, 403, { error: 'Not in this squad.' });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`retry: 3000\ndata: ${sq.version}\n\n`);
      if (!listeners.has(sq.id)) listeners.set(sq.id, new Set());
      listeners.get(sq.id).add(res);
      req.on('close', () => listeners.get(sq.id)?.delete(res));
      return;
    }

    const body = req.method === 'POST' ? await readBody(req) : {};
    const r = handle(sq, { method: req.method, sub, body, token, key: url.searchParams.get('k') });
    if (r.deleted) { deleteSquad(sq.id); return send(res, r.status, r.body); }
    if (r.changed) { save(); broadcast(sq); }
    return send(res, r.status, r.body);
  } catch (e) {
    if (e instanceof UserError) return send(res, 400, { error: e.message });
    console.error(e);
    return send(res, 500, { error: 'Something broke on our side. Try again.' });
  }
});

server.listen(PORT, () => console.log(`Linkup running → http://localhost:${PORT}`));
