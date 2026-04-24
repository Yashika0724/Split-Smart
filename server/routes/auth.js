const bcrypt = require('bcrypt');
const db = require('../db');
const {
  shortId,
  createSession,
  destroySession,
  sessionCookie,
  clearCookie,
  publicUser,
} = require('../auth');

const insertUser = db.prepare(
  'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
);
const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');

function register(router) {
  router.post('/api/auth/signup', async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.json(400, { error: 'email, password, and name are required' });
    }
    if (password.length < 6) {
      return res.json(400, { error: 'password must be at least 6 characters' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await findByEmail.get(cleanEmail);
    if (existing) return res.json(400, { error: 'email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const id = shortId();
    await insertUser.run(id, cleanEmail, String(name).trim(), hash, Date.now());

    const { token } = await createSession(id);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json(200, { user: { id, email: cleanEmail, name: String(name).trim() } });
  });

  router.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.json(400, { error: 'email and password are required' });
    }
    const row = await findByEmail.get(String(email).trim().toLowerCase());
    if (!row) return res.json(401, { error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.json(401, { error: 'invalid credentials' });

    const { token } = await createSession(row.id);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json(200, { user: publicUser(row) });
  });

  router.post('/api/auth/logout', async (req, res) => {
    await destroySession(req.sessionToken);
    res.setHeader('Set-Cookie', clearCookie());
    res.json(200, { ok: true });
  });

  router.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.json(200, { user: null });
    res.json(200, { user: req.user });
  });
}

module.exports = register;
