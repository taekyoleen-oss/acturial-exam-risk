'use client';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// 브라우저 클라이언트 (공개 읽기 전용, 로그인 없음)
export const createSupabaseBrowserClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
