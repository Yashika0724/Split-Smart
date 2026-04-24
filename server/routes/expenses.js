const db = require('../db');
const { shortId } = require('../auth');
const { round2 } = require('../balances');

const findExpense = db.prepare(
  'SELECT * FROM expenses WHERE id = ? AND group_id = ?'
);
const listExpenses = db.prepare(
  `SELECT e.id, e.description, e.amount, e.paid_by, e.category, e.date, u.name AS paid_by_name
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
    WHERE e.group_id = ?
    ORDER BY e.date DESC, e.id DESC`
);
const listMembers = db.prepare(
  'SELECT user_id FROM memberships WHERE group_id = ?'
);
const findGroupById = db.prepare('SELECT id FROM groups WHERE id = ?');
const isMember = db.prepare(
  'SELECT 1 FROM memberships WHERE group_id = ? AND user_id = ?'
);

const INSERT_EXPENSE = `INSERT INTO expenses (id, group_id, description, amount, paid_by, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
const UPDATE_EXPENSE = `UPDATE expenses SET description = ?, amount = ?, paid_by = ?, category = ?, date = ? WHERE id = ? AND group_id = ?`;
const DELETE_EXPENSE = `DELETE FROM expenses WHERE id = ? AND group_id = ?`;
const INSERT_SPLIT = `INSERT INTO splits (expense_id, user_id, amount) VALUES (?, ?, ?)`;
const DELETE_SPLITS_FOR = `DELETE FROM splits WHERE expense_id = ?`;

const CATEGORIES = new Set([
  'food',
  'home',
  'transport',
  'travel',
  'coffee',
  'drinks',
  'fun',
  'utilities',
  'other',
]);

async function validatePayload(body, groupId) {
  const { description, amount, paidBy, category, date } = body || {};
  const amt = Number(amount);
  if (!description || !String(description).trim()) {
    return { error: 'description is required' };
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    return { error: 'amount must be a positive number' };
  }
  if (!paidBy) return { error: 'paidBy is required' };
  if (!(await isMember.get(groupId, paidBy))) {
    return { error: 'paidBy must be a group member' };
  }
  const cat = category && CATEGORIES.has(category) ? category : 'other';
  const when = Number(date) || Date.now();
  return {
    description: String(description).trim(),
    amount: round2(amt),
    paidBy,
    category: cat,
    date: when,
  };
}

function buildShares(totalAmount, members) {
  const share = round2(totalAmount / members.length);
  return members.map((uid, i) => {
    if (i === members.length - 1) {
      return { user_id: uid, amount: round2(totalAmount - share * (members.length - 1)) };
    }
    return { user_id: uid, amount: share };
  });
}

function register(router) {
  router.get('/api/groups/:id/expenses', async (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = await findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await isMember.get(group.id, req.user.id))) {
      return res.json(403, { error: 'not a member of this group' });
    }
    res.json(200, { expenses: await listExpenses.all(group.id) });
  });

  router.post('/api/groups/:id/expenses', async (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = await findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await isMember.get(group.id, req.user.id))) {
      return res.json(403, { error: 'not a member of this group' });
    }

    const parsed = await validatePayload(req.body, group.id);
    if (parsed.error) return res.json(400, { error: parsed.error });

    const memberRows = await listMembers.all(group.id);
    const members = memberRows.map((m) => m.user_id);
    if (members.length === 0) {
      return res.json(400, { error: 'group has no members' });
    }

    const id = shortId();
    const shares = buildShares(parsed.amount, members);
    await db.transaction(async (run) => {
      await run(INSERT_EXPENSE, [
        id,
        group.id,
        parsed.description,
        parsed.amount,
        parsed.paidBy,
        parsed.category,
        parsed.date,
      ]);
      for (const s of shares) {
        await run(INSERT_SPLIT, [id, s.user_id, s.amount]);
      }
    });

    res.json(200, {
      expense: {
        id,
        group_id: group.id,
        description: parsed.description,
        amount: parsed.amount,
        paid_by: parsed.paidBy,
        category: parsed.category,
        date: parsed.date,
      },
    });
  });

  router.put('/api/groups/:id/expenses/:expenseId', async (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = await findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await isMember.get(group.id, req.user.id))) {
      return res.json(403, { error: 'not a member of this group' });
    }
    const existing = await findExpense.get(req.params.expenseId, group.id);
    if (!existing) return res.json(404, { error: 'expense not found' });

    const parsed = await validatePayload(req.body, group.id);
    if (parsed.error) return res.json(400, { error: parsed.error });

    const memberRows = await listMembers.all(group.id);
    const members = memberRows.map((m) => m.user_id);
    if (members.length === 0) {
      return res.json(400, { error: 'group has no members' });
    }
    const shares = buildShares(parsed.amount, members);

    await db.transaction(async (run) => {
      await run(UPDATE_EXPENSE, [
        parsed.description,
        parsed.amount,
        parsed.paidBy,
        parsed.category,
        parsed.date,
        existing.id,
        group.id,
      ]);
      await run(DELETE_SPLITS_FOR, [existing.id]);
      for (const s of shares) {
        await run(INSERT_SPLIT, [existing.id, s.user_id, s.amount]);
      }
    });

    res.json(200, {
      expense: {
        id: existing.id,
        group_id: group.id,
        description: parsed.description,
        amount: parsed.amount,
        paid_by: parsed.paidBy,
        category: parsed.category,
        date: parsed.date,
      },
    });
  });

  router.del('/api/groups/:id/expenses/:expenseId', async (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = await findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!(await isMember.get(group.id, req.user.id))) {
      return res.json(403, { error: 'not a member of this group' });
    }
    const existing = await findExpense.get(req.params.expenseId, group.id);
    if (!existing) return res.json(404, { error: 'expense not found' });

    await db.transaction(async (run) => {
      await run(DELETE_SPLITS_FOR, [existing.id]);
      await run(DELETE_EXPENSE, [existing.id, group.id]);
    });

    res.json(200, { ok: true });
  });
}

module.exports = register;
