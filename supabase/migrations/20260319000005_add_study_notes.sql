-- 시험 학습용 상세 구조화 노트 컬럼 추가
ALTER TABLE act_kidi_reports
  ADD COLUMN IF NOT EXISTS study_notes TEXT;
