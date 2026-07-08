# actuary-exam-app — 메인 오케스트레이터

## 앱 개요

**보험계리사 2차 리스크관리 시험 학습 참고 웹앱**

매주 리스크 관련 뉴스 기사를 수집하고, 각 기사에 연관된 AI 가상 문제와 관련 기출문제를 함께 제공한다.
시험/채점/오답학습 기능은 없다. 문제는 학습 참고 자료로만 제공한다 — 보험계리사 2차 시험 형식에 맞춘 **주관식 논술형(선택지 없음)**. 기출 원본의 정답·해설은 어떤 공개 응답에도 노출하지 않는다.

접근은 **3단계 모델**이다. 게스트는 공개 페이지와 기출 미리보기를 인증 없이 이용하고, 승인 회원은 전체 열람 + AI 모범답안 + KIDI(보험연구원) 학습노트를, 관리자는 회원 승인·배치 관리를 이용한다. 공개 페이지 자체는 무인증 접근을 유지한다. (아래 "핵심 제약사항" 참조)

전체 설계: `../actuary-exam-app-design.md` (v1.4) — 기술 결정사항의 1차 참조 문서.

---

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js 16 App Router (Pages Router 사용 안 함, 미들웨어는 `proxy.ts`) |
| UI | TweakCN (shadcn/ui 기반 커스터마이징) |
| DB / Auth | Supabase — DB + Auth(이메일/비밀번호 회원가입·관리자 승인), `act_` prefix |
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
**소스 위치**: DB 스키마의 실제 소스는 `supabase/migrations/`, 타입은 `types/`(자동 생성분은 `types/supabase.ts`)에 둔다. 과거의 `output/schema.json`·`output/types.ts` 산출물 규약은 사용하지 않는다(`output/` 폴더 비어 있음).

---

## 스킬 사용 기준

| 스킬 | 호출 조건 |
|------|---------|
| `news-fetcher` | `/api/cron/weekly` 배치에서 뉴스 수집·발췌·키워드 추출 구현 시 |
| `question-generator` | 주간 가상 문제 생성 프롬프트 작성 시 (RAG 분기 포함) |
| `supabase-query` | Supabase 쿼리 패턴, RLS 고려 조회, pgvector 검색 구현 시 |

---

## 주요 페이지·테이블

**공개 페이지**: `/`(홈), `/weekly`(주간 예상 문제), `/weekly/[year]/[week]`(아카이브), `/past-questions`(기출 조회), `/kidi`(전문기관 보고서).
**회원 UX**: `/login`, `/signup`, `/pending`(승인 대기), `/settings`.
**관리자**: `/admin`.

**Supabase 테이블(9개)**: `act_past_questions`, `act_weekly_issues`, `act_news_sources`, `act_pdf_imports`, `act_rag_textbooks`, `act_rag_embeddings`, `act_ai_answers`(AI 모범답안 캐시), `act_kidi_reports`(보험연구원 보고서), `act_user_profiles`(회원·승인).

### KIDI(보험연구원) 기능군

`/kidi` 페이지와 `act_kidi_reports` 테이블 기반. 파이프라인은 **임포트 → enrich → 학습노트**:
1. **임포트** — `POST /api/admin/kidi-import`(또는 `scripts/parse-kidi.ts`): PDF 파싱 → 요약·태그 생성 → `act_kidi_reports` INSERT.
2. **enrich** — `scripts/update-kidi-relevance.ts`: 시험 연관성(`exam_relevance`)·`related_question_tags` 분류.
3. **학습노트** — `POST /api/admin/kidi-enrich`(또는 `scripts/enrich-kidi-content.ts`): `study_notes`(마크다운) 생성. 승인 회원에게만 노출.

원본 PDF 수집은 프로젝트 루트 `.claude/CLAUDE.md`의 `kiri-download` 스킬 참조.

---

## 구현 순서 (권장)

1. **DB 스키마** — `db-architect` 호출 → `supabase/migrations/*.sql`, `types/supabase.ts` 갱신
2. **주간 배치 API** — `api-designer` 호출 → `/api/cron/weekly` 구현 (폴백 모드 우선)
3. **공개 페이지 UI** — `ui-builder` 호출 → `/weekly`, `/past-questions`, `/` 구현
4. **관리자 페이지** — `ui-builder` + `api-designer` → `/admin` 구현 (PDF 파싱, 뉴스 소스 관리)
5. **RAG 강화** — `api-designer` 호출 → `/api/rag/upload`, `lib/rag/` 구현
6. **통합 검증** — 전체 플로우 E2E 확인

> 1~3단계 완료 후 폴백 모드로 전체 앱이 정상 동작해야 한다.
> RAG는 4단계 이후 점진적으로 추가한다.

---

## 핵심 제약사항 (반드시 준수)

- **정답 정책**:
  - ① 기출 원본 `act_past_questions.answer`/`explanation`은 어떤 공개 응답(API·UI)에도 포함하지 않는다. 공개 쿼리(`lib/supabase/queries/past-questions.ts`)는 명시 컬럼 선택으로 두 컬럼을 제외한다.
  - ② Claude가 생성하는 "AI 모범답안"은 별도 기능으로 **승인 회원 전용**이다. `/api/answer`가 `getAuthState().isApproved`로 게이트하며 결과는 `act_ai_answers`에 캐시한다.
- **인증 3단계** (Supabase Auth 이메일/비밀번호 사용, `proxy.ts`가 세션 갱신):
  - **게스트**: 공개 페이지(`/`, `/weekly`, `/past-questions`, `/kidi`)와 기출 미리보기를 무인증 열람.
  - **승인 회원**: 회원가입 → 관리자 승인(`act_user_profiles.status='approved'`) 후 전체 열람 + AI 모범답안 + KIDI 학습노트.
  - **관리자**: 세션 `user.id === ADMIN_USER_ID`일 때 `/admin` 및 관리자 API 접근. 공개 페이지 자체는 인증 없이 접근 가능하다.
- **App Router 전용**: `use client` 최소화. 가능하면 Server Component로 구현.
- **KaTeX 선택적**: `has_formula=false` 문항에 KaTeX 로드 금지 (성능).
- **Claude 모델**: 런타임(웹앱: `app/`·`lib/`) 경로는 `claude-sonnet-4-6` 고정. 로컬 배치 스크립트의 경량 분류 작업(예: `scripts/update-kidi-relevance.ts`의 KIDI 연관성 분류)에 한해 Haiku 허용.

---

## 에이전트 간 데이터 전달

실제 스키마·타입·계약의 소스는 아래 코드 경로다. 과거의 `output/*` 산출물 규약은 사용하지 않는다.

```
db-architect  → supabase/migrations/*.sql   # 확정 스키마·RLS (실행 가능한 마이그레이션)
db-architect  → types/supabase.ts           # Supabase 자동 생성 Database 타입
api-designer  → app/api/**/route.ts          # Route Handler 입출력 계약
ui-builder    → components/, app/            # 구현 컴포넌트·페이지
```
