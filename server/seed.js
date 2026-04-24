const bcrypt = require('bcrypt');
const db = require('./db');
const { shortId, randomToken } = require('./auth');

const countUsers = db.prepare('SELECT COUNT(*) AS n FROM users');
const insertUser = db.prepare(
  'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
);
const insertGroup = db.prepare(
  'INSERT INTO groups (id, name, emoji, join_token, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertMembership = db.prepare(
  'INSERT INTO memberships (group_id, user_id, joined_at) VALUES (?, ?, ?)'
);
const insertExpense = db.prepare(
  `INSERT INTO expenses (id, group_id, description, amount, paid_by, category, date)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insertSplit = db.prepare(
  'INSERT INTO splits (expense_id, user_id, amount) VALUES (?, ?, ?)'
);
const insertSettlement = db.prepare(
  `INSERT INTO settlements (id, group_id, from_user, to_user, amount, date)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertReminder = db.prepare(
  `INSERT INTO reminders (id, group_id, from_user, to_user, amount, tone, note, sent_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const DAY = 86400000;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function addExpense(groupId, desc, amount, paidBy, category, members, when) {
  const eid = shortId();
  insertExpense.run(eid, groupId, desc, round2(amount), paidBy, category, when);
  const share = round2(amount / members.length);
  members.forEach((uid, i) => {
    if (i === members.length - 1) {
      insertSplit.run(eid, uid, round2(amount - share * (members.length - 1)));
    } else {
      insertSplit.run(eid, uid, share);
    }
  });
}

async function seed() {
  const { n } = countUsers.get();
  if (n > 0) return;

  const hash = await bcrypt.hash('demo1234', 10);
  const now = Date.now();

  const u1 = shortId();
  const u2 = shortId();
  const u3 = shortId();
  const u4 = shortId();
  const u5 = shortId();

  const g1 = shortId(); // Goa Trip
  const g2 = shortId(); // Flat 402
  const g3 = shortId(); // Friday Coffee

  const run = db.transaction(() => {
    insertUser.run(u1, 'demo1@example.com', 'Aarav Sharma', hash, now);
    insertUser.run(u2, 'demo2@example.com', 'Ishita Patel', hash, now);
    insertUser.run(u3, 'demo3@example.com', 'Rohan Verma', hash, now);
    insertUser.run(u4, 'demo4@example.com', 'Priya Nair', hash, now);
    insertUser.run(u5, 'demo5@example.com', 'Kabir Mehta', hash, now);

    // Group 1: Goa Trip (all five)
    insertGroup.run(g1, 'Goa Trip', '🏖️', randomToken(8), u1, now - 20 * DAY);
    [u1, u2, u3, u4, u5].forEach((uid) => insertMembership.run(g1, uid, now - 20 * DAY));
    const goa = [u1, u2, u3, u4, u5];
    addExpense(g1, 'Flight tickets',     12000, u1, 'travel',    goa, now - 20 * DAY);
    addExpense(g1, 'Homestay booking',    9500, u2, 'travel',    goa, now - 19 * DAY);
    addExpense(g1, 'Beach shack dinner',  4800, u2, 'food',      goa, now - 17 * DAY);
    addExpense(g1, 'Scooter rental',      4500, u3, 'transport', goa, now - 16 * DAY);
    addExpense(g1, 'Club night',          3600, u5, 'fun',       goa, now - 15 * DAY);
    addExpense(g1, 'Feni tasting',        2100, u4, 'drinks',    goa, now - 14 * DAY);
    addExpense(g1, 'Cafe breakfast',      1250, u1, 'coffee',    goa, now - 13 * DAY);

    // Group 2: Flat 402 (Aarav, Ishita, Rohan)
    insertGroup.run(g2, 'Flat 402', '🏡', randomToken(8), u2, now - 60 * DAY);
    [u1, u2, u3].forEach((uid) => insertMembership.run(g2, uid, now - 60 * DAY));
    const flat = [u1, u2, u3];
    addExpense(g2, 'October electricity', 3600, u2, 'utilities', flat, now - 10 * DAY);
    addExpense(g2, 'Monthly groceries',   2700, u1, 'food',      flat, now - 8 * DAY);
    addExpense(g2, 'Water + maid',        1800, u3, 'home',      flat, now - 6 * DAY);
    addExpense(g2, 'Internet recharge',   1099, u2, 'utilities', flat, now - 4 * DAY);
    addExpense(g2, 'Gas cylinder',         950, u3, 'home',      flat, now - 2 * DAY);

    // Group 3: Friday Coffee (Aarav, Priya, Kabir)
    insertGroup.run(g3, 'Friday Coffee', '☕', randomToken(8), u1, now - 30 * DAY);
    [u1, u4, u5].forEach((uid) => insertMembership.run(g3, uid, now - 30 * DAY));
    const coffee = [u1, u4, u5];
    addExpense(g3, 'Blue Tokai',  540, u1, 'coffee', coffee, now - 21 * DAY);
    addExpense(g3, 'Third Wave',  420, u4, 'coffee', coffee, now - 14 * DAY);
    addExpense(g3, 'Subko',       600, u5, 'coffee', coffee, now - 7 * DAY);
    addExpense(g3, 'Araku filter', 480, u1, 'coffee', coffee, now - 1 * DAY);

    // Settlements (partial paybacks)
    insertSettlement.run(shortId(), g1, u3, u1, 900, now - 12 * DAY);
    insertSettlement.run(shortId(), g2, u1, u2, 500, now - 3 * DAY);

    // Reminders landing in demo1's inbox
    insertReminder.run(
      shortId(),
      g1,
      u2,
      u1,
      680,
      'casual',
      "Aarav, tiny reminder about the ₹680 for Goa Trip. cheers!",
      now - 2 * DAY
    );
    insertReminder.run(
      shortId(),
      g2,
      u3,
      u1,
      450,
      'gentle',
      "hey Aarav! no rush at all, but whenever you have a sec, there's ₹450 floating around from Flat 402. ♡",
      now - 1 * DAY
    );
  });
  run();
  console.log(
    '[seed] demo data inserted — 5 users across 3 groups (pw: demo1234)'
  );
}

module.exports = seed;
