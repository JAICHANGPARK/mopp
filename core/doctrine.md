# MOPP — Mission-Oriented Protective Posture for AI-assisted work

Single source of truth. Both host adapters (Claude Code, Codex) and the MCP
server read this file plus `signals.json`. Do not duplicate level definitions
anywhere else; reference this document.

## Premise

Military MOPP scales chemical/bio protective gear to the assessed threat.
Higher posture = more protection, but documented cost: heat exhaustion,
impaired judgement, reduced dexterity, slower work. The discipline is not
"always maximum protection" — it is "match posture to threat, and **de-escalate
when the threat passes**." Staying suited up too long degrades the mission.

We apply the same to AI-assisted development and security work. The "threat" is
the blast radius and sensitivity of what the agent is about to do. The "gear" is
guardrails: tests, review gates, human approval, isolation, audit. Posture is a
single dial 0–4; the controls stack cumulatively, exactly like real MOPP gear.

Two doctrine facts drive the whole design:

1. **Cumulative.** Each level adds controls and keeps all lower-level controls.
   Gear is donned in order, never partially removed mid-level.
2. **De-escalation is a first-class action.** `mopp down` exists because holding
   a high posture has real velocity cost. Drop posture deliberately once the
   risky work is done.

Decision authority mirrors the in-theatre commander: the **agent recommends** a
level from threat signals; the **human sets** it. Auto-assessment never silently
forces a posture. (In real doctrine, posture escalates on the CBRN **alert
level** — 경계경보 → 경보발령 → 오염지역 작전; here the analogue is the threat
signals in `signals.json`, with the operator giving the order.)

## The gear stack

Real MOPP gear, donned in order, mapped to control layers. Each layer has a
development face and a security face — same level, two gear stacks, both
cumulative.

| Gear (don order) | Level added | Dev face | Security face |
|---|---|---|---|
| (base) | 0 | full autonomy, branch only | none |
| Overgarment (보호복) | 1 | tests required, branch isolation | secret scan (baseline) |
| Overboots (덧신) | 2 | lint + typecheck gate, review | dependency audit, SAST |
| Mask + hood (방독면) | 3 | human approval on destructive ops, no force-push | network egress confirm, audit log ON |
| Gloves (보호장갑) | 4 | worktree isolation, dry-run, step-by-step confirm | least privilege, secrets out of context, rollback plan |

The **mask (level 3)** is the inflection point: it is where a human enters the
loop. Below 3 the agent runs on static gates; at 3+ a person breathes for it.

## Doctrinal note (military reference)

This tool's 0–4 dial is faithful to real MOPP on the two load-bearing facts:
posture is **cumulative**, and gear is donned in a fixed order —
보호의(overgarment) → 덧신(overboots) → 방독면(mask) → 보호장갑(gloves). Both
match Korean military doctrine and US/NATO sources.

Real doctrine brackets the 0–4 range with states this tool deliberately folds
out, noted here so the metaphor stays honest:

- **준비단계 / MOPP Ready** (before 0): gear staged and accountable, only the
  mask carried. Korean doctrine specifies issue within ~1 hour; US sources cite
  2–6 hours of availability. Our analogue is *MOPP 0 with the tooling installed
  but no gate active* — protection is reachable, not yet worn.
- **α (알파) 단계** (a reactive state, not a higher graded level): a sudden CBRN
  attack while in a shelter/building. It is an out-of-band jump to maximum
  containment, not a step on the graded ladder. Our analogue is an **emergency
  lockdown** — reactively invoking MOPP 4 controls (freeze edits, worktree,
  human-only) in response to an incident, rather than reaching them by graded
  assessment. (Not yet a separate command; reach it with `mopp set 4`.)

These omissions do not change the 0–4 → guardrail mapping; they document where
the working dial sits within the fuller military framework.

Sources: 나무위키 "임무형 보호태세", 리브레위키, 밀리돔; Wikipedia "MOPP
(protective gear)".

## Levels

Cumulative — every level includes all controls of levels below it.

### MOPP 0 — sandbox / throwaway
Threat: none. Prototype, scratch branch, disposable code.
Controls: full agent autonomy. Work on a branch (the one universal floor).
- Claude Code: `acceptEdits`, no gate hook.
- Codex: `sandbox=workspace-write`, `approval=never`.

### MOPP 1 — feature work
Threat: low. Normal feature development on shared-but-non-critical code.
Controls (adds): tests must pass before "done"; branch isolation enforced;
baseline secret scan on changed files.
- Claude Code: `default` mode + test gate hook.
- Codex: `sandbox=workspace-write`, `approval=on-request`.

### MOPP 2 — shared code
Threat: moderate. Code others depend on; merges to integration branches.
Controls (adds): lint + typecheck must pass; review before merge; dependency
audit on manifest changes; SAST on touched code.
- Claude Code: `default` + lint/typecheck/review gate hooks.
- Codex: `sandbox=workspace-write`, `approval=on-request` (stricter review prose in AGENTS.md).

### MOPP 3 — risky operations
Threat: high. Destructive or hard-to-reverse operations; auth/crypto code;
outbound network.
Controls (adds): human approval required before any destructive op; force-push
blocked (use `--force-with-lease`); network egress confirmed; audit log ON.
- Claude Code: `PreToolUse` hook blocks/confirms destructive commands.
- Codex: `sandbox=workspace-write`, `approval=untrusted`.

### MOPP 4 — production / migration / security core
Threat: maximum. Production targets, DB migrations, deploys, security-critical
core.
Controls (adds): worktree isolation; dry-run before apply; step-by-step human
confirm on every mutation; least privilege; secrets kept out of agent context;
written rollback plan before action.
- Claude Code: plan mode + worktree + per-step confirm hook.
- Codex: `sandbox=read-only` + `approval=untrusted` (mutations require explicit human escalation).

## Threat assessment

`signals.json` defines weighted signals on two axes (`dev`, `sec`). `mopp assess`
scans the repo and, optionally, a proposed command, sums matched weights per
axis, and maps each axis score to a recommended level via thresholds. Reported
posture is the higher of the two axis levels; both are shown so the operator
sees which axis is driving it.

The score → level is a **recommendation**. The operator runs `mopp set <level>`
to adopt it (commander dictates), or `mopp down` to de-escalate.

## Gates

`signals.json#gates` defines command patterns that, at or above a given level,
trigger `confirm` or `block`. `mopp gate --command "<cmd>"` evaluates the current
posture against these and exits 0 (allow), 1 (confirm), or 2 (block) — the exit
code is what the Claude Code `PreToolUse` hook consumes. Codex consumes the same
verdict via `bin/mopp gate` invoked from its approval flow / AGENTS.md guidance.

## Host mapping summary

| Level | Claude Code (permission + hook) | Codex (sandbox + approval) |
|---|---|---|
| 0 | acceptEdits, no gate | workspace-write, never |
| 1 | default, test gate | workspace-write, on-request |
| 2 | default, lint/type/review gate | workspace-write, on-request |
| 3 | PreToolUse blocks destructive | workspace-write, untrusted |
| 4 | plan mode + worktree + step confirm | read-only, untrusted |

The abstraction in one line:
**MOPP level = (host-native permission/sandbox posture) + (shared control checklist run by `bin/mopp`).**
