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

# emergency ("gas gas gas"): reactive jump straight to max containment (alpha)
node core/bin/mopp gas
# sound the all-clear: re-assess and drop to the warranted level
node core/bin/mopp all-clear
```

## Installation & Integration

### 1. Claude Code
Point the plugin at `adapters/claude-code/` (it bundles the `/mopp` command, the `mopp-doctrine` and `mopp-assess` skills, and PreToolUse + SessionStart hooks).
Optionally wire the statusline by adding this to your `settings.json`:
```json
{ 
  "statusLine": { 
    "type": "command", 
    "command": "node /ABS/PATH/TO/mopp/adapters/claude-code/statusline.js" 
  } 
}
```

### 2. Codex
1. Merge `adapters/codex/config.snippet.toml` into `~/.codex/config.toml` (defines per-level profiles + the `mopp` MCP server).
2. Copy `adapters/codex/AGENTS.md` guidance into your project's `AGENTS.md`.
3. Drop `adapters/codex/prompts/mopp.md` into `~/.codex/prompts/`.
4. Run Codex under the matching profile: `codex --profile mopp3`.

### 3. Google Antigravity (Agent Plugin & SDK)

#### A. Global Agent Plugin Registration
To make MOPP skills (`mopp-assess`, `mopp-doctrine`) available across all workspaces and agent sessions, deploy it to the global plugin directory:
1. Create and populate the global plugin directory under `~/.gemini/config/plugins/mopp`:
   ```bash
   # Create directories
   mkdir -p ~/.gemini/config/plugins/mopp/skills/mopp-assess
   mkdir -p ~/.gemini/config/plugins/mopp/skills/mopp-doctrine
   mkdir -p ~/.gemini/config/plugins/mopp/core/bin
   
   # Copy files and grant executable permissions
   cp core/bin/mopp ~/.gemini/config/plugins/mopp/core/bin/mopp
   cp core/signals.json ~/.gemini/config/plugins/mopp/core/signals.json
   cp core/doctrine.md ~/.gemini/config/plugins/mopp/core/doctrine.md
   cp adapters/claude-code/.claude-plugin/plugin.json ~/.gemini/config/plugins/mopp/plugin.json
   cp adapters/claude-code/skills/mopp-assess/SKILL.md ~/.gemini/config/plugins/mopp/skills/mopp-assess/SKILL.md
   cp adapters/claude-code/skills/mopp-doctrine/SKILL.md ~/.gemini/config/plugins/mopp/skills/mopp-doctrine/SKILL.md
   chmod +x ~/.gemini/config/plugins/mopp/core/bin/mopp
   ```
2. The agent will automatically recognize the `mopp-assess` and `mopp-doctrine` skills on reload.

#### B. Google Antigravity Python SDK Integration
Integrate MOPP gates into autonomous Python agents to validate shell commands dynamically during tool execution.
1. Copy the [mopp.py](adapters/antigravity/mopp.py) adapter module into your agent project's codebase.
2. Register the `mopp_pre_tool_hook` when initializing the `LocalAgentConfig` object:
   ```python
   from google.antigravity import Agent, LocalAgentConfig
   from adapters.antigravity.mopp import mopp_pre_tool_hook

   config = LocalAgentConfig(
       system_instructions="You are an autonomous engineering agent.",
       hooks=[mopp_pre_tool_hook]  # Automatically runs MOPP gates before shell commands
   )
   ```

---

## Enforcement Honesty

- **Claude Code**: Intercepts commands pre-execution via the `PreToolUse` hook to physically deny (`deny`) or ask for approval (`ask`).
- **Codex**: Has no per-tool hook; enforcement relies on native sandboxing (e.g. `read-only`) combined with the agent self-gating via `mopp gate` as specified in `AGENTS.md`.
- **Antigravity SDK**: Intercepts tool calls via the `pre_tool_call_decide` lifecycle hook, canceling unsafe calls before they run.


## Documentation

- `core/doctrine.md` — the model: levels, gear, decision authority, military note
- [`docs/SKILLS.md`](docs/SKILLS.md) — skill specification (Claude Code skills + Codex prompt)

## Status

v0.1 — core CLI + gates tested; adapters scaffolded. MCP server needs
`npm install` in `mcp/`. Tune `core/signals.json` to your stack.
