const bcrypt = require('bcrypt');
const db = require('./db');
const { shortId, randomToken } = require('./auth');

const DAY = 86400000;

function round2(n) {
  return Math.round(n * 100) / 100;
}

const INSERT_USER = `INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`;
const INSERT_GROUP = `INSERT INTO groups (id, name, emoji, join_token, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
const INSERT_MEMBERSHIP = `INSERT INTO memberships (group_id, user_id, joined_at) VALUES (?, ?, ?)`;
const INSERT_EXPENSE = `INSERT INTO expenses (id, group_id, description, amount, paid_by, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
const INSERT_SPLIT = `INSERT INTO splits (expense_id, user_id, amount) VALUES (?, ?, ?)`;
const INSERT_SETTLEMENT = `INSERT INTO settlements (id, group_id, from_user, to_user, amount, date) VALUES (?, ?, ?, ?, ?, ?)`;
const INSERT_REMINDER = `INSERT INTO reminders (id, group_id, from_user, to_user, amount, tone, note, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

async function addExpense(run, groupId, desc, amount, paidBy, category, members, when) {
  const eid = shortId();
  await run(INSERT_EXPENSE, [eid, groupId, desc, round2(amount), paidBy, category, when]);
  const share = round2(amount / members.length);
  for (let i = 0; i < members.length; i++) {
    const uid = members[i];
    const amt =
      i === members.length - 1
        ? round2(amount - share * (members.length - 1))
        : share;
    await run(INSERT_SPLIT, [eid, uid, amt]);
  }
}

async function seed() {
  const countRes = await db.query('SELECT COUNT(*)::int AS n FROM users');
  if (countRes.rows[0].n > 0) return;

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

  await db.transaction(async (run) => {
    await run(INSERT_USER, [u1, 'demo1@example.com', 'Aarav Sharma', hash, now]);
    await run(INSERT_USER, [u2, 'demo2@example.com', 'Ishita Patel', hash, now]);
    await run(INSERT_USER, [u3, 'demo3@example.com', 'Rohan Verma', hash, now]);
    await run(INSERT_USER, [u4, 'demo4@example.com', 'Priya Nair', hash, now]);
    await run(INSERT_USER, [u5, 'demo5@example.com', 'Kabir Mehta', hash, now]);

    // Group 1: Goa Trip (all five)
    await run(INSERT_GROUP, [g1, 'Goa Trip', '🏖️', randomToken(8), u1, now - 20 * DAY]);
    for (const uid of [u1, u2, u3, u4, u5]) {
      await run(INSERT_MEMBERSHIP, [g1, uid, now - 20 * DAY]);
    }
    const goa = [u1, u2, u3, u4, u5];
    await addExpense(run, g1, 'Flight tickets',    12000, u1, 'travel',    goa, now - 20 * DAY);
    await addExpense(run, g1, 'Homestay booking',   9500, u2, 'travel',    goa, now - 19 * DAY);
    await addExpense(run, g1, 'Beach shack dinner', 4800, u2, 'food',      goa, now - 17 * DAY);
    await addExpense(run, g1, 'Scooter rental',     4500, u3, 'transport', goa, now - 16 * DAY);
    await addExpense(run, g1, 'Club night',         3600, u5, 'fun',       goa, now - 15 * DAY);
    await addExpense(run, g1, 'Feni tasting',       2100, u4, 'drinks',    goa, now - 14 * DAY);
    await addExpense(run, g1, 'Cafe breakfast',     1250, u1, 'coffee',    goa, now - 13 * DAY);

    // Group 2: Flat 402 (Aarav, Ishita, Rohan)
    await run(INSERT_GROUP, [g2, 'Flat 402', '🏡', randomToken(8), u2, now - 60 * DAY]);
    for (const uid of [u1, u2, u3]) {
      await run(INSERT_MEMBERSHIP, [g2, uid, now - 60 * DAY]);
    }
    const flat = [u1, u2, u3];
    await addExpense(run, g2, 'October electricity', 3600, u2, 'utilities', flat, now - 10 * DAY);
    await addExpense(run, g2, 'Monthly groceries',   2700, u1, 'food',      flat, now - 8 * DAY);
    await addExpense(run, g2, 'Water + maid',        1800, u3, 'home',      flat, now - 6 * DAY);
    await addExpense(run, g2, 'Internet recharge',   1099, u2, 'utilities', flat, now - 4 * DAY);
    await addExpense(run, g2, 'Gas cylinder',         950, u3, 'home',      flat, now - 2 * DAY);

    // Group 3: Friday Coffee (Aarav, Priya, Kabir)
    await run(INSERT_GROUP, [g3, 'Friday Coffee', '☕', randomToken(8), u1, now - 30 * DAY]);
    for (const uid of [u1, u4, u5]) {
      await run(INSERT_MEMBERSHIP, [g3, uid, now - 30 * DAY]);
    }
    const coffee = [u1, u4, u5];
    await addExpense(run, g3, 'Blue Tokai',   540, u1, 'coffee', coffee, now - 21 * DAY);
    await addExpense(run, g3, 'Third Wave',   420, u4, 'coffee', coffee, now - 14 * DAY);
    await addExpense(run, g3, 'Subko',        600, u5, 'coffee', coffee, now - 7 * DAY);
    await addExpense(run, g3, 'Araku filter', 480, u1, 'coffee', coffee, now - 1 * DAY);

    // Settlements (partial paybacks)
    await run(INSERT_SETTLEMENT, [shortId(), g1, u3, u1, 900, now - 12 * DAY]);
    await run(INSERT_SETTLEMENT, [shortId(), g2, u1, u2, 500, now - 3 * DAY]);

    // Reminders landing in demo1's inbox
    await run(INSERT_REMINDER, [
      shortId(),
      g1,
      u2,
      u1,
      680,
      'casual',
      "Aarav, tiny reminder about the ₹680 for Goa Trip. cheers!",
      now - 2 * DAY,
    ]);
    await run(INSERT_REMINDER, [
      shortId(),
      g2,
      u3,
      u1,
      450,
      'gentle',
      "hey Aarav! no rush at all, but whenever you have a sec, there's ₹450 floating around from Flat 402. ♡",
      now - 1 * DAY,
    ]);
  });

  console.log('[seed] demo data inserted — 5 users across 3 groups (pw: demo1234)');
}

module.exports = seed;
