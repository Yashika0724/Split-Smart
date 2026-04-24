const crypto = require('crypto');
const db = require('./db');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const selectSession = db.prepare(
  `SELECT s.token, s.user_id, s.expires_at, u.id AS uid, u.email, u.name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
    WHERE s.token = ?`
);
const deleteSession = db.prepare('DELETE FROM sessions WHERE token = ?');
const insertSession = db.prepare(
  'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
);

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function shortId() {
  return crypto.randomBytes(8).toString('hex');
}

async function createSession(userId) {
  const token = randomToken(32);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await insertSession.run(token, userId, expiresAt);
  return { token, expiresAt };
}

async function destroySession(token) {
  if (token) await deleteSession.run(token);
}

function sessionCookie(token, maxAgeSec = 2592000) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secure}`;
}

function clearCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

async function attachUser(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.session;
  req.sessionToken = token || null;
  req.user = null;
  if (!token) return;
  const row = await selectSession.get(token);
  if (!row) return;
  if (row.expires_at < Date.now()) {
    await deleteSession.run(token);
    return;
  }
  req.user = { id: row.uid, email: row.email, name: row.name };
}

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name };
}

module.exports = {
  parseCookies,
  randomToken,
  shortId,
  createSession,
  destroySession,
  sessionCookie,
  clearCookie,
  attachUser,
  publicUser,
};
