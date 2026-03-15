-- =========================================
-- actuary-exam-app 초기 스키마 마이그레이션
-- v1.3 — 뉴스 기반 학습 참고 웹앱
-- =========================================

-- pgvector 익스텐션 (RAG 임베딩용)
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================
-- 1. 기출문제 원본
-- =========================================
CREATE TABLE act_past_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year          integer NOT NULL,
  session       varchar(10) NOT NULL DEFAULT '2차',
  subject       varchar(50) NOT NULL DEFAULT '리스크관리',
  question_no   integer NOT NULL,
  question_text text NOT NULL,
  options       jsonb NOT NULL DEFAULT '[]',
  answer        varchar(5),
  explanation   text,
  tags          text[],
  has_formula   boolean NOT NULL DEFAULT false,
  source_pdf    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, session, subject, question_no)
);

-- =========================================
-- 2. 주간 예상 문제
-- =========================================
CREATE TABLE act_weekly_issues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date    date NOT NULL UNIQUE,
  week_label    varchar(30) NOT NULL,
  articles      jsonb NOT NULL DEFAULT '[]',
  questions     jsonb NOT NULL DEFAULT '[]',
  generated_at  timestamptz,
  status        varchar(20) NOT NULL DEFAULT 'draft'
);

-- =========================================
-- 3. 뉴스 발행기관
-- =========================================
CREATE TABLE act_news_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  domain      text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- 4. 기출 PDF 파싱 이력
-- =========================================
CREATE TABLE act_pdf_imports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename       text NOT NULL,
  year           integer NOT NULL,
  session        varchar(10) NOT NULL DEFAULT '2차',
  status         varchar(20) NOT NULL DEFAULT 'pending',
  question_count integer,
  error_msg      text,
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

-- =========================================
-- 5. RAG 교재 메타데이터
-- =========================================
CREATE TABLE act_rag_textbooks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  subject      varchar(50) NOT NULL DEFAULT 'risk_management',
  edition      varchar(20),
  year         integer,
  total_chunks integer,
  source_file  text,
  checksum     varchar(64) UNIQUE,
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- 6. RAG 임베딩 청크
-- =========================================
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
  embedding     vector(1536) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX act_rag_embeddings_hnsw_idx
  ON act_rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- =========================================
-- RLS 활성화
-- =========================================
ALTER TABLE act_past_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_weekly_issues   ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_news_sources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_pdf_imports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_rag_textbooks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_rag_embeddings  ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS 정책 (공개 읽기)
-- =========================================
CREATE POLICY "public_read" ON act_past_questions  FOR SELECT USING (true);
CREATE POLICY "public_read" ON act_weekly_issues   FOR SELECT USING (true);
CREATE POLICY "public_read" ON act_news_sources    FOR SELECT USING (true);
CREATE POLICY "public_read" ON act_rag_textbooks   FOR SELECT USING (true);
CREATE POLICY "public_read" ON act_rag_embeddings  FOR SELECT USING (true);

-- =========================================
-- pgvector 유사도 검색 함수
-- =========================================
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
    e.id,
    e.content,
    e.chapter_title,
    e.section,
    e.has_formula,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM act_rag_embeddings e
  JOIN act_rag_textbooks t ON t.id = e.textbook_id
  WHERE t.subject = match_subject
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =========================================
-- 초기 뉴스 발행기관 데이터
-- =========================================
INSERT INTO act_news_sources (name, domain, is_active) VALUES
  ('한국경제',     'hankyung.com',    true),
  ('매일경제',     'mk.co.kr',        true),
  ('연합뉴스',     'yna.co.kr',       true),
  ('헤럴드경제',   'heraldcorp.com',  true),
  ('서울경제',     'sedaily.com',     true),
  ('금융감독원',   'fss.or.kr',       true),
  ('보험연구원',   'kiri.or.kr',      true),
  ('한국보험신문', 'insnews.co.kr',   true);
