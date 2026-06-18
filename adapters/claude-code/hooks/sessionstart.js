#!/usr/bin/env node
'use strict';
/*
 * MOPP SessionStart hook for Claude Code.
 * Surfaces the current posture (and a quick re-assessment) as additional
 * context so the session knows which gear it is wearing from the first turn.
 */
const { execFileSync } = require('node:child_process');
const { resolveMopp } = require('./lib.js');

const mopp = resolveMopp();
if (!mopp) process.exit(0);

function moppJson(args) {
  try { return JSON.parse(execFileSync('node', [mopp, ...args, '--json'], { encoding: 'utf8' })); }
  catch (_) { return null; }
}

const status = moppJson(['status']);
const assess = moppJson(['assess']);
if (!status) process.exit(0);

let ctx = `MOPP posture: level ${status.level} (set by ${status.setBy}). Controls active per mopp explain ${status.level}.`;
if (assess && assess.recommend > status.level) {
  ctx += ` Threat assessment recommends MOPP ${assess.recommend} (driver: ${assess.driver}); consider /mopp set ${assess.recommend}.`;
}
ctx += ' Run `/mopp gate <cmd>` before risky commands; `/mopp down` to de-escalate when risky work is done.';

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: ctx },
}));
process.exit(0);
