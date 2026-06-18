# mopp

**Mission-Oriented Protective Posture for AI-assisted work.**

English · [한국어](README.ko.md)

Scale your AI guardrails to the threat of the task. Like military MOPP scales
protective gear to a chemical threat, this scales tests, review gates, human
approval, isolation, and audit to the blast radius and security sensitivity of
what the agent is about to do. One dial, 0–4, controls stacking cumulatively —
and **deliberate de-escalation**, because holding maximum protection has a real
velocity cost.

Works in **Claude Code** and **Codex** (and any MCP-capable host) from a single
shared core.

## The levels

Cumulative — each level keeps all lower controls and adds a gear layer.

| Level | Gear | Dev face | Security face |
|---|---|---|---|
| 0 | base | full autonomy, branch only | none |
| 1 | overgarment | tests required, branch isolation | baseline secret scan |
| 2 | overboots | lint/typecheck gate, review | dependency audit, SAST |
| 3 | mask | approval on destructive ops, no force-push | egress confirm, audit log ON |
| 4 | gloves | worktree, dry-run, step confirm | least privilege, secrets out of context, rollback plan |

The **mask (level 3)** is where a human enters the loop. Below it the agent runs
on static gates; at 3+ a person approves the dangerous moves.

## When to use it

MOPP is for any session where the agent's actions carry uneven risk — most code
work does. Pick a posture by what you are about to touch, then de-escalate when
that work is done.

| Situation | Posture |
|---|---|
| Prototype, spike, scratch branch, throwaway | **0** |
| Day-to-day feature work on non-critical code | **1** |
| Shared libraries / common modules, code headed for a PR/merge | **2** |
| Destructive commands (`rm -rf`, `git reset --hard`, `DROP TABLE`), force-push, editing auth/crypto, outbound network calls | **3** |
| Production targets, DB migrations, deploys, security-critical core, anything touching secrets | **4** |

**When to invoke the tool, not just pick a number:**

- **Session start** — let the SessionStart hook (Claude Code) or `/mopp status`
  surface the current posture and any recommended bump.
- **Before a risky command** — run `mopp assess --command "<cmd>"`, then `set`.
  At MOPP 3+ the gate auto-evaluates every Bash command.
- **When the work changes character** — moving from "writing a feature" to
  "running the migration" is a posture change. Re-assess.
- **When the risky work is done** — `mopp down`. Holding MOPP 4 through routine
  edits just slows you down; that velocity cost is the whole reason the dial
  goes both ways.

Rule of thumb: **assess before, gate during, stand down after.**

## Layout

```
core/                 host-agnostic single source of truth
  doctrine.md         the model (levels, gear, decision authority)
  signals.json        threat signals, level thresholds, command gates
  bin/mopp            CLI: status | assess | set | down | gate | explain
mcp/                  MCP server exposing mopp_* tools to any MCP host
adapters/
  claude-code/        plugin.json, /mopp command, skills, PreToolUse + SessionStart hooks, statusline
  codex/              AGENTS.md, custom prompt, per-level profiles + MCP config
```

One-line model:
**MOPP level = (host-native permission/sandbox posture) + (shared control checklist run by `bin/mopp`).**

## Quick start

```bash
# assess the threat of a planned command
node core/bin/mopp assess --command "terraform apply"
# adopt the recommended posture (you decide — commander dictates)
node core/bin/mopp set 4 --reason "prod infra change"
# check a command against the posture (exit 0 allow / 1 confirm / 2 block)
node core/bin/mopp gate --command "git push --force"
# stand down when the risky work is done
node core/bin/mopp down
```

## Install — Claude Code

Point the plugin at `adapters/claude-code/` (it bundles the `/mopp` command,
the `mopp-doctrine` and `mopp-assess` skills, and PreToolUse + SessionStart
hooks). The hooks resolve the core binary via `$MOPP_BIN` or the monorepo
`core/`. Optionally wire the statusline:

```json
{ "statusLine": { "type": "command", "command": "node /abs/path/mopp/adapters/claude-code/statusline.js" } }
```

## Install — Codex

Merge `adapters/codex/config.snippet.toml` into `~/.codex/config.toml` (per-level
profiles + the `mopp` MCP server), copy `adapters/codex/AGENTS.md` guidance into
your project's `AGENTS.md`, and drop `adapters/codex/prompts/mopp.md` into
`~/.codex/prompts/`. Run Codex under the matching profile: `codex --profile mopp3`.

## Enforcement honesty

- **Claude Code** blocks/asks for real via the PreToolUse hook (deny / ask).
- **Codex** has no per-tool blocking hook; enforcement is its native sandbox +
  approval profile *plus* the agent self-gating with `mopp gate` per AGENTS.md.

## Documentation

- `core/doctrine.md` — the model: levels, gear, decision authority, military note
- [`docs/SKILLS.md`](docs/SKILLS.md) — skill specification (Claude Code skills + Codex prompt)

## Status

v0.1 — core CLI + gates tested; adapters scaffolded. MCP server needs
`npm install` in `mcp/`. Tune `core/signals.json` to your stack.
