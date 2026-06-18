#!/usr/bin/env node
/*
 * MOPP MCP server — the true cross-host surface. Both Claude Code and Codex
 * speak MCP, so this exposes posture as tools either host can call. It is a
 * thin wrapper: all logic lives in core/bin/mopp; this shells out with --json.
 *
 * Tools:
 *   mopp_status                read current posture
 *   mopp_assess  {command?}    recommend a posture from signals
 *   mopp_set     {level, reason?}  adopt a posture
 *   mopp_gate    {command}     evaluate a command against current posture
 *
 * Run: node mcp/server.js   (after `npm install` in this dir)
 * Register: see the adapters directory for host config.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOPP = join(HERE, '..', 'core', 'bin', 'mopp');

function run(args) {
  const cwd = process.env.MOPP_CWD || process.cwd();
  try {
    const stdout = execFileSync('node', [MOPP, ...args, '--json'], { cwd, encoding: 'utf8' });
    return { ok: true, data: stdout.trim() ? JSON.parse(stdout) : null };
  } catch (e) {
    // gate exits non-zero by design (1 confirm, 2 block); capture stdout anyway
    const stdout = (e.stdout || '').toString().trim();
    if (stdout) { try { return { ok: true, data: JSON.parse(stdout), exitCode: e.status }; } catch (_) {} }
    return { ok: false, error: (e.stderr || e.message || '').toString() };
  }
}

const TOOLS = [
  { name: 'mopp_status', description: 'Read the current MOPP protective posture (level 0-4) for the working tree.', inputSchema: { type: 'object', properties: {} } },
  { name: 'mopp_assess', description: 'Recommend a MOPP posture from repo + (optional) command threat signals. Does not change posture.', inputSchema: { type: 'object', properties: { command: { type: 'string', description: 'a proposed shell command to factor into the assessment' } } } },
  { name: 'mopp_set', description: 'Adopt a MOPP posture (0-4). The human/operator decides; agents should call mopp_assess first and confirm before setting.', inputSchema: { type: 'object', properties: { level: { type: 'integer', minimum: 0, maximum: 4 }, reason: { type: 'string' } }, required: ['level'] } },
  { name: 'mopp_gate', description: 'Evaluate a shell command against the current posture. Returns allow | confirm | block. Call this before running risky commands.', inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
];

const server = new Server({ name: 'mopp', version: '0.1.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  let res;
  switch (name) {
    case 'mopp_status': res = run(['status']); break;
    case 'mopp_assess': res = run(['assess', ...(args.command ? ['--command', args.command] : [])]); break;
    case 'mopp_set': res = run(['set', String(args.level), ...(args.reason ? ['--reason', args.reason] : [])]); break;
    case 'mopp_gate': res = run(['gate', '--command', args.command || '']); break;
    default: return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(res.data ?? { error: res.error }, null, 2) }],
    isError: !res.ok,
  };
});

await server.connect(new StdioServerTransport());
