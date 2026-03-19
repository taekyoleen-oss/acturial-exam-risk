-- 발행 연월 표시 컬럼 추가
ALTER TABLE act_kidi_reports
  ADD COLUMN IF NOT EXISTS published_month VARCHAR(30);
