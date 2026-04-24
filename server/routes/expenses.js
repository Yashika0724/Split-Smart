const db = require('../db');
const { shortId } = require('../auth');
const { round2 } = require('../balances');

const insertExpense = db.prepare(
  `INSERT INTO expenses (id, group_id, description, amount, paid_by, category, date)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const updateExpense = db.prepare(
  `UPDATE expenses
      SET description = ?, amount = ?, paid_by = ?, category = ?, date = ?
    WHERE id = ? AND group_id = ?`
);
const deleteExpense = db.prepare(
  'DELETE FROM expenses WHERE id = ? AND group_id = ?'
);
const insertSplit = db.prepare(
  'INSERT INTO splits (expense_id, user_id, amount) VALUES (?, ?, ?)'
);
const deleteSplitsFor = db.prepare(
  'DELETE FROM splits WHERE expense_id = ?'
);
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

function validatePayload(body, groupId) {
  const { description, amount, paidBy, category, date } = body || {};
  const amt = Number(amount);
  if (!description || !String(description).trim()) {
    return { error: 'description is required' };
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    return { error: 'amount must be a positive number' };
  }
  if (!paidBy) return { error: 'paidBy is required' };
  if (!isMember.get(groupId, paidBy)) {
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
  router.get('/api/groups/:id/expenses', (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!isMember.get(group.id, req.user.id)) {
      return res.json(403, { error: 'not a member of this group' });
    }
    res.json(200, { expenses: listExpenses.all(group.id) });
  });

  router.post('/api/groups/:id/expenses', (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!isMember.get(group.id, req.user.id)) {
      return res.json(403, { error: 'not a member of this group' });
    }

    const parsed = validatePayload(req.body, group.id);
    if (parsed.error) return res.json(400, { error: parsed.error });

    const members = listMembers.all(group.id).map((m) => m.user_id);
    if (members.length === 0) {
      return res.json(400, { error: 'group has no members' });
    }

    const id = shortId();
    const shares = buildShares(parsed.amount, members);
    const run = db.transaction(() => {
      insertExpense.run(
        id,
        group.id,
        parsed.description,
        parsed.amount,
        parsed.paidBy,
        parsed.category,
        parsed.date
      );
      for (const s of shares) insertSplit.run(id, s.user_id, s.amount);
    });
    run();

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

  router.put('/api/groups/:id/expenses/:expenseId', (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!isMember.get(group.id, req.user.id)) {
      return res.json(403, { error: 'not a member of this group' });
    }
    const existing = findExpense.get(req.params.expenseId, group.id);
    if (!existing) return res.json(404, { error: 'expense not found' });

    const parsed = validatePayload(req.body, group.id);
    if (parsed.error) return res.json(400, { error: parsed.error });

    const members = listMembers.all(group.id).map((m) => m.user_id);
    if (members.length === 0) {
      return res.json(400, { error: 'group has no members' });
    }
    const shares = buildShares(parsed.amount, members);

    const run = db.transaction(() => {
      updateExpense.run(
        parsed.description,
        parsed.amount,
        parsed.paidBy,
        parsed.category,
        parsed.date,
        existing.id,
        group.id
      );
      deleteSplitsFor.run(existing.id);
      for (const s of shares) insertSplit.run(existing.id, s.user_id, s.amount);
    });
    run();

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

  router.del('/api/groups/:id/expenses/:expenseId', (req, res) => {
    if (!req.user) return res.json(401, { error: 'not authenticated' });
    const group = findGroupById.get(req.params.id);
    if (!group) return res.json(404, { error: 'group not found' });
    if (!isMember.get(group.id, req.user.id)) {
      return res.json(403, { error: 'not a member of this group' });
    }
    const existing = findExpense.get(req.params.expenseId, group.id);
    if (!existing) return res.json(404, { error: 'expense not found' });

    const run = db.transaction(() => {
      deleteSplitsFor.run(existing.id);
      deleteExpense.run(existing.id, group.id);
    });
    run();

    res.json(200, { ok: true });
  });
}

module.exports = register;
