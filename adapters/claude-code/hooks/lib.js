'use strict';
// Shared helpers for MOPP Claude Code hooks. Resolves the core binary across
// both the monorepo layout and a bundled-plugin layout, with MOPP_BIN override.
const fs = require('node:fs');
const path = require('node:path');

function resolveMopp() {
  const candidates = [
    process.env.MOPP_BIN,
    path.join(__dirname, '..', 'core', 'bin', 'mopp'),          // core bundled into the plugin
    path.join(__dirname, '..', '..', '..', 'core', 'bin', 'mopp'), // monorepo: repo-root/core
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (_) {
    return '';
  }
}

module.exports = { resolveMopp, readStdin };
