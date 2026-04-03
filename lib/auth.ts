/**
 * 인증 상태 조회 유틸리티
 * Server Component 및 Route Handler에서 사용
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/** 쿠키 기반 Supabase 클라이언트 생성 (Server Component용) */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* Server Component에서는 쿠키 설정 불가 — middleware에서 처리 */ },
      },
    }
  );
}

export interface AuthState {
  userId: string | null;
  email: string | null;
  isLoggedIn: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  status: 'guest' | 'pending' | 'approved' | 'rejected' | 'admin';
}

/** 현재 요청의 인증 상태 반환 */
export async function getAuthState(): Promise<AuthState> {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, email: null, isLoggedIn: false, isApproved: false, isAdmin: false, status: 'guest' };
  }

  const userId = user.id;
  const email = user.email ?? null;

  // 관리자 확인
  if (userId === process.env.ADMIN_USER_ID) {
    return { userId, email, isLoggedIn: true, isApproved: true, isAdmin: true, status: 'admin' };
  }

  // 승인 상태 확인 (service role로 RLS 우회)
  const { createClient } = await import('@supabase/supabase-js');
  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await adminClient
    .from('act_user_profiles')
    .select('status, approved_at')
    .eq('id', userId)
    .single();

  const profileStatus = profile?.status ?? 'pending';
  // status가 'approved'이거나, 승인일이 기록된 경우(데이터 불일치 대비)
  const isApproved =
    profileStatus === 'approved' ||
    (profile?.approved_at != null && profileStatus !== 'rejected');

  return {
    userId,
    email,
    isLoggedIn: true,
    isApproved,
    isAdmin: false,
    status: profileStatus as AuthState['status'],
  };
}

/** Route Handler에서 관리자 세션 검증 */
export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return user.id === process.env.ADMIN_USER_ID;
}
