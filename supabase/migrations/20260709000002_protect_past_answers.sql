-- =========================================
-- act_past_questions.answer / explanation 컬럼 anon 노출 차단
--
-- 배경: act_past_questions 에는 "public_read" (USING true) RLS 정책이 있어
--       anon 클라이언트가 테이블을 직접 조회할 수 있다. 이때 SELECT *
--       또는 answer/explanation 을 명시하면 정답·해설이 노출된다.
--       (도메인 제약: answer/explanation 은 공개 API·UI 노출 금지.)
--
-- 조치(방법 a — 컬럼 레벨 권한 제한):
--   PostgreSQL 에서 테이블 레벨 SELECT 권한이 있으면 컬럼 단위 REVOKE 가
--   효력이 없다. 따라서 테이블 레벨 SELECT 를 회수한 뒤, 공개 가능한
--   컬럼에 한해 컬럼 레벨 SELECT 를 재부여한다. answer/explanation 은
--   제외되어 anon/authenticated 의 직접 조회가 차단된다.
--   RLS "public_read" 정책은 그대로 두어 행 접근은 유지된다.
--
-- 영향 분석:
--   * 앱 공개 경로는 정답/해설을 제외한 명시적 컬럼만 select 하므로 무영향.
--   * 관리자/서버 경로는 supabaseAdmin(service_role)을 사용하며
--     service_role 은 컬럼 권한을 우회하므로 answer/explanation 접근 유지.
--
-- ⚠️ 프로덕션 적용 주의:
--   1) 이 파일은 작성만 되어 있으며 아직 원격 DB 에 적용하지 않았다.
--   2) 적용 시 anon 키로 answer/explanation 을 명시 select 하는 코드가
--      있으면 그 요청은 권한 오류가 난다. 적용 전 재확인 필요.
--   3) 컬럼 목록은 현재 스키마(init_schema) 기준이며, 이후 컬럼 추가 시
--      이 GRANT 목록도 함께 갱신해야 새 컬럼이 anon 에 노출된다.
--   사용자 승인 하에 supabase db push 로 반영할 것.
-- =========================================

REVOKE SELECT ON act_past_questions FROM anon, authenticated;

GRANT SELECT (
  id,
  year,
  session,
  subject,
  question_no,
  question_text,
  options,
  tags,
  has_formula,
  source_pdf,
  created_at
) ON act_past_questions TO anon, authenticated;
