/**
 * 답안 캐시 초기화 (전체 또는 특정 키 prefix)
 * DELETE /api/admin/clear-answers?prefix=all|past|virtual|kidi
 */
import { type NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const prefix = request.nextUrl.searchParams.get('prefix') ?? 'all';

  let query = supabaseAdmin.from('act_ai_answers').delete();

  if (prefix === 'past') {
    query = query.like('question_key', 'past:%');
  } else if (prefix === 'virtual') {
    query = query.like('question_key', 'virtual:%');
  } else if (prefix === 'kidi') {
    // KIDI 반영 답안만 삭제 (:kidi suffix)
    query = query.like('question_key', '%:kidi');
  } else {
    // 전체 삭제 — neq로 불가능한 조건 우회
    query = query.gte('created_at', '2000-01-01');
  }

  const { error, count } = await query.select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: count ?? 0 });
}
