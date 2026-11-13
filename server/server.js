'use strict';
/**
 * server.js — API HTTP + archivos estáticos. Sin dependencias.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const D = require('./db');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 8099);
const HOST = process.env.HOST || '0.0.0.0';

const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const OAUTH_REDIRECT = process.env.OAUTH_REDIRECT || `http://localhost:${PORT}/api/auth/google/callback`;
const GOOGLE_ENABLED = !!(GOOGLE_ID && GOOGLE_SECRET);
const oauthStates = new Map(); // state -> expiración

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/* ------------------------------- helpers ------------------------------- */

function send(res, status, body, headers = {}) {
  const isText = typeof body === 'string' || Buffer.isBuffer(body);
  const payload = isText ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
}
const ok = (res, body = { ok: true }) => send(res, 200, body);
const fail = (res, status, message) => send(res, status, { error: message });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 2e6) reject(new Error('payload demasiado grande'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

function requireUser(req, res) {
  const user = D.userByToken(bearer(req));
  if (!user) {
    fail(res, 401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
    return null;
  }
  return user;
}

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    points: u.points, created_at: u.created_at, last_seen: u.last_seen,
    total_seconds: u.total_seconds,
  };
}

/* -------------------------------- API -------------------------------- */

async function api(req, res, pathname, query) {
  const method = req.method;

  /* --- auth --- */
  if (pathname === '/api/auth/google' && method === 'POST') {
    const body = await readBody(req);
    const email = String(body.email || '').trim();
    const name = String(body.name || '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return fail(res, 400, 'Escribe un correo válido.');
    }
    const user = D.ensureUser({ email, name: name || email.split('@')[0] });
    const token = D.createToken(user.id);
    const sessionId = D.startSession(user.id);
    return ok(res, { token, sessionId, user: publicUser(user) });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    D.deleteToken(bearer(req));
    return ok(res);
  }

  if (pathname === '/api/me' && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    const group = D.groupOf(user.id);
    const progress = D.allProgress(user.id);
    const badges = D.badgesOf(user.id);
    return ok(res, {
      user: publicUser(user),
      group: group && !group.archived
        ? { id: group.id, name: group.name, grade: group.grade, code: group.code, teacher_name: group.teacher_name }
        : null,
      progress,
      badges,
    });
  }

  /* --- sesión / tiempo --- */
  if (pathname === '/api/session/start' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    return ok(res, { sessionId: D.startSession(user.id) });
  }
  if (pathname === '/api/session/ping' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await readBody(req);
    const r = D.pingSession(Number(body.sessionId), Number(body.seconds));
    return ok(res, r || { added: 0 });
  }

  /* --- grupos --- */
  if (pathname === '/api/group/join' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await readBody(req);
    const code = String(body.code || '').trim();
    if (!code) return fail(res, 400, 'Escribe el código que te dio tu profe.');
    const group = D.groupByCode(code);
    if (!group) return fail(res, 404, 'No encontramos ese código. Revísalo o pídele uno nuevo a tu profe.');
    D.joinGroup(user.id, group.id);
    return ok(res, { group: { id: group.id, name: group.name, grade: group.grade, code: group.code, teacher_name: group.teacher_name } });
  }

  if (pathname === '/api/group/leave' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    D.leaveGroup(user.id);
    return ok(res);
  }

  /* --- progreso --- */
  if (pathname === '/api/progress' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await readBody(req);
    const lab = String(body.lab || '');
    if (!['factorizacion', 'razon'].includes(lab)) return fail(res, 400, 'Laboratorio desconocido.');
    const saved = D.saveProgress({
      userId: user.id, lab, data: body.data || {},
      bestScore: body.bestScore || 0, badge: body.badge || null, pct: body.pct || 0,
    });
    return ok(res, { progress: saved, user: publicUser(D.db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
  }

  if (pathname === '/api/attempt' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    const b = await readBody(req);
    D.addAttempt({
      userId: user.id, lab: b.lab, phase: b.phase, challengeId: b.challengeId,
      answer: b.answer, isCorrect: !!b.isCorrect, attemptNo: b.attemptNo,
      hintsUsed: b.hintsUsed, points: b.points,
    });
    return ok(res);
  }

  if (pathname === '/api/badge' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    const b = await readBody(req);
    const isNew = D.addBadge(user.id, String(b.key), b.lab || null);
    const fresh = D.db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    return ok(res, { isNew, user: publicUser(fresh) });
  }

  /* --- mensajes --- */
  if (pathname === '/api/messages' && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    const group = D.groupOf(user.id);
    if (!group || group.archived) return ok(res, { messages: [] });
    return ok(res, {
      messages: D.messagesOf(group.id).map((m) => ({
        id: m.id, title: m.title, body: m.body, created_at: m.created_at, author_name: m.author_name,
      })),
    });
  }

  /* --- ranking --- */
  if (pathname === '/api/ranking' && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    const lab = query.get('lab') || null;
    const groupIdParam = query.get('groupId');
    const range = query.get('range') || 'todo';
    const group = D.groupOf(user.id);

    let groupId = group && !group.archived ? group.id : null;
    if (groupIdParam) {
      groupId = Number(groupIdParam);
      const g = D.groupById(groupId);
      if (!g) return fail(res, 404, 'Ese grupo no existe.');
      const isOwner = g.teacher_id === user.id;
      const isMine = !!group && group.id === g.id; // un estudiante puede ver su propio grupo
      if (user.role !== 'superadmin' && !isOwner && !isMine) {
        return fail(res, 403, 'No tienes acceso a este grupo.');
      }
    }
    if (!groupId && user.role === 'estudiante') return ok(res, { rows: [], scope: null });

    let since = null;
    const d = new Date();
    if (range === 'semana') { d.setDate(d.getDate() - 7); since = d.toISOString(); }
    if (range === 'mes') { d.setMonth(d.getMonth() - 1); since = d.toISOString(); }

    const rows = D.rankRows({ groupId, lab: lab || null, since, limit: 200 });
    const badgeMap = D.badgesForUsers(rows.map((r) => r.id));
    return ok(res, {
      scope: groupId ? (D.groupById(groupId) || {}).name : 'global',
      rows: rows.map((r, i) => ({
        pos: i + 1, id: r.id, name: r.name, points: r.points,
        badges: badgeMap[r.id] || [],
      })),
    });
  }

  /* --- docente --- */
  if (pathname === '/api/teacher/groups' && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role === 'estudiante') return fail(res, 403, 'No tienes acceso a este grupo.');
    const groups = user.role === 'superadmin' ? D.allGroups() : D.groupsOfTeacher(user.id);
    return ok(res, { groups });
  }

  if (pathname === '/api/teacher/groups' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role === 'estudiante') return fail(res, 403, 'No tienes acceso a este grupo.');
    const b = await readBody(req);
    const name = String(b.name || '').trim();
    if (!name) return fail(res, 400, 'Ponle un nombre al grupo.');
    if (name.length > 60) return fail(res, 400, 'El nombre no puede pasar de 60 caracteres.');
    const grade = String(b.grade || '').trim();
    const g = D.createGroup({ name, grade, teacherId: user.id });
    return ok(res, { group: g });
  }

  const mGroup = pathname.match(/^\/api\/teacher\/groups\/(\d+)$/);
  if (mGroup && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    const g = D.groupById(Number(mGroup[1]));
    if (!g) return fail(res, 404, 'Ese grupo no existe.');
    if (user.role !== 'superadmin' && g.teacher_id !== user.id) {
      return fail(res, 403, 'No tienes acceso a este grupo.');
    }
    const students = D.studentsOf(g.id).map((s) => {
      const p = D.allProgress(s.id);
      const f = p.factorizacion || { pct: 0, best_score: 0, badge: null };
      const r = p.razon || { pct: 0, best_score: 0, badge: null };
      return {
        id: s.id, name: s.name, email: s.email, points: s.points,
        last_seen: s.last_seen, total_seconds: s.total_seconds,
        factorizacion: { pct: f.pct, score: f.best_score, badge: f.badge },
        razon: { pct: r.pct, score: r.best_score, badge: r.badge },
      };
    });
    return ok(res, {
      group: { ...g, students: students.length },
      students,
      messages: D.messagesOf(g.id, true).map((m) => ({
        id: m.id, title: m.title, body: m.body, created_at: m.created_at, deleted: m.deleted,
      })),
      canManage: user.role === 'superadmin' ? true : g.teacher_id === user.id,
    });
  }

  const mStudent = pathname.match(/^\/api\/teacher\/groups\/(\d+)\/students\/(\d+)$/);
  if (mStudent && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    const g = D.groupById(Number(mStudent[1]));
    if (!g) return fail(res, 404, 'Ese grupo no existe.');
    if (user.role !== 'superadmin' && g.teacher_id !== user.id) {
      return fail(res, 403, 'No tienes acceso a este grupo.');
    }
    const sid = Number(mStudent[2]);
    const s = D.db.prepare('SELECT * FROM users WHERE id = ?').get(sid);
    if (!s) return fail(res, 404, 'Ese estudiante no existe.');
    const p = D.allProgress(sid);
    return ok(res, {
      student: publicUser(s),
      badges: D.badgesOf(sid),
      attempts: D.attemptsOf(sid).slice(0, 300),
      progress: {
        factorizacion: p.factorizacion ? { ...p.factorizacion.data, best_score: p.factorizacion.best_score, badge: p.factorizacion.badge } : null,
        razon: p.razon ? { ...p.razon.data, best_score: p.razon.best_score, badge: p.razon.badge } : null,
      },
      inGroup: !!D.db.prepare('SELECT 1 FROM memberships WHERE user_id = ? AND group_id = ?').get(sid, g.id),
    });
  }

  const mMsg = pathname.match(/^\/api\/teacher\/groups\/(\d+)\/messages$/);
  if (mMsg && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    const g = D.groupById(Number(mMsg[1]));
    if (!g) return fail(res, 404, 'Ese grupo no existe.');
    if (g.teacher_id !== user.id) return fail(res, 403, 'No tienes acceso a este grupo.');
    const b = await readBody(req);
    const body = String(b.body || '').trim();
    const title = String(b.title || '').trim();
    if (!body) return fail(res, 400, 'Escribe el mensaje.');
    if (body.length > 500) return fail(res, 400, 'El mensaje no puede pasar de 500 caracteres.');
    if (title.length > 80) return fail(res, 400, 'El título no puede pasar de 80 caracteres.');
    const m = D.addMessage({ groupId: g.id, authorId: user.id, title, body });
    return ok(res, { message: m });
  }

  const mMsgDel = pathname.match(/^\/api\/teacher\/messages\/(\d+)$/);
  if (mMsgDel && method === 'DELETE') {
    const user = requireUser(req, res);
    if (!user) return;
    const id = Number(mMsgDel[1]);
    const m = D.db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!m) return fail(res, 404, 'Ese mensaje no existe.');
    const g = D.groupById(m.group_id);
    if (g.teacher_id !== user.id) return fail(res, 403, 'No tienes acceso a este grupo.');
    D.deleteMessage(id, m.group_id);
    return ok(res);
  }

  const mArchive = pathname.match(/^\/api\/teacher\/groups\/(\d+)\/archive$/);
  if (mArchive && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    const g = D.groupById(Number(mArchive[1]));
    if (!g) return fail(res, 404, 'Ese grupo no existe.');
    if (user.role !== 'superadmin' && g.teacher_id !== user.id) return fail(res, 403, 'No tienes acceso a este grupo.');
    D.archiveGroup(g.id);
    return ok(res);
  }

  /* --- superadmin --- */
  if (pathname === '/api/admin/users' && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role !== 'superadmin') return fail(res, 403, 'Solo el superadmin puede ver las cuentas.');
    return ok(res, { users: D.allUsers() });
  }

  const mRole = pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
  if (mRole && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role !== 'superadmin') return fail(res, 403, 'Solo el superadmin puede cambiar roles.');
    const id = Number(mRole[1]);
    if (id === user.id) return fail(res, 400, 'No puedes cambiar tu propio rol.');
    const b = await readBody(req);
    const role = b.role === 'docente' ? 'docente' : 'estudiante';
    const target = D.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) return fail(res, 404, 'Esa cuenta no existe.');
    if (target.role === 'superadmin') return fail(res, 400, 'No puedes cambiar el rol del superadmin.');
    return ok(res, { user: publicUser(D.setRole(id, role)) });
  }

  if (pathname === '/api/admin/ranking' && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role !== 'superadmin') return fail(res, 403, 'Solo el superadmin puede ver el ranking global.');
    const lab = query.get('lab') || null;
    const rows = D.rankRows({ lab, limit: 500 });
    const badgeMap = D.badgesForUsers(rows.map((r) => r.id));
    return ok(res, {
      rows: rows.map((r, i) => ({ pos: i + 1, id: r.id, name: r.name, points: r.points, badges: badgeMap[r.id] || [] })),
    });
  }

  if (pathname === '/api/network' && method === 'GET') {
    const nets = require('node:os').networkInterfaces();
    const urls = [];
    for (const list of Object.values(nets)) {
      for (const n of list || []) {
        if (n && n.family === 'IPv4' && !n.internal) urls.push(`http://${n.address}:${PORT}`);
      }
    }
    // detrás de un proxy (Render, Fly…) el host público viene en las cabeceras
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const esPublico = host && !/^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    const publicUrl = esPublico ? `${proto}://${host}` : null;
    return ok(res, { urls, publicUrl, port: PORT, host: HOST });
  }

  if (pathname === '/api/config' && method === 'GET') {
    return ok(res, { google: GOOGLE_ENABLED, superadmin: D.SUPERADMIN_EMAIL });
  }

  if (pathname === '/api/auth/google/start' && method === 'GET') {
    if (!GOOGLE_ENABLED) {
      return fail(res, 503, 'El acceso con Google no está configurado en este servidor.');
    }
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    oauthStates.set(state, Date.now() + 10 * 60 * 1000);
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_ID);
    authUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');
    res.writeHead(302, { Location: authUrl.toString() });
    return res.end();
  }

  if (pathname === '/api/auth/google/callback' && method === 'GET') {
    const code = query.get('code');
    const state = query.get('state');
    const expires = oauthStates.get(state);
    oauthStates.delete(state);
    if (!GOOGLE_ENABLED) return fail(res, 503, 'Google no está configurado.');
    if (!code || !expires || expires < Date.now()) return fail(res, 400, 'El enlace de acceso expiró.');
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: GOOGLE_ID, client_secret: GOOGLE_SECRET,
          redirect_uri: OAUTH_REDIRECT, grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.access_token) throw new Error('sin access_token');
      const info = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + tokens.access_token },
      })).json();
      if (!info.email) throw new Error('Google no devolvió correo');
      const user = D.ensureUser({ email: info.email, name: info.name || info.email.split('@')[0] });
      D.startSession(user.id);
      const token = D.createToken(user.id);
      res.writeHead(302, { Location: `/?token=${encodeURIComponent(token)}#/` });
      return res.end();
    } catch (e) {
      console.error('[oauth]', e);
      return fail(res, 502, 'No pudimos completar el acceso con Google.');
    }
  }

  if (pathname === '/api/users' && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role === 'estudiante') return fail(res, 403, 'No tienes acceso a esta sección.');
    if (user.role === 'superadmin') {
      return ok(res, { users: D.allUsers().map(publicUser), scope: 'global' });
    }
    const groups = D.groupsOfTeacher(user.id);
    const seen = new Map();
    for (const g of groups) for (const st of D.studentsOf(g.id)) {
      if (!seen.has(st.id)) seen.set(st.id, { ...st, group: g.name, role: 'estudiante' });
    }
    return ok(res, { users: [...seen.values()], scope: 'docente' });
  }

  if (pathname === '/api/health') return ok(res, { ok: true, ts: Date.now() });

  return fail(res, 404, 'No encontramos esa ruta.');
}

/* ------------------------------ estáticos ------------------------------ */

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || !path.extname(rel)) rel = '/index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC_DIR)) return fail(res, 403, 'Prohibido.');
  fs.readFile(file, (err, buf) => {
    if (err) {
      // SPA fallback
      return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) => {
        if (e2) return fail(res, 404, 'No encontrado.');
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
        res.end(html);
      });
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
    });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';
  try {
    if (pathname.startsWith('/api/')) {
      await api(req, res, pathname, new URLSearchParams(parsed.query));
    } else {
      serveStatic(req, res, pathname);
    }
  } catch (e) {
    console.error('[api]', pathname, e);
    if (!res.headersSent) fail(res, 500, 'Algo salió mal. Intenta de nuevo.');
  }
});

server.listen(PORT, HOST, () => {
  const os = require('node:os');
  const nets = os.networkInterfaces();
  const lan = Object.values(nets).flat().find((n) => n && n.family === 'IPv4' && !n.internal);
  console.log(`El Laboratorio escuchando en http://localhost:${PORT}`);
  if (lan) console.log(`En tu red local: http://${lan.address}:${PORT}`);
});
