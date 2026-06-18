# MOPP protective posture (Codex)

This project uses MOPP — Mission-Oriented Protective Posture — to scale your
guardrails to the threat of the work. Posture is a level 0–4; controls stack
cumulatively. Full model: `core/doctrine.md`.

Codex has no per-tool blocking hook, so enforcement here is two-part:

1. **Native posture** — your sandbox + approval policy map to the MOPP level
   (see `config.snippet.toml`). Run Codex with the matching profile:
   `codex --profile mopp3`.
2. **Self-gating** — before running a risky shell command, call the core gate
   yourself and honor the verdict.

## Rules

- **Assess before risky work.** Before a deploy, migration, destructive command
  (`rm -rf`, `git reset --hard`, `DROP TABLE`), force-push, or touching
  auth/crypto/secrets/production, run:
  ```bash
  node core/bin/mopp assess --command "<the command>"
  ```
  Present the recommendation; let the human adopt it with
  `node core/bin/mopp set <level> --reason "<why>"`. Do not change posture silently.

- **Gate every risky command.** Before running it:
  ```bash
  node core/bin/mopp gate --command "<cmd>"
  ```
  Exit 2 = **block**: do not run it; tell the human why. Exit 1 = **confirm**:
  ask the human first. Exit 0 = allow.

- **Match your profile to the posture.** If posture is MOPP 3+, run under
  `--profile mopp3`/`mopp4` so the sandbox/approval policy backs the gate.

- **De-escalate when done.** Holding a high posture slows everything. Once the
  risky work is complete: `node core/bin/mopp down --reason "<done>"`.

If the `mopp` MCP server is registered (see `config.snippet.toml`), you may use
the `mopp_status` / `mopp_assess` / `mopp_set` / `mopp_gate` tools instead of
shelling out — they are equivalent.
