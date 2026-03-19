/**
 * 기출문제와 연관된 KIDI 보고서 반환
 * GET /api/past-questions/related-kidi?tags=태그1,태그2&limit=3
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tagsParam = searchParams.get('tags') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '3', 10), 6);

  const tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length === 0) return NextResponse.json({ data: [] });

  const { data, error } = await supabaseAdmin
    .from('act_kidi_reports')
    .select('id, issue_no, title, topic_category, exam_relevance, tags')
    .eq('status', 'processed')
    .overlaps('tags', tags)
    .order('exam_relevance', { ascending: true }) // high가 먼저 오도록 (알파벳순: high < low < medium)
    .order('issue_no', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ data: [] });
  return NextResponse.json({ data: data ?? [] });
}
