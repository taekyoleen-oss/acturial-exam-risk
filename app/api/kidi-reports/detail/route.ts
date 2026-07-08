/**
 * 전문기관 보고서 상세 조회
 * GET /api/kidi-reports/detail?id=...
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthState } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthState();
  if (!auth.isLoggedIn || !auth.isApproved) {
    return NextResponse.json(
      { error: '승인된 회원만 이용할 수 있습니다.' },
      { status: 403 }
    );
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('act_kidi_reports')
    .select('id, issue_no, title, topic_category, exam_relevance, published_month, summary, key_points, tags, study_notes')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    data: {
      ...data,
      key_points: Array.isArray(data.key_points) ? data.key_points : [],
    },
  });
}
