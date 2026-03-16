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
