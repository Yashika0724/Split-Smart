const db = require('../db');
const { shortId, randomToken } = require('../auth');
const { computeBalances, simplifyDebts } = require('../balances');

const deleteMembership = db.prepare(
  'DELETE FROM memberships WHERE group_id = ? AND user_id = ?'
);
const findUser = db.prepare(
  'SELECT id, name FROM users WHERE id = ?'
);

const listUserGroups = db.prepare(
  `SELECT g.id, g.name, g.emoji, g.created_at
     FROM groups g
     JOIN memberships m ON m.group_id = g.id
    WHERE m.user_id = ?
    ORDER BY g.created_at DESC`
);
const findGroupById = db.prepare('SELECT * FROM groups WHERE id = ?');
const findGroupByToken = db.prepare('SELECT * FROM groups WHERE join_token = ?');
const listMembers = db.prepare(
  `SELECT u.id, u.name, u.email, m.joined_at
     FROM memberships m
     JOIN users u ON u.id = m.user_id
    WHERE m.group_id = ?
    ORDER BY m.joined_at ASC`
);
const isMember = db.prepare(
  'SELECT 1 FROM memberships WHERE group_id = ? AND user_id = ?'
);

function requireAuth(req, res) {
  if (!req.user) {
    res.json(401, { error: 'not authenticated' });
    return false;
  }
  return true;
}

async function requireMember(req, res, groupId) {
  if (!(await isMember.get(groupId, req.user.id))) {
    res.json(403, { error: 'not a member of this group' });
    return false;
  }
  return true;
}

function register(router) {
  router.get('/api/groups', async (req, res) => {
    if (!requireAuth(req, res)) return;
    const groups = await listUserGroups.all(req.user.id);
    res.json(200, { groups });
  });

  router.post('/api/groups', async (req, res) => {
    if (!requireAuth(req, res)) return;
    const { name, emoji } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.json(400, { error: 'name is required' });
    }
    const id = shortId();
    const joinToken = randomToken(8);
    const now = Date.now();
    const cleanName = String(name).trim();
    const cleanEmoji = emoji || null;

    await db.transaction(async (run) => {
      await run(
        'INSERT INTO groups (id, name, emoji, join_token, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, cleanName, cleanEmoji, joinToken, req.user.id, now]
      );
      await run(
        'INSERT INTO memberships (group_id, user_id, joined_at) VALUES (?, ?, ?)',
        [id, req.user.id, now]
      );
    });

    res.json(200, {
      group: {
        id,
        name: cleanName,
        emoji: cleanEmoji,
        join_token: joinToken,
      },
    });
  });

  router.get('/api/groups/:id', async (req, res) => {
    if (!requireAuth(req, res)) return;
    const group = await findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await requireMember(req, res, group.id))) return;
    const members = await listMembers.all(group.id);
    res.json(200, {
      group: {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        join_token: group.join_token,
        created_at: group.created_at,
        created_by: group.created_by,
      },
      members,
    });
  });

  router.get('/api/groups/:id/balances', async (req, res) => {
    if (!requireAuth(req, res)) return;
    const group = await findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await requireMember(req, res, group.id))) return;
    const balances = await computeBalances(group.id);
    const payments = simplifyDebts(balances);
    res.json(200, { balances, payments });
  });

  router.del('/api/groups/:id/members/:userId', async (req, res) => {
    if (!requireAuth(req, res)) return;
    const group = await findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await requireMember(req, res, group.id))) return;

    const targetId = req.params.userId;
    const target = await findUser.get(targetId);
    if (!target) return res.json(404, { error: 'user not found' });
    if (!(await isMember.get(group.id, targetId))) {
      return res.json(404, { error: 'user is not in this group' });
    }

    const isSelf = targetId === req.user.id;
    const isCreator = req.user.id === group.created_by;
    if (!isSelf && !isCreator) {
      return res.json(403, { error: 'only the group creator can remove other members' });
    }

    const balances = await computeBalances(group.id);
    const balance = balances[targetId] || 0;
    if (Math.abs(balance) > 0.01) {
      return res.json(400, {
        error: isSelf
          ? 'settle your balance before leaving'
          : `${target.name} still has an outstanding balance — settle up first`,
        balance,
      });
    }

    await deleteMembership.run(group.id, targetId);
    res.json(200, { ok: true });
  });

  router.post('/api/groups/join', async (req, res) => {
    if (!requireAuth(req, res)) return;
    const { token } = req.body || {};
    if (!token) return res.json(400, { error: 'token is required' });
    const group = await findGroupByToken.get(String(token));
    if (!group) return res.json(404, { error: 'invalid join link' });
    await db.query(
      'INSERT INTO memberships (group_id, user_id, joined_at) VALUES (?, ?, ?) ON CONFLICT (group_id, user_id) DO NOTHING',
      [group.id, req.user.id, Date.now()]
    );
    res.json(200, { group: { id: group.id, name: group.name, emoji: group.emoji } });
  });
}

module.exports = { register, isMember, findGroupById, listMembers };
