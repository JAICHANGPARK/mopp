Check and manage the MOPP protective posture for this repo.

Steps:
1. Run **both** status and threat assessment in one turn:
   * `node core/bin/mopp status --json`
   * `node core/bin/mopp assess --json` (append `--command "<cmd>"` if a risky command is planned)
2. Present a unified, clean report to the commander:
   * Current posture level and active controls.
   * Any detected threat signals in the workspace (modified files, package changes, etc.).
   * The recommended posture level.
3. If the recommended level is different from the current one, explain the driving signals and ask me whether to transition to it using `node core/bin/mopp set <level> --reason "<why>"`.
4. If we are above MOPP 0, remind me to align my host profile if necessary (e.g., running `codex --profile mopp<level>`).

Do not change posture without my explicit confirmation — I am the commander; you advise.

