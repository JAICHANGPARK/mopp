---
name: mopp-doctrine
description: Explains the MOPP (Mission-Oriented Protective Posture) model for AI work — the 0-4 levels, the cumulative gear/control stack, the dev and security faces, decision authority, and why de-escalation matters. Use when the user asks what MOPP is, how the levels map to guardrails, or which controls apply at a given level.
---

# MOPP doctrine

MOPP scales AI guardrails to the assessed threat (blast radius + sensitivity) of
the work, exactly like military protective gear scales to a chemical threat.
Higher posture = more protection, but real velocity cost — so you **de-escalate
when the risky work is done** rather than holding maximum protection.

Read the canonical model from `core/doctrine.md` (resolve via `$MOPP_BIN`'s repo,
or the monorepo `core/` directory). Key points:

- **Five levels, cumulative.** Each level keeps every control below it and adds
  one gear layer: 0 base → 1 overgarment → 2 overboots → 3 mask → 4 gloves.
- **Two faces, one level.** Each level has a development control set and a
  security control set. Same posture number, both stacks active.
- **The mask (level 3) is where a human enters the loop.** Below 3 the agent
  runs on static gates; at 3+ a person approves destructive/sensitive actions.
- **Commander dictates.** The agent recommends a level via `mopp assess`; the
  human adopts it via `mopp set`. Never silently change posture.

Control summary (cumulative):

| Level | Dev face | Security face |
|---|---|---|
| 0 | full autonomy, branch only | none |
| 1 | tests required, branch isolation | baseline secret scan |
| 2 | lint/typecheck gate, review | dependency audit, SAST |
| 3 | approval on destructive ops, no force-push | egress confirm, audit log ON |
| 4 | worktree, dry-run, step confirm | least privilege, secrets out of context, rollback plan |

To inspect levels at runtime: `node $MOPP_BIN explain <0-4>`.
