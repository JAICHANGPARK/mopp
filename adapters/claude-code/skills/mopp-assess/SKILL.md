---
name: mopp-assess
description: Assess the threat of the current work and set the right MOPP protective posture before risky operations. Use before deploys, migrations, destructive commands, or touching auth/crypto/secrets/production — or whenever the user asks "what posture should I be in" or wants guardrails matched to the task.
---

# MOPP assess & set

Workflow for choosing and adopting a protective posture. The core CLI is at
`$MOPP_BIN` (else monorepo `core/bin/mopp`).

## When to run

Before any of: deploy/release, DB migration, destructive command (`rm -rf`,
`git reset --hard`, `DROP TABLE`), force-push, editing auth/crypto/secrets,
targeting production, or large multi-file changes.

## Steps

1. **Assess.** Factor in the command you are about to run:
   ```bash
   node "$MOPP_BIN" assess --command "<the risky command, if any>"
   ```
   This prints a recommended level, both axis scores (dev/sec), and the driving
   signals. It does not change anything.

2. **Confirm with the operator.** Present the recommendation and the signals.
   The human decides (commander dictates) — do not set posture silently.

3. **Set.**
   ```bash
   node "$MOPP_BIN" set <level> --reason "<why>"
   ```
   Then restate the now-active controls (`node "$MOPP_BIN" explain <level>`).

4. **Gate risky commands.** At MOPP 3+ the PreToolUse hook auto-evaluates Bash
   commands, but you can check explicitly:
   ```bash
   node "$MOPP_BIN" gate --command "<cmd>"   # exit 0 allow, 1 confirm, 2 block
   ```

5. **De-escalate when done.** Holding a high posture has a velocity cost. Once
   the risky work is complete:
   ```bash
   node "$MOPP_BIN" down --reason "<risky work complete>"
   ```

## Mapping to host enforcement

- Claude Code enforces gates via the PreToolUse hook (block→deny, confirm→ask).
- Higher levels also imply permission-mode discipline: MOPP 4 ⇒ work in plan
  mode / a worktree, dry-run before applying.
