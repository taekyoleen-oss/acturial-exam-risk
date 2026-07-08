# actuary-exam-app

보험계리사 2차 **계리리스크관리** 시험 학습 참고 웹앱. 매주 리스크 관련 뉴스 기사를 수집해 각 기사에 연관된 AI 가상 문제(주관식 논술형)와 관련 기출문제를 함께 제공하고, 보험연구원(KIDI) 보고서를 학습 자료로 연계한다. 시험/채점/오답학습 기능은 없다.

전체 설계는 `../actuary-exam-app-design.md`(v1.4), 오케스트레이터 규약은 `CLAUDE.md` 참조.

## 기술 스택

- **Next.js 16** (App Router, 미들웨어는 `proxy.ts`) · React 19
- **Supabase** — Postgres + Auth(이메일/비밀번호 회원가입·관리자 승인) + pgvector, `act_` 테이블 prefix
- **Claude API** (`claude-sonnet-4-6`) — 주간 배치, PDF 파싱, AI 모범답안, KIDI 요약
- **OpenAI** `text-embedding-3-small` (1536차원, RAG 임베딩)
- **KaTeX** — `has_formula=true` 문항 수식 렌더링
- **Vercel** 배포 + Cron

## 접근 모델 (3단계)

- **게스트**: 공개 페이지(`/`, `/weekly`, `/past-questions`, `/kidi`)와 기출 미리보기를 무인증 열람
- **승인 회원**: 회원가입 → 관리자 승인 후 전체 열람 + AI 모범답안 + KIDI 학습노트
- **관리자**: 세션 `user.id === ADMIN_USER_ID`. `/admin`에서 회원 승인·배치 관리

## 시작하기

```bash
npm install
npm run dev   # http://localhost:3000
```

`.env.local`을 아래 환경변수로 구성해야 한다.

## 환경변수

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(공개) 키 — 클라이언트·공개 읽기 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키 — **서버 전용**, RLS 우회 (커밋 금지) |
| `ANTHROPIC_API_KEY` | Claude API — 주간 배치·PDF 파싱·AI 모범답안·KIDI |
| `OPENAI_API_KEY` | 임베딩(RAG) — 없으면 폴백 모드 |
| `CRON_SECRET` | `/api/cron/weekly` Bearer 인증 시크릿 |
| `ADMIN_USER_ID` | 관리자 판별용 Supabase Auth user UUID |

## 주요 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버(포트 3000) |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run lint` | ESLint |
| `npm run setup-admin` | 관리자 계정 설정 |
| `npm run parse-kidi` (`:dry`) | KIDI PDF 파싱 → `act_kidi_reports` 임포트 |
| `npm run kidi-relevance` | KIDI 시험 연관성 분류 |
| `npm run enrich-kidi` | KIDI 학습노트(`study_notes`) 생성 |
| `npm run regen-answers` | AI 모범답안 재생성 |

## 데이터베이스

스키마는 `supabase/migrations/*.sql`(9개 테이블), 타입은 `types/supabase.ts`. 자세한 내용은 `.claude/agents/db-architect/AGENT.md`, `docs/domain/schema.md` 참조.

## 배포 (Vercel Cron)

`vercel.json`에 주간 배치 Cron이 등록되어 있다.

```json
{ "crons": [{ "path": "/api/cron/weekly", "schedule": "0 23 * * *" }] }
```

`0 23 * * *`(UTC) = **매일 08:00 KST 실행**. `/api/cron/weekly`는 당주에 `status='published'` 이슈가 이미 있으면 no-op으로 종료하므로, 실질적으로 "주 1회 생성 + 실패 시 다음 날 자동 재시도"로 동작한다. 요청은 `Authorization: Bearer ${CRON_SECRET}`로 인증한다.
