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

  const { searchParams } = new URL(request.url);
  const issueNo = searchParams.get('issue_no');
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('act_kidi_reports')
    .select('id, issue_no, file_no, title, summary, key_points, tags, topic_category, source_file, processed_at', { count: 'exact' })
    .eq('status', 'processed')
    .order('issue_no', { ascending: false })
    .order('file_no', { ascending: true })
    .range(offset, offset + limit - 1);

  if (issueNo) query = query.eq('issue_no', parseInt(issueNo, 10));
  if (category) query = query.eq('topic_category', category);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}
