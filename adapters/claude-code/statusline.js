#!/usr/bin/env node
'use strict';
/*
 * MOPP statusline for Claude Code. Wire it in settings.json:
 *   "statusLine": { "type": "command", "command": "node /abs/path/adapters/claude-code/statusline.js" }
 * Prints one line, e.g.:  MOPP 3 ▮▮▮▯ [dev sec]
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function resolveMopp() {
  const c = [
    process.env.MOPP_BIN,
    path.join(__dirname, 'core', 'bin', 'mopp'),
    path.join(__dirname, '..', '..', 'core', 'bin', 'mopp'),
  ].filter(Boolean);
  for (const p of c) if (fs.existsSync(p)) return p;
  return null;
}

const mopp = resolveMopp();
if (!mopp) { process.stdout.write('MOPP ?'); process.exit(0); }

try {
  const s = JSON.parse(execFileSync('node', [mopp, 'status', '--json'], { encoding: 'utf8' }));
  const bar = '▮'.repeat(s.level) + '▯'.repeat(4 - s.level);
  const threat = s.threat ? ` [dev:${s.threat.dev} sec:${s.threat.sec}]` : '';
  process.stdout.write(`MOPP ${s.level} ${bar}${threat}`);
} catch (_) {
  process.stdout.write('MOPP ?');
}
