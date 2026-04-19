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
-- =========================================
-- AI 답안 캐시 테이블
-- question_key 형식:
--   기출문제:  past:{act_past_questions.id}
--   가상문제:  virtual:{issue_date}:{question_no}
-- =========================================

CREATE TABLE act_ai_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key text NOT NULL UNIQUE,
  answer       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE act_ai_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON act_ai_answers FOR SELECT USING (true);
-- =========================================
-- KIDI 보험연구원 주간지 보고서 테이블
-- =========================================

CREATE TABLE act_kidi_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_no        integer NOT NULL,           -- 권호 번호 (예: 635)
  file_no         integer,                    -- 파일 앞 번호 (예: 45)
  title           text NOT NULL,              -- 보고서 제목
  summary         text,                       -- Claude 생성 요약 (2~3문단)
  key_points      jsonb NOT NULL DEFAULT '[]', -- 핵심 포인트 배열 (문자열)
  tags            text[] NOT NULL DEFAULT '{}', -- 주제 태그
  topic_category  text,                       -- 주제 카테고리
  source_file     text NOT NULL,              -- 원본 파일명
  status          varchar(20) NOT NULL DEFAULT 'pending', -- pending | processed | error
  error_msg       text,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_file)
);

CREATE INDEX act_kidi_reports_issue_no_idx ON act_kidi_reports (issue_no);
CREATE INDEX act_kidi_reports_status_idx   ON act_kidi_reports (status);
CREATE INDEX act_kidi_reports_category_idx ON act_kidi_reports (topic_category);

ALTER TABLE act_kidi_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON act_kidi_reports FOR SELECT USING (true);
CREATE POLICY "service_role_write" ON act_kidi_reports FOR ALL USING (auth.role() = 'service_role');
-- =========================================
-- 회원 프로필 및 승인 관리 테이블
-- =========================================

CREATE TABLE act_user_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  name         text,
  status       varchar(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at   timestamptz NOT NULL DEFAULT now(),
  approved_at  timestamptz,
  rejected_at  timestamptz
);

ALTER TABLE act_user_profiles ENABLE ROW LEVEL SECURITY;

-- 본인만 자기 프로필 읽기 가능
CREATE POLICY "user_read_own" ON act_user_profiles
  FOR SELECT USING (auth.uid() = id);

-- service_role 전체 접근 (관리자 작업)
CREATE POLICY "service_role_all" ON act_user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- 회원가입 시 자동으로 프로필 생성하는 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.act_user_profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- KIDI 보고서에 시험 연관성 컬럼 추가
ALTER TABLE act_kidi_reports
  ADD COLUMN IF NOT EXISTS exam_relevance varchar(10) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS related_question_tags text[] NOT NULL DEFAULT '{}';

-- 연관성 인덱스
CREATE INDEX IF NOT EXISTS act_kidi_reports_relevance_idx ON act_kidi_reports (exam_relevance);
-- 발행 연월 표시 컬럼 추가
ALTER TABLE act_kidi_reports
  ADD COLUMN IF NOT EXISTS published_month VARCHAR(30);
-- 시험 학습용 상세 구조화 노트 컬럼 추가
ALTER TABLE act_kidi_reports
  ADD COLUMN IF NOT EXISTS study_notes TEXT;
