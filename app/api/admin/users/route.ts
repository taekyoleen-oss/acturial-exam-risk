import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

/** 회원 목록 조회 (관리자) */
export async function GET(request: NextRequest) {
  if (!await verifyAdminSession()) return NextResponse.json(null, { status: 404 });

  const status = new URL(request.url).searchParams.get('status') ?? 'pending';

  const { data, error } = await supabaseAdmin
    .from('act_user_profiles')
    .select('id, email, name, status, created_at, approved_at, rejected_at')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/** 회원 승인/거절 (관리자) */
export async function PATCH(request: NextRequest) {
  if (!await verifyAdminSession()) return NextResponse.json(null, { status: 404 });

  const { userId, action } = await request.json() as { userId: string; action: 'approve' | 'reject' };

  if (!userId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'userId, action(approve|reject) 필수' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update = action === 'approve'
    ? { status: 'approved', approved_at: now, rejected_at: null }
    : { status: 'rejected', rejected_at: now, approved_at: null };

  const { error } = await supabaseAdmin
    .from('act_user_profiles')
    .update(update)
    .eq('id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
