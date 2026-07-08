-- =========================================
-- act_ai_answers 공개 읽기 정책 제거
--
-- 배경: act_ai_answers.answer 는 AI가 생성한 정답/해설 성격의 캐시로,
--       승인 게이트(/api/answer)를 통해서만 노출되어야 한다.
--       기존 "public_read" (USING true) 정책은 anon 클라이언트에서
--       테이블을 직접 조회하면 승인 게이트를 우회할 수 있게 한다.
--
-- 영향 분석: 앱 서버 코드는 이 테이블을 supabaseAdmin(service_role)으로만
--       접근하므로 RLS 정책의 영향을 받지 않는다. 따라서 이 정책 제거는
--       앱 동작에 영향이 없다. (RLS는 여전히 ENABLED 상태로 유지되어
--       anon/authenticated 의 직접 SELECT 는 정책 부재로 차단된다.)
--
-- ⚠️ 프로덕션 적용 주의: 이 파일은 작성만 되어 있으며, 아직 원격 DB에
--       적용하지 않았다. 적용 전 anon 경로 직접 조회 의존 코드가 없는지
--       재확인 후 사용자 승인 하에 supabase db push 로 반영할 것.
-- =========================================

DROP POLICY IF EXISTS "public_read" ON act_ai_answers;
