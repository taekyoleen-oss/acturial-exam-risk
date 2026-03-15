import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// 공개 읽기용 (RLS 적용, Server Component에서 사용)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 관리자 작업용 (RLS 우회, Route Handler 서버 전용)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
