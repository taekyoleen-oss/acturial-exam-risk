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
