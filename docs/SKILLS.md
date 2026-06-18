# MOPP skill specification

[English](SKILLS.md) · [한국어](SKILLS.ko.md)

The agent-facing layer of MOPP. Skills are how a coding agent *knows when and how*
to use the posture system; the `bin/mopp` CLI is the engine they drive, and the
hooks are the enforcement underneath.

```
skill / prompt   ── agent-facing: when + how (this doc)
   │ drives
bin/mopp CLI      ── engine: assess / set / gate / explain
   │ enforced by
hooks + profiles  ── host-native: PreToolUse (CC), sandbox+approval (Codex)
```

Skills are **host-specific in form, shared in substance**. Claude Code has native
Skills (`SKILL.md` with frontmatter, auto-invoked by description match). Codex has
no Skills system, so the same intent ships as a custom prompt. Both read the same
truth from `core/doctrine.md` and call the same `core/bin/mopp`.

## Inventory

| ID | Host | Form | Purpose |
|---|---|---|---|
| `mopp-doctrine` | Claude Code | `SKILL.md` | Explain the model — levels, gear, controls |
| `mopp-assess` | Claude Code | `SKILL.md` | Workflow: assess threat → set posture → gate → de-escalate |
| `/mopp` (Codex) | Codex | prompt | Codex-side equivalent of status + assess + set |

---

## `mopp-doctrine` (Claude Code)

- **File:** `adapters/claude-code/skills/mopp-doctrine/SKILL.md`
- **Type:** knowledge skill (explains; does not change state)
- **Trigger (description):** the user asks what MOPP is, how the levels map to
  guardrails, or which controls apply at a given level.
- **Behavior:** summarizes the model from `core/doctrine.md` (cumulative levels,
  two-face control stack, mask=human-in-loop at L3, commander-dictates). Points
  to `mopp explain <0-4>` for the runtime checklist.
- **Reads:** `core/doctrine.md`
- **Changes state:** no
- **Pairs with:** `mopp-assess` (this explains, that acts)

## `mopp-assess` (Claude Code)

- **File:** `adapters/claude-code/skills/mopp-assess/SKILL.md`
- **Type:** workflow skill (acts)
- **Trigger (description):** before deploys, migrations, destructive commands, or
  touching auth/crypto/secrets/production — or when the user asks what posture to
  be in / wants guardrails matched to the task.
- **Workflow:**
  1. `mopp assess --command "<cmd>"` — recommend a level from signals
  2. present recommendation + driving signals; **operator decides**
  3. `mopp set <level> --reason "<why>"` — adopt
  4. `mopp gate --command "<cmd>"` — check risky commands (auto at L3+ via hook)
  5. `mopp down` — de-escalate when the risky work is done
- **Reads / writes:** drives `core/bin/mopp`; writes `.mopp/posture`
- **Changes state:** yes (via `set` / `down`, operator-confirmed)
- **Rule:** never set posture silently — commander dictates.

## `/mopp` (Codex prompt)

- **File:** `adapters/codex/prompts/mopp.md` → install to `~/.codex/prompts/mopp.md`
- **Type:** custom prompt (Codex has no native Skills)
- **Covers:** the substance of both Claude Code skills — report status, re-assess,
  recommend, confirm with the operator, restate controls, confirm the matching
  `--profile mopp<level>`.
- **Enforcement note:** Codex cannot block a tool mid-call. This prompt makes the
  agent self-gate with `mopp gate`, backed by the sandbox+approval profile.

---

## How triggering works

- **Claude Code:** a skill auto-invokes when the request matches its `description`.
  Keep descriptions concrete and trigger-oriented (verbs + situations), not just a
  title. That `description` field *is* the routing logic.
- **Codex:** the prompt fires when the user runs `/mopp`; the standing guidance in
  `AGENTS.md` is what makes the agent reach for it before risky work unprompted.

## Authoring a new skill

1. Decide host(s). Claude Code → `SKILL.md`; Codex → a prompt under `prompts/`.
2. Keep the *substance* in `core/` (doctrine + CLI). A skill should orchestrate
   and explain, not re-implement logic — so both hosts stay in sync.
3. Write a trigger-oriented `description` (Claude Code) — list the situations and
   phrasings that should fire it.
4. Drive `bin/mopp` for any state change; never mutate `.mopp/posture` by hand.
5. Add a row to the Inventory table above and a per-skill section.

## Field reference — Claude Code `SKILL.md` frontmatter

| Field | Required | Purpose |
|---|---|---|
| `name` | yes | skill id (kebab-case), must match its directory |
| `description` | yes | the routing trigger — when to invoke; be concrete |

Body: markdown instructions to the agent. Reference `core/` paths; do not paste
level definitions inline (single source of truth lives in `core/doctrine.md`).
