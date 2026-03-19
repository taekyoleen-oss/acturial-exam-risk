import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

/** 권호 목록 + 카테고리 목록 반환 */
export async function GET() {
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
