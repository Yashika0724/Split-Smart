# Split Smart

A group expense splitter with IOU tracking and in-app reminders. Cream, forest, and
terracotta. SQLite underneath, no ORM, and a server built on Node's `http` module.

## Stack

- **Client:** Vite + React (JS), plain CSS Modules, `react-router-dom`, `qrcode.react`, `lucide-react`
- **Server:** Node `http` + a tiny hand-rolled router
- **DB:** SQLite via `better-sqlite3`, prepared statements, raw SQL
- **Auth:** `bcrypt` hashes + session tokens in a `sessions` table, httpOnly cookies

## Run it locally

You need Node 18+ and npm.

```bash
# one-time install (both packages)
npm install

# in one terminal: API server on :3001
node server/server.js

# in another terminal: Vite dev server on :5173
cd client && npm run dev
```

Open http://localhost:5173 and sign in with the seeded account:

```
demo1@example.com / demo1234
demo2@example.com / demo1234
```

Both demo accounts share a group called **Demo Trip** with a visible balance.

## Single-service production run

The root `npm start` runs the Node server, which serves `/api/*` and the compiled
client from `client/dist/` for everything else.

```bash
npm run build
npm start
# open http://localhost:3001
```

## Deploy to Render

`render.yaml` defines a single web service with a mounted disk at `/data`. The
database path is controlled by `DB_PATH` (defaults to `./server/data/data.db`
locally, `/data/data.db` in production). Cookies set the `Secure` flag when
`NODE_ENV=production`.

## Layout

```
client/                Vite React app (pages, components, styles)
server/
  server.js            http.createServer, static + API
  router.js            tiny URL pattern matcher
  db.js                opens SQLite, applies schema
  schema.sql           CREATE TABLE statements
  auth.js              cookie parsing, session helpers
  balances.js          balance math + greedy debt simplification
  routes/              auth, groups, expenses, settlements, reminders
  seed.js              inserts demo accounts on first boot
render.yaml            Render web service config
```

## What's implemented

- Email + password signup / login / logout, bcrypt hashes, 30-day session cookies
- Groups (create, list, view), shareable join link + QR code, `/join/:token`
  handler with sessionStorage stash so the link survives through signup
- Expenses split equally across current members, with category icons
- Per-member balance with a greedy debt-simplification pass to the smallest
  set of payments
- Settle-up modal (records a settlement row, balances recompute on next read)
- Reminders with three tone templates (gentle, casual, direct), an editable
  note, a "last nudged Xd ago" indicator, and an inbox page for the recipient
- Seeded demo data so the app works the moment it boots

## Notes

- All mutating routes run inside `db.transaction()` where they touch multiple tables
- JSON bodies are parsed by a small stream collector; cookies by a `; ` split
- Passwords are never returned; a `publicUser()` helper strips the hash
- The client `api.js` wraps `fetch` with `credentials: 'include'` on every call
