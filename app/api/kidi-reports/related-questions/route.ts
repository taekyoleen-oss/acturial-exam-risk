/**
 * KIDI 보고서와 연관된 기출문제 반환
 * GET /api/kidi-reports/related-questions?tags=태그1,태그2&category=카테고리&limit=5
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tagsParam = searchParams.get('tags') ?? '';
  const category = searchParams.get('category') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '4', 10), 10);

  const tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length === 0 && !category) {
    return NextResponse.json({ data: [] });
  }

  // 태그 겹치는 기출문제 조회 (PostgreSQL && 연산자: 배열 교집합)
  const { data, error } = await supabaseAdmin
    .from('act_past_questions')
    .select('id, year, question_no, question_text, tags')
    .overlaps('tags', tags.length > 0 ? tags : [category])
    .order('year', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ data: [] });

  return NextResponse.json({
    data: (data ?? []).map(q => ({
      id: q.id,
      year: q.year,
      question_no: q.question_no,
      question_text: (q.question_text ?? '').slice(0, 120) + '...',
      tags: q.tags ?? [],
    })),
  });
}
