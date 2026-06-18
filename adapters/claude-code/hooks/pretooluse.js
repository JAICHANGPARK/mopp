#!/usr/bin/env node
'use strict';
/*
 * MOPP PreToolUse hook for Claude Code (Bash matcher).
 * Reads the tool call on stdin, asks `mopp gate` whether the command is allowed
 * at the current posture, and emits a permission decision:
 *   block   -> deny   (tool is refused, reason fed back to Claude)
 *   confirm -> ask    (user is prompted to approve)
 *   allow   -> exit 0 silently (normal flow)
 * Fails open: if the core binary or input is missing, allow (never wedge a session).
 */
const { execFileSync } = require('node:child_process');
const { resolveMopp, readStdin } = require('./lib.js');

function decide(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

let payload = {};
try { payload = JSON.parse(readStdin() || '{}'); } catch (_) {}
const command = payload && payload.tool_input && payload.tool_input.command;
const mopp = resolveMopp();
if (!command || !mopp) process.exit(0); // fail open

let res;
try {
  const stdout = execFileSync('node', [mopp, 'gate', '--command', command, '--json'], { encoding: 'utf8' });
  res = JSON.parse(stdout);
} catch (e) {
  const stdout = (e.stdout || '').toString().trim(); // gate exits 1/2 by design
  if (stdout) { try { res = JSON.parse(stdout); } catch (_) {} }
}
if (!res || !res.verdict) process.exit(0); // fail open

const tag = `[MOPP ${res.level}] `;
if (res.verdict.action === 'block') decide('deny', tag + res.verdict.msg);
if (res.verdict.action === 'confirm') decide('ask', tag + res.verdict.msg);
process.exit(0); // allow
