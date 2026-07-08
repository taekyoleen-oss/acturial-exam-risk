# db-architect — DB 스키마·RLS 설계 전담 에이전트

## 역할

Supabase 스키마 설계, 마이그레이션 SQL 작성, RLS 정책 설정, TypeScript 타입 생성을 전담한다.
pgvector 익스텐션 활성화 및 HNSW 인덱스 설정도 담당한다.

참조 설계서: `../../../actuary-exam-app-design.md` (섹션 3 데이터 모델)
글로벌 스킬: `~/.claude/skills/supabase-sync/SKILL.md` (Supabase CLI 동기화)

---

## 테이블 목록 (act_ prefix) — 9개

| 테이블 | 설명 |
|-------|------|
| `act_past_questions` | 기출문제 원본 (OCR PDF 파싱으로 입력) |
| `act_weekly_issues` | 주간 예상 문제 (기사 + 가상 문제, 영구 보관) |
| `act_news_sources` | 뉴스 발행기관 목록 (관리자 편집) |
| `act_pdf_imports` | 기출 PDF 파싱 작업 이력 |
| `act_rag_textbooks` | 업로드된 교재 메타데이터 |
| `act_rag_embeddings` | 교재 청크 + 임베딩 벡터 (vector(1536)) |
| `act_ai_answers` | AI 모범답안 캐시 (승인 회원 전용 응답, `question_key` UNIQUE) |
| `act_kidi_reports` | 보험연구원(KIDI) 보고서 — 요약·태그·연관성·학습노트 |
| `act_user_profiles` | 회원 프로필 + 승인 상태 (`auth.users` 참조) |

> 마이그레이션 소스: `supabase/migrations/`, 전체 스키마 스냅샷: `supabase/full_schema_for_new_project.sql`, 타입: `types/supabase.ts`.

---

## 스키마 상세

### act_past_questions
```sql
CREATE TABLE act_past_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year          integer NOT NULL,
  session       varchar(10) NOT NULL,        -- '2차'
  subject       varchar(50) NOT NULL DEFAULT '리스크관리',
  question_no   integer NOT NULL,
  question_text text NOT NULL,
  options       jsonb NOT NULL,              -- 2차는 주관식이라 빈 배열 [] 저장 (선택지 없음)
  answer        varchar(5),                  -- DB 보관용, API 응답에 포함 금지
  explanation   text,                        -- DB 보관용, API 응답에 포함 금지
  tags          text[],
  has_formula   boolean NOT NULL DEFAULT false,
  source_pdf    text,                        -- act_pdf_imports 참조용
  created_at    timestamptz DEFAULT now()
);
```

> **중요**: `answer`, `explanation` 컬럼은 관리자 전용. 공개 API에서 SELECT 시 반드시 제외.

### act_weekly_issues
```sql
CREATE TABLE act_weekly_issues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date    date NOT NULL UNIQUE,        -- 해당 주 월요일
  week_label    varchar(20) NOT NULL,        -- '2025년 3월 3주차'
  articles      jsonb NOT NULL DEFAULT '[]', -- [{title, source, url, summary, published_at, keywords[]}]
  questions     jsonb NOT NULL DEFAULT '[]', -- [{no, stem, topic_tag, related_article_idx,
                                             --   similar_past_question_ids uuid[],
                                             --   rag_mode: 'rag_enhanced'|'fallback', has_formula}]
                                             -- ※ 주관식(선택지 없음), 정답 없음
  generated_at  timestamptz,
  status        varchar(20) NOT NULL DEFAULT 'draft' -- 'draft'|'published'|'failed'
);
```

### act_news_sources
```sql
CREATE TABLE act_news_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,      -- '한국경제', '매일경제'
  domain      text NOT NULL,      -- 'hankyung.com'
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
```

### act_pdf_imports
```sql
CREATE TABLE act_pdf_imports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename       text NOT NULL,
  year           integer NOT NULL,
  session        varchar(10) NOT NULL DEFAULT '2차',
  status         varchar(20) NOT NULL DEFAULT 'pending', -- 'pending'|'processing'|'completed'|'failed'
  question_count integer,
  error_msg      text,
  uploaded_at    timestamptz DEFAULT now(),
  completed_at   timestamptz
);
```

### act_rag_textbooks
```sql
CREATE TABLE act_rag_textbooks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  subject      varchar(50) NOT NULL DEFAULT 'risk_management',
  edition      varchar(20),
  year         integer,
  total_chunks integer,
  source_file  text,
  checksum     varchar(64) UNIQUE,
  uploaded_at  timestamptz DEFAULT now()
);
```

### act_rag_embeddings
```sql
-- pgvector 익스텐션 필요
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE act_rag_embeddings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id   uuid NOT NULL REFERENCES act_rag_textbooks(id) ON DELETE CASCADE,
  chunk_index   integer NOT NULL,
  chapter       integer,
  chapter_title text,
  section       text,
  page_start    integer,
  content       text NOT NULL,
  has_formula   boolean NOT NULL DEFAULT false,
  embedding     vector(1536) NOT NULL,  -- OpenAI text-embedding-3-small
  created_at    timestamptz DEFAULT now()
);

-- HNSW 인덱스 (코사인 유사도)
CREATE INDEX ON act_rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### act_ai_answers
```sql
-- AI 모범답안 캐시 (승인 회원 전용 /api/answer 응답)
-- question_key: 기출 'past:{id}' | 가상 'virtual:{issue_date}:{question_no}'
CREATE TABLE act_ai_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key text NOT NULL UNIQUE,
  answer       text NOT NULL,          -- Claude 생성 모범답안 (마크다운, 1,500자+)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

### act_kidi_reports
```sql
-- 보험연구원(KIDI) 보고서. 임포트 → enrich → 학습노트 파이프라인
CREATE TABLE act_kidi_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_no              integer NOT NULL,               -- 권호 (예: 635)
  file_no               integer,                        -- 파일 앞 번호
  title                 text NOT NULL,
  summary               text,                           -- Claude 생성 요약
  key_points            jsonb NOT NULL DEFAULT '[]',
  tags                  text[] NOT NULL DEFAULT '{}',
  topic_category        text,
  source_file           text NOT NULL,
  status                varchar(20) NOT NULL DEFAULT 'pending', -- pending|processed|error
  error_msg             text,
  processed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  -- ALTER 추가분 (마이그레이션 3~5)
  exam_relevance        varchar(10) DEFAULT 'medium',   -- high|medium|low
  related_question_tags text[] NOT NULL DEFAULT '{}',
  published_month       varchar(30),
  study_notes           text,                           -- 승인 회원용 학습노트 (마크다운)
  UNIQUE (source_file)
);
```

### act_user_profiles
```sql
-- 회원 프로필 + 승인. auth.users INSERT 시 트리거로 자동 생성
CREATE TABLE act_user_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  name         text,
  status       varchar(20) NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  created_at   timestamptz NOT NULL DEFAULT now(),
  approved_at  timestamptz,
  rejected_at  timestamptz
);
-- 트리거 handle_new_user(): auth.users AFTER INSERT → act_user_profiles INSERT
```

---

## RLS 정책

```sql
-- 모든 공개 테이블: SELECT 전체 허용
ALTER TABLE act_past_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_weekly_issues  ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_news_sources   ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_rag_textbooks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_rag_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_pdf_imports    ENABLE ROW LEVEL SECURITY;

-- SELECT 공개
CREATE POLICY "public_read" ON act_past_questions FOR SELECT USING (true);
CREATE POLICY "public_read" ON act_weekly_issues  FOR SELECT USING (true);
CREATE POLICY "public_read" ON act_news_sources   FOR SELECT USING (true);
CREATE POLICY "public_read" ON act_rag_textbooks  FOR SELECT USING (true);
CREATE POLICY "public_read" ON act_rag_embeddings FOR SELECT USING (true);

-- 쓰기는 service_role 키(서버)만 허용 (RLS 정책 없음 = service_role로만 INSERT/UPDATE/DELETE)
-- API Route Handler에서 SUPABASE_SERVICE_ROLE_KEY 사용 시 RLS 우회 적용

-- 신규 테이블
ALTER TABLE act_kidi_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_ai_answers     ENABLE ROW LEVEL SECURITY;

-- act_kidi_reports: 공개 읽기 + service_role 쓰기
CREATE POLICY "public_read"        ON act_kidi_reports FOR SELECT USING (true);
CREATE POLICY "service_role_write" ON act_kidi_reports FOR ALL USING (auth.role() = 'service_role');

-- act_user_profiles: 본인 프로필만 읽기 + service_role 전체
CREATE POLICY "user_read_own"   ON act_user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "service_role_all" ON act_user_profiles FOR ALL USING (auth.role() = 'service_role');
```

> **인증 모델**: **Supabase Auth 사용**(이메일/비밀번호). 3단계 — 게스트/승인 회원/관리자.
> - **회원 승인**: `act_user_profiles.status`(pending→approved). 승인 회원 전용 콘텐츠(AI 모범답안·KIDI 학습노트·기출 전체)는 앱 서버(`getAuthState().isApproved`)에서 게이트하고, DB 접근은 `supabaseAdmin`(service_role)로 수행.
> - **관리자 판별**: 세션 `user.id === ADMIN_USER_ID`(`verifyAdminSession`). 일부 CLI 경유 관리자 API는 `x-admin-id` 헤더 비교(`verifyAdmin`)도 사용.
> - `act_ai_answers`는 앱이 `supabaseAdmin`으로만 접근한다(승인 게이트는 API 단). anon 직접 조회를 막으려면 public_read 정책 제거가 필요하다(보안 항목).

---

## 유사도 검색 함수

```sql
-- 교재 청크 코사인 유사도 검색
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(1536),
  match_subject   varchar(50),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id            uuid,
  content       text,
  chapter_title text,
  section       text,
  has_formula   boolean,
  similarity    float
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.content, e.chapter_title, e.section, e.has_formula,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM act_rag_embeddings e
  JOIN act_rag_textbooks t ON t.id = e.textbook_id
  WHERE t.subject = match_subject
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## 산출물

작업 완료 후 다음 코드 경로를 갱신한다(`output/` 산출물 규약은 사용하지 않음):
- `supabase/migrations/*.sql` — 실행 가능한 마이그레이션 (스키마·RLS·인덱스·트리거)
- `supabase/full_schema_for_new_project.sql` — 신규 프로젝트용 전체 스키마 스냅샷
- `types/supabase.ts` — Supabase 자동 생성 `Database` 타입, 도메인 타입은 `types/`
