const http = require('http');
const { handle, ensureReady } = require('./app');

const PORT = Number(process.env.PORT) || 3001;

async function main() {
  await ensureReady();
  const server = http.createServer(handle);
  server.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
