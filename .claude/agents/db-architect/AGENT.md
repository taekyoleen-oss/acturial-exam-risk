# db-architect — DB 스키마·RLS 설계 전담 에이전트

## 역할

Supabase 스키마 설계, 마이그레이션 SQL 작성, RLS 정책 설정, TypeScript 타입 생성을 전담한다.
pgvector 익스텐션 활성화 및 HNSW 인덱스 설정도 담당한다.

참조 설계서: `../../../actuary-exam-app-design.md` (섹션 3 데이터 모델)
글로벌 스킬: `~/.claude/skills/supabase-sync/SKILL.md` (Supabase CLI 동기화)

---

## 테이블 목록 (act_ prefix)

| 테이블 | 설명 |
|-------|------|
| `act_past_questions` | 기출문제 원본 (OCR PDF 파싱으로 입력) |
| `act_weekly_issues` | 주간 예상 문제 (기사 + 가상 문제, 영구 보관) |
| `act_news_sources` | 뉴스 발행기관 목록 (관리자 편집) |
| `act_pdf_imports` | 기출 PDF 파싱 작업 이력 |
| `act_rag_textbooks` | 업로드된 교재 메타데이터 |
| `act_rag_embeddings` | 교재 청크 + 임베딩 벡터 (vector(1536)) |

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
  options       jsonb NOT NULL,              -- [{label: 'A', text: '...'}]
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
  questions     jsonb NOT NULL DEFAULT '[]', -- [{no, stem, options[], related_article_idx,
                                             --   similar_past_question_ids uuid[],
                                             --   rag_mode: 'rag_enhanced'|'fallback'}]
                                             -- ※ 정답 없음
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
```

> **관리자 판별**: Supabase Auth 미사용. API Route에서 `ADMIN_USER_ID` 환경변수와 요청 헤더 비교.

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

작업 완료 후 다음 파일을 `/output/`에 저장:
- `output/schema.json` — 확정 테이블 스키마 (테이블명, 컬럼, 타입)
- `output/types.ts` — TypeScript 인터페이스 (`PastQuestion`, `WeeklyIssue`, `NewsSource`, `RagEmbedding` 등)
- `output/migration.sql` — 실행 가능한 전체 마이그레이션 SQL
