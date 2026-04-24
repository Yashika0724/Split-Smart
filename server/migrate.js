require('./db');

function migrate() {
  // Schema is applied when db.js is loaded. This function exists for
  // callers that want to force initialization at a known point.
}

module.exports = migrate;
