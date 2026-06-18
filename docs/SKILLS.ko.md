# MOPP 스킬 명세서

[English](SKILLS.md) · 한국어

MOPP의 **에이전트 대면 계층**. 스킬은 코딩 에이전트가 *언제, 어떻게* 태세 시스템을
쓸지 아는 수단이다. `bin/mopp` CLI는 스킬이 구동하는 엔진이고, hook은 그 밑의 강제
장치다.

```
skill / prompt   ── 에이전트 대면: 언제 + 어떻게 (이 문서)
   │ 구동
bin/mopp CLI      ── 엔진: assess / set / gate / explain
   │ 강제
hooks + profiles  ── 호스트 네이티브: PreToolUse(CC), sandbox+approval(Codex)
```

스킬은 **형식은 호스트별, 실체는 공유**다. Claude Code는 네이티브 Skill(frontmatter
가진 `SKILL.md`, description 매칭으로 자동 호출)이 있다. Codex는 Skill 체계가 없어
같은 의도를 커스텀 prompt로 싣는다. 둘 다 `core/doctrine.md`의 같은 진실을 읽고 같은
`core/bin/mopp`를 호출한다.

## 목록

| ID | 호스트 | 형식 | 역할 |
|---|---|---|---|
| `mopp-doctrine` | Claude Code | `SKILL.md` | 모델 설명 — 단계·장구·통제 |
| `mopp-assess` | Claude Code | `SKILL.md` | 워크플로우: 평가 → 태세 설정 → 게이트 → 하향 |
| `/mopp` (Codex) | Codex | prompt | status + assess + set의 Codex 등가물 |

---

## `mopp-doctrine` (Claude Code)

- **파일:** `adapters/claude-code/skills/mopp-doctrine/SKILL.md`
- **유형:** 지식 스킬 (설명만, 상태 변경 없음)
- **트리거(description):** MOPP가 뭔지, 단계가 가드레일에 어떻게 매핑되는지, 특정
  단계에 어떤 통제가 적용되는지 물을 때.
- **동작:** `core/doctrine.md`의 모델을 요약 (누적 단계, 2면 통제 스택, 방독면=3단계
  사람 개입, 지휘관 명령). 런타임 체크리스트는 `mopp explain <0-4>` 안내.
- **읽음:** `core/doctrine.md`
- **상태 변경:** 없음
- **짝:** `mopp-assess` (이건 설명, 저건 실행)

## `mopp-assess` (Claude Code)

- **파일:** `adapters/claude-code/skills/mopp-assess/SKILL.md`
- **유형:** 워크플로우 스킬 (실행)
- **트리거(description):** 배포·마이그레이션·파괴적 명령 전, auth/crypto/secrets/운영
  접촉 전 — 또는 "어떤 태세여야 하나" 묻거나 작업에 맞는 가드레일을 원할 때.
- **워크플로우:**
  1. `mopp assess --command "<cmd>"` — 신호로 단계 추천
  2. 추천 + 근거 신호 제시; **운영자가 결정**
  3. `mopp set <level> --reason "<why>"` — 채택
  4. `mopp gate --command "<cmd>"` — 위험 명령 점검 (3단계+ hook 자동)
  5. `mopp down` — 위험 작업 끝나면 하향
- **읽기/쓰기:** `core/bin/mopp` 구동, `.mopp/posture` 기록
- **상태 변경:** 있음 (`set`/`down`, 운영자 확인)
- **원칙:** 절대 조용히 태세 변경 금지 — 지휘관이 명령.

## `/mopp` (Codex prompt)

- **파일:** `adapters/codex/prompts/mopp.md` → `~/.codex/prompts/mopp.md`에 설치
- **유형:** 커스텀 prompt (Codex 네이티브 Skill 없음)
- **포함:** Claude Code 두 스킬의 실체 전부 — status 보고, 재평가, 추천, 운영자 확인,
  통제 재진술, `--profile mopp<level>` 일치 확인.
- **강제력 노트:** Codex는 도구 호출 중간 차단 불가. 이 prompt가 에이전트로 하여금
  `mopp gate`로 자가 점검하게 하고, sandbox+approval profile이 받쳐준다.

---

## 트리거 작동 방식

- **Claude Code:** 요청이 스킬의 `description`과 매칭되면 자동 호출. description은
  제목이 아니라 **트리거 지향**(동사 + 상황)으로 구체적으로 작성. 이 필드가 곧 라우팅
  로직이다.
- **Codex:** 사용자가 `/mopp` 실행 시 발동. `AGENTS.md`의 상시 지침이 위험 작업 전
  에이전트가 알아서 집어들게 만든다.

## 새 스킬 추가하기

1. 호스트 결정. Claude Code → `SKILL.md`; Codex → `prompts/` 아래 prompt.
2. *실체*는 `core/`에 둔다 (doctrine + CLI). 스킬은 오케스트레이션·설명만 하고 로직을
   재구현하지 않는다 — 그래야 두 호스트가 동기화 유지.
3. 트리거 지향 `description` 작성(Claude Code) — 발동시킬 상황·표현을 나열.
4. 상태 변경은 반드시 `bin/mopp` 통해서. `.mopp/posture` 직접 수정 금지.
5. 위 목록 표에 행 추가 + 스킬별 섹션 추가.

## 필드 레퍼런스 — Claude Code `SKILL.md` frontmatter

| 필드 | 필수 | 역할 |
|---|---|---|
| `name` | 예 | 스킬 id (kebab-case), 디렉토리명과 일치해야 함 |
| `description` | 예 | 라우팅 트리거 — 언제 호출할지; 구체적으로 |

본문: 에이전트용 마크다운 지침. `core/` 경로를 참조하되 단계 정의를 인라인으로 붙여넣지
말 것 (단일 진실원천은 `core/doctrine.md`).
