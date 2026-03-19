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
