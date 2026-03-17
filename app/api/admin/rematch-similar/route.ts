/**
 * 유사 기출문제 재매핑 API (관리자 전용)
 *
 * 기존 published 이슈의 similar_past_question_ids를
 * 기사 키워드 + 문제 본문 핵심어로 재검색하여 업데이트한다.
 *
 * GET /api/admin/rematch-similar?issue_date=YYYY-MM-DD
 * Header: x-admin-id: <ADMIN_USER_ID>
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { searchQuestionsByKeywords } from '@/lib/supabase/queries/past-questions';
import type { Json } from '@/types/supabase';
import type { GeneratedArticle, GeneratedQuestion } from '@/lib/claude/generate-weekly';

const ACTUARIAL_TERMS = [
  'IFRS17', 'CSM', 'K-ICS', 'UFR', '계리', '무저해지', '실손보험',
  '금리리스크', '예실차', '보험부채', '지급여력', '할인율', '해지율',
  '손해율', '계약서비스마진', '재보험', '보험료적립금', '위험준비금',
  '보험계약', '계리적가정', '금감원', '보험사', '경험통계',
];

function extractKeyTerms(text: string): string[] {
  return ACTUARIAL_TERMS.filter((t) => text.includes(t)).slice(0, 3);
}

export async function GET(request: NextRequest) {
  // 관리자 인증
  const adminId = request.headers.get('x-admin-id');
  if (!adminId || adminId !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const issueDate = request.nextUrl.searchParams.get('issue_date');
  if (!issueDate) {
    return NextResponse.json(
      { error: 'issue_date 파라미터가 필요합니다 (예: ?issue_date=2026-03-16)' },
      { status: 400 }
    );
  }

  // 이슈 조회
  const { data: issue, error } = await supabaseAdmin
    .from('act_weekly_issues')
    .select('*')
    .eq('issue_date', issueDate)
    .single();

  if (error || !issue) {
    return NextResponse.json(
      { error: `${issueDate} 이슈를 찾을 수 없습니다` },
      { status: 404 }
    );
  }

  const articles = (issue.articles ?? []) as unknown as GeneratedArticle[];
  const questions = (issue.questions ?? []) as unknown as GeneratedQuestion[];

  if (!articles.length) {
    return NextResponse.json({ error: '이슈에 기사 데이터가 없습니다' }, { status: 422 });
  }

  // 기사별 키워드로 유사 기출 검색 (기사당 최대 3개)
  const pastIdsByArticle: Record<number, string[]> = {};
  for (let i = 0; i < articles.length; i++) {
    const keywords = articles[i].keywords ?? [];
    if (!keywords.length) {
      pastIdsByArticle[i] = [];
      continue;
    }
    const similar = await searchQuestionsByKeywords(keywords, 3);
    pastIdsByArticle[i] = similar.map((q) => q.id);
  }

  // 문제 본문 핵심어로 추가 검색 → 병합 (최대 3개)
  const updatedQuestions: GeneratedQuestion[] = await Promise.all(
    questions.map(async (q) => {
      const articleIds = pastIdsByArticle[q.related_article_idx] ?? [];
      const stemTerms = extractKeyTerms(q.stem);

      let mergedIds = [...articleIds];
      if (stemTerms.length > 0) {
        const stemResults = await searchQuestionsByKeywords(stemTerms, 2);
        const stemIds = stemResults.map((r) => r.id);
        mergedIds = [...new Set([...articleIds, ...stemIds])].slice(0, 3);
      }

      return { ...q, similar_past_question_ids: mergedIds };
    })
  );

  // DB 업데이트
  const { error: updateError } = await supabaseAdmin
    .from('act_weekly_issues')
    .update({ questions: updatedQuestions as unknown as Json })
    .eq('issue_date', issueDate);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const totalMatched = updatedQuestions.reduce(
    (sum, q) => sum + (q.similar_past_question_ids?.length ?? 0),
    0
  );

  return NextResponse.json({
    ok: true,
    issue_date: issueDate,
    week_label: issue.week_label,
    questions_updated: updatedQuestions.length,
    similar_past_total: totalMatched,
    per_question: updatedQuestions.map((q) => ({
      no: q.no,
      matched: q.similar_past_question_ids?.length ?? 0,
      ids: q.similar_past_question_ids,
    })),
  });
}
