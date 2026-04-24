const { Pool, types } = require('pg');

// BIGINT (OID 20) — return as JS Number. Safe here because every BIGINT column
// stores Date.now()-style millisecond timestamps, well under 2^53.
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'POSTGRES_URL is not set. Add a Vercel Postgres integration or set DATABASE_URL locally.'
  );
}

const pool = new Pool({
  connectionString,
  max: 1,
  ssl: { rejectUnauthorized: false },
});

function toPg(text) {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

function prepare(text) {
  const sql = toPg(text);
  return {
    async get(...params) {
      const { rows } = await pool.query(sql, params);
      return rows[0];
    },
    async all(...params) {
      const { rows } = await pool.query(sql, params);
      return rows;
    },
    async run(...params) {
      await pool.query(sql, params);
    },
  };
}

async function transaction(fn) {
  const client = await pool.connect();
  const run = (text, params = []) => client.query(toPg(text), params);
  try {
    await client.query('BEGIN');
    await fn(run);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function query(text, params = []) {
  return pool.query(toPg(text), params);
}

module.exports = { pool, prepare, transaction, query };
