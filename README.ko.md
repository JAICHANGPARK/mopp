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

## 설치 및 연동 (Installation)

### 1. Claude Code
플러그인 경로를 `adapters/claude-code/`로 지정하여 로드합니다 (`/mopp` 명령, `mopp-doctrine`·`mopp-assess` 스킬, PreToolUse + SessionStart hook 포함).
상태 표시줄(statusline)을 연동하려면 `settings.json`에 다음 설정을 추가합니다.
```json
{ 
  "statusLine": { 
    "type": "command", 
    "command": "node /절대경로/mopp/adapters/claude-code/statusline.js" 
  } 
}
```

### 2. Codex
1. `adapters/codex/config.snippet.toml` 설정을 `~/.codex/config.toml`에 병합합니다 (단계별 profile 및 `mopp` MCP 서버 정보 등록).
2. `adapters/codex/AGENTS.md` 가이드를 프로젝트의 `AGENTS.md` 파일에 추가합니다.
3. `adapters/codex/prompts/mopp.md` 프롬프트를 `~/.codex/prompts/` 폴더에 복사합니다.
4. 현재 MOPP 태세에 대응하는 프로필을 지정하여 Codex를 실행합니다: `codex --profile mopp3`.

### 3. Google Antigravity (에이전트 플러그인 & SDK)

#### A. 에이전트 플러그인 등록 (Global Plugin)
Antigravity 에이전트 환경의 모든 세션과 프로젝트에서 MOPP 스킬을 사용할 수 있도록 글로벌 플러그인으로 설치합니다.
1. 전역 플러그인 경로(`~/.gemini/config/plugins/mopp`)에 플러그인 구조를 생성하고 배포합니다:
   ```bash
   # 디렉토리 생성
   mkdir -p ~/.gemini/config/plugins/mopp/skills/mopp-assess
   mkdir -p ~/.gemini/config/plugins/mopp/skills/mopp-doctrine
   mkdir -p ~/.gemini/config/plugins/mopp/core/bin
   
   # 파일 복사 및 권한 부여
   cp core/bin/mopp ~/.gemini/config/plugins/mopp/core/bin/mopp
   cp core/signals.json ~/.gemini/config/plugins/mopp/core/signals.json
   cp core/doctrine.md ~/.gemini/config/plugins/mopp/core/doctrine.md
   cp adapters/claude-code/.claude-plugin/plugin.json ~/.gemini/config/plugins/mopp/plugin.json
   cp adapters/claude-code/skills/mopp-assess/SKILL.md ~/.gemini/config/plugins/mopp/skills/mopp-assess/SKILL.md
   cp adapters/claude-code/skills/mopp-doctrine/SKILL.md ~/.gemini/config/plugins/mopp/skills/mopp-doctrine/SKILL.md
   chmod +x ~/.gemini/config/plugins/mopp/core/bin/mopp
   ```
2. 등록이 완료되면 에이전트가 리로드되면서 `mopp-assess`와 `mopp-doctrine` 스킬을 어느 작업 공간에서든 자동으로 인식합니다.

#### B. Google Antigravity Python SDK 연동
Python SDK로 구현된 자율 에이전트가 `run_command` (쉘 실행) 전에 동적으로 MOPP 게이트를 확인하도록 훅 또는 정책(Policy)에 연동합니다.
1. [mopp.py](adapters/antigravity/mopp.py) 어댑터 모듈을 에이전트 프로젝트 소스 경로로 가져옵니다.
2. `LocalAgentConfig` 객체 초기화 시 `mopp_pre_tool_hook`을 등록합니다.
   ```python
   from google.antigravity import Agent, LocalAgentConfig
   from adapters.antigravity.mopp import mopp_pre_tool_hook

   config = LocalAgentConfig(
       system_instructions="You are an autonomous engineering agent.",
       hooks=[mopp_pre_tool_hook]  # MOPP 게이트 훅 자동 실행
   )
   ```

---

## 강제력 및 실행 방식 (Enforcement)

- **Claude Code**: `PreToolUse` 훅이 명령 실행 전 개입하여 실제 차단(deny) 또는 사용자 질의(ask)를 물리적으로 제어합니다.
- **Codex**: 전용 훅 시스템이 부재하므로, 네이티브 샌드박스 정책(`read-only` 등)과 `AGENTS.md` 지침에 따라 에이전트가 명령 전 `mopp gate`를 수동/자가 호출하여 행동을 자체 제어합니다.
- **Antigravity SDK**: `pre_tool_call_decide` 생명주기 훅을 통해 쉘 명령 실행 전 차단 사유를 분석하고 툴 호출을 안전하게 취소시킵니다.


## 문서 (Documentation)

- `core/doctrine.md` — 모델: 단계·장구·결정 권한·군사 정합성 노트
- [`docs/SKILLS.ko.md`](docs/SKILLS.ko.md) — 스킬 명세서 (Claude Code 스킬 + Codex prompt)

## 상태 (Status)

v0.1 — 코어 CLI + 게이트 검증 완료, 어댑터 스캐폴드 완료. MCP 서버는 `mcp/` 에서
`npm install` 필요. `core/signals.json` 을 사용 스택에 맞게 튜닝할 것.
