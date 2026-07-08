import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthState } from '@/lib/auth';

/** 권호 목록 + 카테고리 목록 반환 */
export async function GET() {
  const auth = await getAuthState();
  if (!auth.isLoggedIn || !auth.isApproved) {
    return NextResponse.json(
      { error: '승인된 회원만 이용할 수 있습니다.' },
      { status: 403 }
    );
  }

  const [issuesRes, categoriesRes, statsRes] = await Promise.all([
    supabaseAdmin
      .from('act_kidi_reports')
      .select('issue_no')
      .eq('status', 'processed')
      .order('issue_no', { ascending: false }),
    supabaseAdmin
      .from('act_kidi_reports')
      .select('topic_category')
      .eq('status', 'processed')
      .not('topic_category', 'is', null),
    supabaseAdmin
      .from('act_kidi_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processed'),
  ]);

  // 중복 제거
  const issueNos = [...new Set((issuesRes.data ?? []).map((r) => r.issue_no))];
  const categories = [...new Set((categoriesRes.data ?? []).map((r) => r.topic_category))].sort();

  return NextResponse.json({
    issueNos,
    categories,
    totalCount: statsRes.count ?? 0,
  });
}
