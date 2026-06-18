Check and manage the MOPP protective posture for this repo.

Steps:
1. Report current posture: run `node core/bin/mopp status`.
2. Re-assess the threat: run `node core/bin/mopp assess` (add `--command "<cmd>"`
   if a specific risky command is planned).
3. If the recommended level is higher than the current one, explain why (cite the
   driving signals) and ask me whether to adopt it with
   `node core/bin/mopp set <level>`.
4. Remind me of the active controls: `node core/bin/mopp explain <level>`.
5. If we are above MOPP 0, also confirm I am running Codex under the matching
   profile (`codex --profile mopp<level>`).

Do not change posture without my confirmation — I am the commander; you advise.
