# actuary-exam-app — 메인 오케스트레이터

## 앱 개요

**보험계리사 2차 리스크관리 시험 학습 참고 웹앱**

매주 리스크 관련 뉴스 기사를 수집하고, 각 기사에 연관된 AI 가상 문제와 관련 기출문제를 함께 제공한다.
시험/채점/오답학습 기능은 없다. 문제는 학습 참고 자료로만 제공 (문제+선택지만 표시, 정답·해설 없음).
로그인 불필요. 일반 사용자는 모든 공개 페이지를 인증 없이 이용한다.

전체 설계: `../actuary-exam-app-design.md` (v1.3) — 기술 결정사항의 1차 참조 문서.

---

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 App Router (Pages Router 사용 안 함) |
| UI | TweakCN (shadcn/ui 기반 커스터마이징) |
| DB / Auth | Supabase (신규 프로젝트, `act_` prefix) |
| 벡터 검색 | pgvector (Supabase 내장) |
| AI | Claude API — Sonnet 4.6 (주간 배치, PDF 파싱) |
| 임베딩 | OpenAI text-embedding-3-small (1536차원, RAG용) |
| 배포 | Vercel (vercel.app 기본 도메인) |
| 수식 렌더링 | KaTeX (has_formula=true 문항에만 선택적 적용) |

---

## 서브에이전트 사용 기준

| 에이전트 | 호출 조건 | 파일 |
|---------|---------|------|
| `db-architect` | 스키마 설계, 마이그레이션 SQL 작성, RLS 정책, 타입 생성 | `.claude/agents/db-architect/AGENT.md` |
| `ui-builder` | 컴포넌트·페이지 구현, TweakCN 커스터마이징, 반응형 레이아웃 | `.claude/agents/ui-builder/AGENT.md` |
| `api-designer` | Route Handler, 주간 배치 Cron, Claude API 연동, RAG 파이프라인 | `.claude/agents/api-designer/AGENT.md` |

**호출 방법**: 해당 AGENT.md를 컨텍스트에 포함한 뒤 작업을 위임한다.
**결과물 위치**: 각 에이전트는 `/output/` 폴더에 산출물(schema.json, types.ts, api-contracts.md 등)을 저장한다.

---

## 스킬 사용 기준

| 스킬 | 호출 조건 |
|------|---------|
| `news-fetcher` | `/api/cron/weekly` 배치에서 뉴스 수집·발췌·키워드 추출 구현 시 |
| `question-generator` | 주간 가상 문제 생성 프롬프트 작성 시 (RAG 분기 포함) |
| `supabase-query` | Supabase 쿼리 패턴, RLS 고려 조회, pgvector 검색 구현 시 |

---

## 구현 순서 (권장)

1. **DB 스키마** — `db-architect` 호출 → `/output/schema.json`, `/output/types.ts` 생성
2. **주간 배치 API** — `api-designer` 호출 → `/api/cron/weekly` 구현 (폴백 모드 우선)
3. **공개 페이지 UI** — `ui-builder` 호출 → `/weekly`, `/past-questions`, `/` 구현
4. **관리자 페이지** — `ui-builder` + `api-designer` → `/admin` 구현 (PDF 파싱, 뉴스 소스 관리)
5. **RAG 강화** — `api-designer` 호출 → `/api/rag/upload`, `lib/rag/` 구현
6. **통합 검증** — 전체 플로우 E2E 확인

> 1~3단계 완료 후 폴백 모드로 전체 앱이 정상 동작해야 한다.
> RAG는 4단계 이후 점진적으로 추가한다.

---

## 핵심 제약사항 (반드시 준수)

- **정답·해설 미표시**: `act_past_questions.answer`, `act_past_questions.explanation`은 DB에만 보관. API 응답 및 UI에 노출 금지.
- **로그인 없음**: Supabase Auth 미사용. 일반 사용자 세션 불필요.
- **관리자 인증**: `ADMIN_USER_ID` 환경변수와 요청 비교. `/admin` 외 모든 페이지는 공개.
- **App Router 전용**: `use client` 최소화. 가능하면 Server Component로 구현.
- **KaTeX 선택적**: `has_formula=false` 문항에 KaTeX 로드 금지 (성능).
- **Claude 모델**: 주간 배치·PDF 파싱은 `claude-sonnet-4-6`. Haiku 사용 안 함.

---

## 에이전트 간 데이터 전달

```
db-architect  → output/schema.json        # 확정 테이블 스키마 (JSON)
db-architect  → output/types.ts           # TypeScript 타입 (자동 생성 기반)
api-designer  → output/api-contracts.md   # Route Handler 입출력 계약
ui-builder    → output/component-list.md  # 구현 완료 컴포넌트 목록
```
