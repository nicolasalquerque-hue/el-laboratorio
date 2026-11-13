'use strict';
/**
 * db.js — esquema y acceso a datos. Sin dependencias: node:sqlite.
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// DATA_DIR permite apuntar la base a un volumen persistente en producción
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'laboratorio.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'estudiante',
  points        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  last_seen     TEXT,
  total_seconds INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  grade      TEXT,
  code       TEXT NOT NULL UNIQUE,
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  archived   INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS memberships (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  group_id  INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users(id),
  title      TEXT,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS progress (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab        TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '{}',
  best_score INTEGER NOT NULL DEFAULT 0,
  badge      TEXT,
  pct        INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (user_id, lab)
);
CREATE TABLE IF NOT EXISTS attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab          TEXT NOT NULL,
  phase        TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  answer       TEXT,
  is_correct   INTEGER NOT NULL DEFAULT 0,
  attempt_no   INTEGER NOT NULL DEFAULT 1,
  hints_used   INTEGER NOT NULL DEFAULT 0,
  points       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS badges (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key       TEXT NOT NULL,
  lab       TEXT,
  earned_at TEXT NOT NULL,
  UNIQUE (user_id, key, lab)
);
CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at  TEXT NOT NULL,
  last_active TEXT NOT NULL,
  seconds     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, lab, created_at);
CREATE INDEX IF NOT EXISTS idx_memberships_group ON memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id, deleted);
`);

const now = () => new Date().toISOString();
const SUPERADMIN_EMAIL = 'nicolasalquerque@gmail.com';
const BADGE_BONUS = 20;
const GLOBAL_BADGES = ['primeros_pasos', 'racha_fuego', 'sin_ayudas', 'god_laboratorio'];

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
  let s = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) s += A[bytes[i] % A.length];
  return 'LAB-' + s;
}

/* ------------------------------ usuarios ------------------------------ */

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(String(email).trim());
}

function createUser({ email, name }) {
  const role = String(email).toLowerCase() === SUPERADMIN_EMAIL ? 'superadmin' : 'estudiante';
  const info = db
    .prepare('INSERT INTO users (email, name, role, created_at, last_seen) VALUES (?,?,?,?,?)')
    .run(String(email).trim(), String(name).trim(), role, now(), now());
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

function ensureUser({ email, name }) {
  let u = findUserByEmail(email);
  if (!u) u = createUser({ email, name });
  db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(now(), u.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
}

function createToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO auth_sessions (token, user_id, created_at) VALUES (?,?,?)').run(token, userId, now());
  return token;
}

function userByToken(token) {
  if (!token) return null;
  const row = db.prepare('SELECT user_id FROM auth_sessions WHERE token = ?').get(token);
  if (!row) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) || null;
}

function deleteToken(token) {
  if (token) db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
}

/* ------------------------------ grupos ------------------------------ */

function groupOf(userId) {
  return db
    .prepare(
      `SELECT g.*, u.name AS teacher_name FROM memberships m
       JOIN groups g ON g.id = m.group_id
       JOIN users u ON u.id = g.teacher_id
       WHERE m.user_id = ?`
    )
    .get(userId);
}

function groupByCode(code) {
  return db
    .prepare(
      `SELECT g.*, u.name AS teacher_name FROM groups g
       JOIN users u ON u.id = g.teacher_id
       WHERE upper(g.code) = upper(?) AND g.archived = 0`
    )
    .get(String(code).trim());
}

function createGroup({ name, grade, teacherId }) {
  let code = newCode();
  for (let i = 0; i < 20; i++) {
    const exists = db.prepare('SELECT 1 FROM groups WHERE code = ?').get(code);
    if (!exists) break;
    code = newCode();
  }
  const info = db
    .prepare('INSERT INTO groups (name, grade, code, teacher_id, created_at) VALUES (?,?,?,?,?)')
    .run(name, grade || null, code, teacherId, now());
  return db.prepare('SELECT * FROM groups WHERE id = ?').get(info.lastInsertRowid);
}

function groupsOfTeacher(teacherId) {
  return db
    .prepare(
      `SELECT g.*, (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id) AS students
       FROM groups g WHERE g.teacher_id = ? AND g.archived = 0
       ORDER BY g.created_at DESC`
    )
    .all(teacherId);
}

function allGroups() {
  return db
    .prepare(
      `SELECT g.*, u.name AS teacher_name, u.email AS teacher_email,
              (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id) AS students
       FROM groups g JOIN users u ON u.id = g.teacher_id
       WHERE g.archived = 0 ORDER BY g.created_at DESC`
    )
    .all();
}

function groupById(id) {
  return db
    .prepare(
      `SELECT g.*, u.name AS teacher_name, u.email AS teacher_email
       FROM groups g JOIN users u ON u.id = g.teacher_id WHERE g.id = ?`
    )
    .get(id);
}

function archiveGroup(id) {
  db.prepare('UPDATE groups SET archived = 1 WHERE id = ?').run(id);
}

function studentsOf(groupId) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, u.points, u.created_at, u.last_seen, u.total_seconds, m.joined_at
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.group_id = ? ORDER BY u.name COLLATE NOCASE`
    )
    .all(groupId);
}

function joinGroup(userId, groupId) {
  db.prepare(
    `INSERT INTO memberships (user_id, group_id, joined_at) VALUES (?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET group_id = excluded.group_id, joined_at = excluded.joined_at`
  ).run(userId, groupId, now());
}

function leaveGroup(userId) {
  db.prepare('DELETE FROM memberships WHERE user_id = ?').run(userId);
}

/* ------------------------------ mensajes ------------------------------ */

function messagesOf(groupId, includeDeleted = false) {
  const cond = includeDeleted ? '' : 'AND m.deleted = 0';
  return db
    .prepare(
      `SELECT m.*, u.name AS author_name FROM messages m
       JOIN users u ON u.id = m.author_id
       WHERE m.group_id = ? ${cond} ORDER BY m.created_at DESC`
    )
    .all(groupId);
}

function addMessage({ groupId, authorId, title, body }) {
  const info = db
    .prepare('INSERT INTO messages (group_id, author_id, title, body, created_at) VALUES (?,?,?,?,?)')
    .run(groupId, authorId, title || null, body, now());
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
}

function deleteMessage(id, groupId) {
  const m = db.prepare('SELECT * FROM messages WHERE id = ? AND group_id = ?').get(id, groupId);
  if (!m) return false;
  db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(id);
  return true;
}

/* ------------------------------ progreso ------------------------------ */

function getProgress(userId, lab) {
  const row = db.prepare('SELECT * FROM progress WHERE user_id = ? AND lab = ?').get(userId, lab);
  if (!row) return null;
  return { ...row, data: JSON.parse(row.data || '{}') };
}

function allProgress(userId) {
  const rows = db.prepare('SELECT * FROM progress WHERE user_id = ?').all(userId);
  const out = {};
  for (const r of rows) out[r.lab] = { ...r, data: JSON.parse(r.data || '{}') };
  return out;
}

function saveProgress({ userId, lab, data, bestScore, badge, pct }) {
  const prev = getProgress(userId, lab);
  const best = Math.max(prev ? prev.best_score : 0, Number(bestScore || 0));
  const better = prev && prev.badge ? compareBadge(badge, prev.badge) : 1;
  const finalBadge = prev && prev.badge && better <= 0 ? prev.badge : badge || (prev && prev.badge) || null;
  db.prepare(
    `INSERT INTO progress (user_id, lab, data, best_score, badge, pct, updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id, lab) DO UPDATE SET
       data = excluded.data,
       best_score = excluded.best_score,
       badge = excluded.badge,
       pct = excluded.pct,
       updated_at = excluded.updated_at`
  ).run(userId, lab, JSON.stringify(data || {}), best, finalBadge, Number(pct || 0), now());
  recomputePoints(userId);
  return getProgress(userId, lab);
}

const BADGE_ORDER = { iniciante: 1, explorador: 2, constructor: 3, god: 4 };
function compareBadge(a, b) {
  return (BADGE_ORDER[a] || 0) - (BADGE_ORDER[b] || 0);
}

function recomputePoints(userId) {
  const rows = db.prepare('SELECT best_score FROM progress WHERE user_id = ?').all(userId);
  const base = rows.reduce((s, r) => s + (r.best_score || 0), 0);
  const gb = db
    .prepare(`SELECT COUNT(*) AS n FROM badges WHERE user_id = ? AND key IN (${GLOBAL_BADGES.map(() => '?').join(',')})`)
    .get(userId, ...GLOBAL_BADGES);
  const total = base + (gb.n || 0) * BADGE_BONUS;
  db.prepare('UPDATE users SET points = ? WHERE id = ?').run(total, userId);
  return total;
}

function addAttempt(a) {
  db.prepare(
    `INSERT INTO attempts (user_id, lab, phase, challenge_id, answer, is_correct, attempt_no, hints_used, points, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    a.userId, a.lab, a.phase, a.challengeId, a.answer ?? null,
    a.isCorrect ? 1 : 0, a.attemptNo || 1, a.hintsUsed || 0, a.points || 0, now()
  );
}

function attemptsOf(userId, lab) {
  const q = lab
    ? db.prepare('SELECT * FROM attempts WHERE user_id = ? AND lab = ? ORDER BY created_at DESC').all(userId, lab)
    : db.prepare('SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return q;
}

function addBadge(userId, key, lab) {
  const exists = db
    .prepare('SELECT 1 FROM badges WHERE user_id = ? AND key = ? AND lab IS ?')
    .get(userId, key, lab ?? null);
  if (exists) return false;
  db.prepare('INSERT INTO badges (user_id, key, lab, earned_at) VALUES (?,?,?,?)').run(userId, key, lab ?? null, now());
  recomputePoints(userId);
  return true;
}

function badgesOf(userId) {
  return db.prepare('SELECT * FROM badges WHERE user_id = ? ORDER BY earned_at DESC').all(userId);
}

/* ------------------------------ tiempo ------------------------------ */

function startSession(userId) {
  const info = db
    .prepare('INSERT INTO sessions (user_id, started_at, last_active, seconds) VALUES (?,?,?,0)')
    .run(userId, now(), now());
  return info.lastInsertRowid;
}

function pingSession(sessionId, seconds) {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!s) return null;
  const last = new Date(s.last_active).getTime();
  const nowMs = Date.now();
  // si pasaron más de 15 min sin actividad, no sumar el hueco
  const delta = nowMs - last > 15 * 60 * 1000 ? 0 : Math.max(0, Math.min(Number(seconds) || 0, 120));
  db.prepare('UPDATE sessions SET seconds = seconds + ?, last_active = ? WHERE id = ?').run(delta, now(), sessionId);
  db.prepare('UPDATE users SET total_seconds = total_seconds + ? WHERE id = ?').run(delta, s.user_id);
  return { added: delta };
}

/* ------------------------------ ranking ------------------------------ */

function rankRows({ groupId = null, lab = null, since = null, limit = 100 } = {}) {
  const params = [];
  let where = "WHERE u.role = 'estudiante'";
  let join = '';
  if (groupId) {
    join = 'JOIN memberships m ON m.user_id = u.id';
    where += ' AND m.group_id = ?';
    params.push(groupId);
  }

  if (since) {
    // puntos del periodo: suma de intentos dentro del rango
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.created_at,
                COALESCE(SUM(a.points), 0) AS pts
         FROM users u
         ${join}
         LEFT JOIN attempts a ON a.user_id = u.id AND a.created_at >= ? ${lab ? 'AND a.lab = ?' : ''}
         ${where}
         GROUP BY u.id ORDER BY pts DESC LIMIT ?`
      )
      .all(...(lab ? [since, lab, ...params, limit] : [since, ...params, limit]));
    return rows.map((r) => ({ id: r.id, name: r.name, points: r.pts, created_at: r.created_at }));
  }

  if (lab) {
    return db
      .prepare(
        `SELECT u.id, u.name, u.created_at, COALESCE(p.best_score, 0) AS points
         FROM users u
         ${join}
         LEFT JOIN progress p ON p.user_id = u.id AND p.lab = ?
         ${where} ORDER BY points DESC, u.created_at ASC LIMIT ?`
      )
      .all(lab, ...params, limit);
  }

  return db
    .prepare(
      `SELECT u.id, u.name, u.created_at, u.points AS points
       FROM users u ${join} ${where} ORDER BY u.points DESC, u.created_at ASC LIMIT ?`
    )
    .all(...params, limit);
}

function badgesForUsers(ids) {
  if (!ids.length) return {};
  const q = db
    .prepare(`SELECT user_id, key, lab FROM badges WHERE user_id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids);
  const out = {};
  for (const r of q) (out[r.user_id] = out[r.user_id] || []).push({ key: r.key, lab: r.lab });
  return out;
}

/* ------------------------------ admin ------------------------------ */

function allUsers() {
  return db
    .prepare(
      `SELECT id, name, email, role, points, created_at, last_seen, total_seconds
       FROM users ORDER BY created_at DESC`
    )
    .all();
}

function setRole(id, role) {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

module.exports = {
  db, now, SUPERADMIN_EMAIL, GLOBAL_BADGES, BADGE_BONUS,
  findUserByEmail, createUser, ensureUser, createToken, userByToken, deleteToken,
  groupOf, groupByCode, createGroup, groupsOfTeacher, allGroups, groupById, archiveGroup,
  studentsOf, joinGroup, leaveGroup,
  messagesOf, addMessage, deleteMessage,
  getProgress, allProgress, saveProgress, recomputePoints,
  addAttempt, attemptsOf, addBadge, badgesOf,
  startSession, pingSession,
  rankRows, badgesForUsers,
  allUsers, setRole,
};
