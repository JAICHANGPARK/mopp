# mopp

**AI 협업 작업을 위한 임무형 보호태세 (Mission-Oriented Protective Posture).**

[English](README.md) · 한국어

작업의 위협 수준에 맞춰 AI 가드레일을 조절한다. 군의 MOPP가 화학 위협에 맞춰
보호장구 단계를 올리듯, 이 플러그인은 에이전트가 하려는 작업의 **폭발 반경**과
**보안 민감도**에 맞춰 테스트·리뷰 게이트·사람 승인·격리·감사를 단계적으로 올린다.
0~4 한 다이얼, 통제는 누적식. 그리고 **의도적 단계 하향(de-escalation)** — 최대
보호태세를 오래 유지하면 속도라는 실제 비용이 들기 때문이다.

**Claude Code** 와 **Codex** (및 MCP 지원 호스트 전반)에서 단일 공유 코어로 동작한다.

## 단계 (Levels)

누적식 — 각 단계는 하위 통제를 모두 유지하고 장구 한 겹을 더한다.

| 단계 | 장구 | 개발 측면 (dev) | 보안 측면 (sec) |
|---|---|---|---|
| 0 | 기본 | 완전 자율, 브랜치만 | 없음 |
| 1 | 보호복 | 테스트 필수, 브랜치 격리 | secret 스캔(베이스라인) |
| 2 | 덧신 | lint/typecheck 게이트, 리뷰 | 의존성 audit, SAST |
| 3 | 방독면 | 파괴 작업 사람 승인, force-push 금지 | egress 확인, 감사로그 ON |
| 4 | 보호장갑 | worktree, dry-run, 단계별 확인 | 최소권한, 컨텍스트 secret 차단, 롤백 플랜 |

**방독면(3단계)** 이 분기점 — 사람이 루프에 들어오는 곳이다. 그 아래는 에이전트가
정적 게이트로 달리고, 3단계 이상부터는 위험한 동작을 사람이 승인한다.

## 언제 쓰나 (When to use)

에이전트의 동작이 균일하지 않은 위험을 가지는 세션이면 다 해당된다 — 대부분의 코드
작업이 그렇다. 지금 건드리려는 대상으로 태세를 고르고, 그 작업이 끝나면 내린다.

| 상황 | 태세 |
|---|---|
| 프로토타입, 스파이크, 스크래치 브랜치, 일회성 코드 | **0** |
| 비핵심 코드의 일상적 기능 개발 | **1** |
| 공유 라이브러리 / 공통 모듈, PR·머지로 갈 코드 | **2** |
| 파괴적 명령(`rm -rf`, `git reset --hard`, `DROP TABLE`), force-push, auth/crypto 수정, 외부 네트워크 호출 | **3** |
| 운영 타겟, DB 마이그레이션, 배포, 보안 코어, 시크릿 관련 전부 | **4** |

**숫자만 고르는 게 아니라 도구를 호출하는 시점:**

- **세션 시작** — SessionStart hook(Claude Code) 또는 `/mopp status` 로 현재 태세와
  추천 상향이 드러나게 한다.
- **위험 명령 직전** — `mopp assess --command "<cmd>"` 돌리고 `set`. MOPP 3단계
  이상에서는 게이트가 모든 Bash 명령을 자동 평가한다.
- **작업 성격이 바뀔 때** — "기능 작성"에서 "마이그레이션 실행"으로 넘어가는 건
  태세 변경이다. 다시 평가한다.
- **위험 작업이 끝났을 때** — `mopp down`. 일상 편집 내내 MOPP 4를 유지하면 느려질
  뿐이다. 그 속도 비용이 바로 다이얼이 양방향인 이유다.

원칙: **전에 평가(assess), 중에 게이트(gate), 후에 하향(down).**

## 구조 (Layout)

```
core/                 호스트 무관 단일 진실원천
  doctrine.md         모델 정의 (단계, 장구, 결정 권한)
  signals.json        위협 신호, 단계 임계값, 명령 게이트
  bin/mopp            CLI: status | assess | set | down | gate | explain
mcp/                  mopp_* 도구를 MCP 호스트에 노출하는 MCP 서버
adapters/
  claude-code/        plugin.json, /mopp 명령, skills, PreToolUse + SessionStart hook, statusline
  codex/              AGENTS.md, 커스텀 prompt, 단계별 profile + MCP 설정
```

한 줄 요약 모델:
**MOPP 단계 = (호스트 네이티브 권한·샌드박스 태세) + (`bin/mopp`가 돌리는 공유 통제 체크리스트).**

## 빠른 시작 (Quick start)

```bash
# 계획 중인 명령의 위협을 평가
node core/bin/mopp assess --command "terraform apply"
# 추천 태세 채택 (결정은 사람이 한다 — 지휘관이 명령)
node core/bin/mopp set 4 --reason "운영 인프라 변경"
# 명령을 현재 태세에 대조 (exit 0 허용 / 1 확인 / 2 차단)
node core/bin/mopp gate --command "git push --force"
# 위험 작업이 끝나면 태세 하향
node core/bin/mopp down
```

## 명령 레퍼런스 (CLI)

| 명령 | 설명 |
|---|---|
| `mopp status` | 현재 태세와 활성 통제 출력 |
| `mopp assess [--command C]` | 저장소 + 명령 신호로 태세 추천 (변경 안 함) |
| `mopp set <0-4> [--reason R]` | 태세 채택 (사람이 결정) |
| `mopp down [--reason R]` | 한 단계 하향 |
| `mopp gas` | α(알파) 긴급 격납 — 즉시 MOPP 4 ("가스 가스 가스") |
| `mopp all-clear` | 경보 해제 — 재평가 후 적정 단계로 하향 |
| `mopp gate --command C` | 명령 평가. exit 0 허용 / 1 확인 / 2 차단 |
| `mopp explain <0-4>` | 해당 단계의 누적 통제 체크리스트 출력 |

공통 플래그: `--json` (기계 판독 출력).

위협 평가는 `signals.json` 의 가중 신호를 dev/sec 두 축으로 합산해 각 축 점수를
임계값으로 단계에 매핑한다. 추천 태세 = 두 축 중 높은 쪽. 점수 → 단계는 **추천**이며,
실제 채택은 `mopp set` 으로 사람이 한다.

## 설치 — Claude Code

플러그인을 `adapters/claude-code/` 로 지정한다 (`/mopp` 명령, `mopp-doctrine`·
`mopp-assess` 스킬, PreToolUse + SessionStart hook 포함). hook는 코어 바이너리를
`$MOPP_BIN` 또는 모노레포 `core/` 에서 찾는다. statusline은 선택 연결:

```json
{ "statusLine": { "type": "command", "command": "node /abs/path/mopp/adapters/claude-code/statusline.js" } }
```

## 설치 — Codex

`adapters/codex/config.snippet.toml` 을 `~/.codex/config.toml` 에 병합하고
(단계별 profile + `mopp` MCP 서버), `adapters/codex/AGENTS.md` 지침을 프로젝트
`AGENTS.md` 에 넣고, `adapters/codex/prompts/mopp.md` 를 `~/.codex/prompts/` 에
넣는다. 현재 태세에 맞는 profile로 실행: `codex --profile mopp3`.

## 강제력에 대한 솔직한 설명

- **Claude Code** 는 PreToolUse hook로 실제 차단/질의(deny / ask)를 한다.
- **Codex** 는 per-tool 차단 hook이 없다. 강제력 = 네이티브 샌드박스 + approval
  profile *과* AGENTS.md 지침에 따라 에이전트가 `mopp gate` 로 자가 점검하는 것.

## 문서 (Documentation)

- `core/doctrine.md` — 모델: 단계·장구·결정 권한·군사 정합성 노트
- [`docs/SKILLS.ko.md`](docs/SKILLS.ko.md) — 스킬 명세서 (Claude Code 스킬 + Codex prompt)

## 상태 (Status)

v0.1 — 코어 CLI + 게이트 검증 완료, 어댑터 스캐폴드 완료. MCP 서버는 `mcp/` 에서
`npm install` 필요. `core/signals.json` 을 사용 스택에 맞게 튜닝할 것.
