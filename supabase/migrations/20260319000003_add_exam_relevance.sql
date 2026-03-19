-- KIDI 보고서에 시험 연관성 컬럼 추가
ALTER TABLE act_kidi_reports
  ADD COLUMN IF NOT EXISTS exam_relevance varchar(10) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS related_question_tags text[] NOT NULL DEFAULT '{}';

-- 연관성 인덱스
CREATE INDEX IF NOT EXISTS act_kidi_reports_relevance_idx ON act_kidi_reports (exam_relevance);
