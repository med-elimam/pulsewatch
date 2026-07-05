// db.js — SQLite storage using Node's built-in node:sqlite (zero external deps)
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/pulsewatch.db';
if (!existsSync(dirname(DB_PATH))) mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  pw_salt       TEXT NOT NULL,
  pw_hash       TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free',
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS monitors (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  token          TEXT UNIQUE NOT NULL,
  period_seconds INTEGER NOT NULL DEFAULT 3600,
  grace_seconds  INTEGER NOT NULL DEFAULT 300,
  status         TEXT NOT NULL DEFAULT 'new',       -- new | up | down | paused
  last_ping_at   INTEGER,
  last_duration_ms INTEGER,
  last_start_at  INTEGER,
  next_due_at    INTEGER,
  slack_webhook  TEXT,
  alert_email    TEXT,
  paused         INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_monitors_user ON monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_monitors_token ON monitors(token);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  monitor_id  TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- created | start | success | fail | down | up | test | paused | resumed
  note        TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_monitor ON events(monitor_id, created_at);

CREATE TABLE IF NOT EXISTS upgrade_requests (
  id TEXT PRIMARY KEY, user_id TEXT, plan TEXT, created_at INTEGER
);
`);

try { db.exec('ALTER TABLE monitors ADD COLUMN last_start_at INTEGER'); } catch {}

export const now = () => Date.now();

// ---------- password hashing (scrypt, built-in) ----------
export function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}
export function verifyPassword(pw, saltHex, hashHex) {
  const salt = Buffer.from(saltHex, 'hex');
  const hash = Buffer.from(hashHex, 'hex');
  const test = scryptSync(pw, salt, 64);
  return hash.length === test.length && timingSafeEqual(hash, test);
}

// urlsafe token for ping URLs
export function newToken() {
  return randomBytes(18).toString('base64url'); // 24 chars, ~144 bits
}

// ---------- users ----------
export function createUser(email, password) {
  const { salt, hash } = hashPassword(password);
  const id = randomUUID();
  db.prepare('INSERT INTO users (id,email,pw_salt,pw_hash,plan,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, email.toLowerCase().trim(), salt, hash, 'free', now());
  return getUserById(id);
}
export const getUserByEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
export const getUserById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

// ---------- monitors ----------
export function createMonitor(userId, { name, period_seconds, grace_seconds, slack_webhook, alert_email }) {
  const id = randomUUID();
  const token = newToken();
  db.prepare(`INSERT INTO monitors
     (id,user_id,name,token,period_seconds,grace_seconds,status,slack_webhook,alert_email,created_at)
     VALUES (?,?,?,?,?,?,'new',?,?,?)`)
    .run(id, userId, name, token, period_seconds, grace_seconds, slack_webhook || null, alert_email || null, now());
  addEvent(id, 'created', 'Monitor created');
  return getMonitor(id);
}
export const getMonitor = (id) => db.prepare('SELECT * FROM monitors WHERE id = ?').get(id);
export const getMonitorForUser = (id, userId) =>
  db.prepare('SELECT * FROM monitors WHERE id = ? AND user_id = ?').get(id, userId);
export const getMonitorByToken = (token) =>
  db.prepare('SELECT * FROM monitors WHERE token = ?').get(token);
export const listMonitors = (userId) =>
  db.prepare('SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC').all(userId);
export const countMonitors = (userId) =>
  db.prepare('SELECT COUNT(*) c FROM monitors WHERE user_id = ?').get(userId).c;
export function updateMonitor(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const set = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE monitors SET ${set} WHERE id = ?`).run(...keys.map(k => fields[k]), id);
}
export const deleteMonitor = (id) => db.prepare('DELETE FROM monitors WHERE id = ?').run(id);

// ---------- events ----------
export function addEvent(monitorId, type, note) {
  db.prepare('INSERT INTO events (id,monitor_id,type,note,created_at) VALUES (?,?,?,?,?)')
    .run(randomUUID(), monitorId, type, note || null, now());
}
export const listEvents = (monitorId, limit = 50) =>
  db.prepare('SELECT * FROM events WHERE monitor_id = ? ORDER BY created_at DESC LIMIT ?').all(monitorId, limit);

export function recordUpgrade(userId, plan) {
  db.prepare('INSERT INTO upgrade_requests (id,user_id,plan,created_at) VALUES (?,?,?,?)')
    .run(randomUUID(), userId, plan, now());
}
