const db = require('./db');

const selectExpenses = db.prepare('SELECT id, paid_by, amount FROM expenses WHERE group_id = ?');
const selectSplits = db.prepare(
  `SELECT s.user_id, s.amount
     FROM splits s
     JOIN expenses e ON e.id = s.expense_id
    WHERE e.group_id = ?`
);
const selectSettlements = db.prepare(
  'SELECT from_user, to_user, amount FROM settlements WHERE group_id = ?'
);
const selectMembers = db.prepare(
  `SELECT u.id FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.group_id = ?`
);

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function computeBalances(groupId) {
  const [memberRows, expenseRows, splitRows, settlementRows] = await Promise.all([
    selectMembers.all(groupId),
    selectExpenses.all(groupId),
    selectSplits.all(groupId),
    selectSettlements.all(groupId),
  ]);

  const balances = {};
  for (const r of memberRows) balances[r.id] = 0;

  for (const e of expenseRows) {
    if (balances[e.paid_by] === undefined) balances[e.paid_by] = 0;
    balances[e.paid_by] += e.amount;
  }
  for (const s of splitRows) {
    if (balances[s.user_id] === undefined) balances[s.user_id] = 0;
    balances[s.user_id] -= s.amount;
  }
  for (const st of settlementRows) {
    if (balances[st.from_user] === undefined) balances[st.from_user] = 0;
    if (balances[st.to_user] === undefined) balances[st.to_user] = 0;
    balances[st.from_user] += st.amount;
    balances[st.to_user] -= st.amount;
  }

  for (const k of Object.keys(balances)) balances[k] = round2(balances[k]);

  return balances;
}

function simplifyDebts(balances) {
  const creditors = [];
  const debtors = [];
  for (const [id, amt] of Object.entries(balances)) {
    if (amt > 0.009) creditors.push({ id, amt });
    else if (amt < -0.009) debtors.push({ id, amt: -amt });
  }
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const payments = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    const rounded = round2(pay);
    if (rounded > 0) {
      payments.push({ from: debtors[i].id, to: creditors[j].id, amount: rounded });
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.009) i++;
    if (creditors[j].amt < 0.009) j++;
  }

  return payments;
}

module.exports = { computeBalances, simplifyDebts, round2 };
