---
description: Set or inspect the MOPP protective posture (0-4) for guarded AI work
argument-hint: "status | assess | set <0-4> | down | gate <cmd> | explain <0-4>"
allowed-tools: Bash
---

# /mopp — Mission-Oriented Protective Posture

Run the MOPP core CLI for the current repo. The posture scales guardrails to the
threat of the work; controls stack cumulatively across levels 0–4. See the
`mopp-doctrine` skill for the full model.

The core binary is resolved from `$MOPP_BIN`, else the bundled/monorepo
`core/bin/mopp`.

Invoke based on `$ARGUMENTS`:

- `status` (or empty) → `mopp status`
- `assess` → `mopp assess` (recommend a posture; does not change it)
- `set <0-4>` → `mopp set <level> --reason "<why>"` (operator adopts the posture)
- `down` → `mopp down` (de-escalate one level — do this once risky work is done)
- `gate <cmd>` → `mopp gate --command "<cmd>"` (allow/confirm/block a command)
- `explain <0-4>` → `mopp explain <level>` (show the cumulative control checklist)

Resolve the binary then run, e.g.:

```bash
MOPP_BIN="${MOPP_BIN:-$CLAUDE_PLUGIN_ROOT/../../core/bin/mopp}"
node "$MOPP_BIN" status
```

After `assess`, present the recommendation and the driving signals, then ask the
operator whether to `set` it — never silently change posture (commander dictates).
After `set`, restate the active controls so the session knows its posture.
