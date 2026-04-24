const fs = require('fs');
const path = require('path');

const migrate = require('./migrate');
const seed = require('./seed');
const createRouter = require('./router');
const { attachUser } = require('./auth');

const registerAuth = require('./routes/auth');
const groupsModule = require('./routes/groups');
const registerExpenses = require('./routes/expenses');
const registerSettlements = require('./routes/settlements');
const registerReminders = require('./routes/reminders');

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function enhanceResponse(res) {
  res.json = (status, payload) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };
  return res;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function safeJoin(base, target) {
  const resolved = path.normalize(path.join(base, target));
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function getPathname(reqUrl) {
  const qIdx = reqUrl.indexOf('?');
  return qIdx === -1 ? reqUrl : reqUrl.slice(0, qIdx);
}

function serveStatic(req, res) {
  let rel;
  try {
    rel = decodeURIComponent(getPathname(req.url) || '/');
  } catch {
    rel = '/';
  }
  if (rel === '/') rel = '/index.html';
  const filePath = safeJoin(CLIENT_DIST, rel);
  if (!filePath) {
    res.statusCode = 400;
    res.end('bad path');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      const indexPath = path.join(CLIENT_DIST, 'index.html');
      fs.readFile(indexPath, (e2, data) => {
        if (e2) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', MIME['.html']);
        res.end(data);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  });
}

let readyPromise = null;
let router = null;

function ensureReady() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await migrate();
    await seed();

    const r = createRouter();
    r.get('/api/health', (req, res) => res.json(200, { ok: true }));
    registerAuth(r);
    groupsModule.register(r);
    registerExpenses(r);
    registerSettlements(r);
    registerReminders(r);
    router = r;
  })();
  return readyPromise;
}

async function handle(req, res) {
  enhanceResponse(res);
  await ensureReady();

  const pathname = getPathname(req.url);

  if (!pathname.startsWith('/api/')) {
    return serveStatic(req, res);
  }

  try {
    await attachUser(req);
  } catch (err) {
    console.error(err);
    return res.json(500, { error: 'auth lookup failed' });
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (req.body === undefined || req.body === null) {
      try {
        req.body = await readJsonBody(req);
      } catch (err) {
        return res.json(400, { error: 'invalid JSON body' });
      }
    }
  } else {
    req.body = {};
  }

  const match = router.match(req.method, req.url);
  if (!match) return res.json(404, { error: 'not found' });
  req.params = match.params;
  try {
    await match.handler(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.json(500, { error: 'internal error' });
  }
}

module.exports = { handle, ensureReady };
