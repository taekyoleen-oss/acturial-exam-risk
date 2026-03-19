import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: '이메일과 비밀번호는 필수입니다.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
  }

  // service_role로 회원 생성 (이메일 인증 없이)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // 이메일 인증 없이 바로 계정 생성
    user_metadata: { name: name ?? '' },
  });

  if (error) {
    const msg = error.message.includes('already registered')
      ? '이미 사용 중인 이메일입니다.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 프로필은 트리거로 자동 생성됨 (status: 'pending')
  return NextResponse.json({ userId: data.user.id });
}
