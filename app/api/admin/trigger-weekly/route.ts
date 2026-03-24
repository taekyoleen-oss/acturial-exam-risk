import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { resolveRagMode } from '@/lib/rag/resolver';
import { searchQuestionsByKeywords } from '@/lib/supabase/queries/past-questions';
import { upsertWeeklyIssue } from '@/lib/supabase/queries/weekly';
import { collectNewsArticles, generateVirtualQuestions } from '@/lib/claude/generate-weekly';
import { getMondayOfWeek, getWeekLabel } from '@/lib/utils/week';
import type { Json } from '@/types/supabase';
import type { GeneratedQuestion } from '@/lib/claude/generate-weekly';

export const maxDuration = 300;

const ACTUARIAL_TERMS = [
  'IFRS17', 'CSM', 'K-ICS', 'UFR', '계리', '무저해지', '실손보험',
  '금리리스크', '예실차', '보험부채', '지급여력', '할인율', '해지율',
  '손해율', '계약서비스마진', '재보험', '보험료적립금', '위험준비금',
  '보험계약', '계리적가정', '금감원', '보험사', '경험통계',
];

function extractKeyTerms(text: string): string[] {
  return ACTUARIAL_TERMS.filter((t) => text.includes(t)).slice(0, 3);
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });
  }

  // KST 기준 이번 주 월요일 (몇 시에 호출해도 항상 이번 주 월요일 기준)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const issueDate = getMondayOfWeek(kstNow);
  const weekLabel = getWeekLabel(new Date(issueDate));

  // 이미 published 상태면 스킵
  const { data: existing } = await supabaseAdmin
    .from('act_weekly_issues')
    .select('id, status')
    .eq('issue_date', issueDate)
    .single();

  if (existing?.status === 'published') {
    return NextResponse.json({ ok: true, skipped: true, message: '이미 이번 주 데이터가 존재합니다.' });
  }

  await upsertWeeklyIssue({
    issue_date: issueDate,
    week_label: weekLabel,
    articles: [] as Json,
    questions: [] as Json,
    generated_at: new Date().toISOString(),
    status: 'draft',
  });

  try {
    const { data: sources } = await supabaseAdmin
      .from('act_news_sources')
      .select('domain')
      .eq('is_active', true);
    const domains = (sources ?? []).map((s) => s.domain);

    const articles = await collectNewsArticles(domains);
    if (!articles.length) throw new Error('수집된 기사 없음');

    const pastIdsByArticle: Record<number, string[]> = {};
    for (let i = 0; i < articles.length; i++) {
      const similar = await searchQuestionsByKeywords(articles[i].keywords, 3);
      pastIdsByArticle[i] = similar.map((q) => q.id);
    }

    const allKeywords = articles.flatMap((a) => a.keywords);
    const ragContext = await resolveRagMode(allKeywords);

    const { data: sampleQs } = await supabaseAdmin
      .from('act_past_questions')
      .select('question_no, question_text, options')
      .limit(10);

    const sampleText = (sampleQs ?? [])
      .map((q) => `Q${q.question_no}. ${q.question_text}`)
      .join('\n\n');

    const rawQuestions = await generateVirtualQuestions(
      articles,
      sampleText,
      ragContext,
      pastIdsByArticle
    );

    const questions: GeneratedQuestion[] = await Promise.all(
      rawQuestions.map(async (q) => {
        const stemTerms = extractKeyTerms(q.stem);
        if (!stemTerms.length) return q;
        const stemResults = await searchQuestionsByKeywords(stemTerms, 2);
        const stemIds = stemResults.map((r) => r.id);
        const merged = [...new Set([...q.similar_past_question_ids, ...stemIds])].slice(0, 3);
        return { ...q, similar_past_question_ids: merged };
      })
    );

    await upsertWeeklyIssue({
      issue_date: issueDate,
      week_label: weekLabel,
      articles: articles as unknown as Json,
      questions: questions as unknown as Json,
      generated_at: new Date().toISOString(),
      status: 'published',
    });

    return NextResponse.json({
      ok: true,
      skipped: false,
      issueDate,
      weekLabel,
      articles: articles.length,
      questions: questions.length,
      ragMode: ragContext.mode,
    });
  } catch (err) {
    await upsertWeeklyIssue({
      issue_date: issueDate,
      week_label: weekLabel,
      articles: [] as Json,
      questions: [] as Json,
      generated_at: new Date().toISOString(),
      status: 'failed',
    });

    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
