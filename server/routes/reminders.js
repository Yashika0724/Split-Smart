const db = require('../db');
const { shortId } = require('../auth');
const { round2 } = require('../balances');

const insertReminder = db.prepare(
  `INSERT INTO reminders (id, group_id, from_user, to_user, amount, tone, note, sent_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const listInbox = db.prepare(
  `SELECT r.id, r.group_id, r.amount, r.tone, r.note, r.sent_at,
          u.id AS from_id, u.name AS from_name,
          g.name AS group_name, g.emoji AS group_emoji
     FROM reminders r
     JOIN users u ON u.id = r.from_user
     JOIN groups g ON g.id = r.group_id
    WHERE r.to_user = ?
    ORDER BY r.sent_at DESC
    LIMIT 200`
);
const listGroupReminders = db.prepare(
  `SELECT id, from_user, to_user, amount, tone, note, sent_at
     FROM reminders
    WHERE group_id = ?
    ORDER BY sent_at DESC`
);
const isMember = db.prepare(
  'SELECT 1 FROM memberships WHERE group_id = ? AND user_id = ?'
);
const findGroupById = db.prepare('SELECT id FROM groups WHERE id = ?');

const TONES = new Set(['gentle', 'casual', 'direct']);

function register(router) {
  router.post('/api/reminders', async (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const { groupId, toUser, amount, tone, note } = req.body || {};
    if (!groupId || !toUser) {
      return res.json(400, { error: 'groupId and toUser are required' });
    }
    const group = await findGroupById.get(groupId);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await isMember.get(group.id, req.user.id))) {
      return res.json(403, { error: 'not a member of this group' });
    }
    if (!(await isMember.get(group.id, toUser))) {
      return res.json(400, { error: 'recipient must be in the group' });
    }
    if (toUser === req.user.id) {
      return res.json(400, { error: "can't remind yourself" });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.json(400, { error: 'amount must be a positive number' });
    }
    const t = TONES.has(tone) ? tone : 'casual';
    const id = shortId();
    const now = Date.now();
    await insertReminder.run(
      id,
      group.id,
      req.user.id,
      toUser,
      round2(amt),
      t,
      note ? String(note).trim() : null,
      now
    );
    res.json(200, { reminder: { id, sent_at: now } });
  });

  router.get('/api/reminders/inbox', async (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const items = await listInbox.all(req.user.id);
    res.json(200, { reminders: items });
  });

  router.get('/api/groups/:id/reminders', async (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = await findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await isMember.get(group.id, req.user.id))) {
      return res.json(403, { error: 'not a member of this group' });
    }
    res.json(200, { reminders: await listGroupReminders.all(group.id) });
  });
}

module.exports = register;
