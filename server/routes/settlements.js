const db = require('../db');
const { shortId } = require('../auth');
const { round2 } = require('../balances');

const insertSettlement = db.prepare(
  `INSERT INTO settlements (id, group_id, from_user, to_user, amount, date)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const listSettlements = db.prepare(
  `SELECT s.id, s.from_user, s.to_user, s.amount, s.date,
          uf.name AS from_name, ut.name AS to_name
     FROM settlements s
     JOIN users uf ON uf.id = s.from_user
     JOIN users ut ON ut.id = s.to_user
    WHERE s.group_id = ?
    ORDER BY s.date DESC`
);
const isMember = db.prepare(
  'SELECT 1 FROM memberships WHERE group_id = ? AND user_id = ?'
);
const findGroupById = db.prepare('SELECT id FROM groups WHERE id = ?');

function register(router) {
  router.get('/api/groups/:id/settlements', (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!isMember.get(group.id, req.user.id)) {
      return res.json(403, { error: 'not a member of this group' });
    }
    res.json(200, { settlements: listSettlements.all(group.id) });
  });

  router.post('/api/groups/:id/settlements', (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!isMember.get(group.id, req.user.id)) {
      return res.json(403, { error: 'not a member of this group' });
    }
    const { fromUser, toUser, amount } = req.body || {};
    const amt = Number(amount);
    if (!fromUser || !toUser) {
      return res.json(400, { error: 'fromUser and toUser are required' });
    }
    if (fromUser === toUser) {
      return res.json(400, { error: 'fromUser and toUser must be different' });
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.json(400, { error: 'amount must be a positive number' });
    }
    if (!isMember.get(group.id, fromUser) || !isMember.get(group.id, toUser)) {
      return res.json(400, { error: 'both users must be in the group' });
    }
    const id = shortId();
    insertSettlement.run(id, group.id, fromUser, toUser, round2(amt), Date.now());
    res.json(200, {
      settlement: {
        id,
        group_id: group.id,
        from_user: fromUser,
        to_user: toUser,
        amount: round2(amt),
        date: Date.now(),
      },
    });
  });
}

module.exports = register;
