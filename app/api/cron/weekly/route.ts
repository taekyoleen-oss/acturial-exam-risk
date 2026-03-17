import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { resolveRagMode } from '@/lib/rag/resolver';
import { searchQuestionsByKeywords } from '@/lib/supabase/queries/past-questions';
import { upsertWeeklyIssue } from '@/lib/supabase/queries/weekly';
import { collectNewsArticles, generateVirtualQuestions } from '@/lib/claude/generate-weekly';
import { getMondayOfWeek, getWeekLabel } from '@/lib/utils/week';
import type { Json } from '@/types/supabase';
import type { GeneratedQuestion } from '@/lib/claude/generate-weekly';

export const maxDuration = 300; // 5분 (Vercel Pro)

/** 계리리스크관리 주요 용어 — 문제 본문에서 핵심 키워드 추출 */
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
  // Cron 인증
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ★ KST 기준으로 이번 주 월요일 계산 (서버는 UTC → +9h 보정)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const issueDate = getMondayOfWeek(kstNow);
  const weekLabel = getWeekLabel(new Date(issueDate));

  // 이미 이번 주 데이터 있으면 스킵
  const { data: existing } = await supabaseAdmin
    .from('act_weekly_issues')
    .select('id, status')
    .eq('issue_date', issueDate)
    .single();

  if (existing?.status === 'published') {
    return NextResponse.json({ ok: true, message: '이미 이번 주 데이터 존재' });
  }

  // draft 레코드 생성 (배치 시작 표시)
  await upsertWeeklyIssue({
    issue_date: issueDate,
    week_label: weekLabel,
    articles: [] as Json,
    questions: [] as Json,
    generated_at: new Date().toISOString(),
    status: 'draft',
  });

  try {
    // 1. 활성 뉴스 소스 목록 조회
    const { data: sources } = await supabaseAdmin
      .from('act_news_sources')
      .select('domain')
      .eq('is_active', true);
    const domains = (sources ?? []).map((s) => s.domain);

    // 2. 뉴스 수집 (직전 7일)
    const articles = await collectNewsArticles(domains);
    if (!articles.length) throw new Error('수집된 기사 없음');

    // 3. 유사 기출 매핑 — 기사 키워드로 검색 (기사별 최대 3개)
    const pastIdsByArticle: Record<number, string[]> = {};
    for (let i = 0; i < articles.length; i++) {
      const similar = await searchQuestionsByKeywords(articles[i].keywords, 3);
      pastIdsByArticle[i] = similar.map((q) => q.id);
    }

    // 4. RAG 분기 판단
    const allKeywords = articles.flatMap((a) => a.keywords);
    const ragContext = await resolveRagMode(allKeywords);

    // 5. 기출 샘플 조회 (문제 생성 참고용, 정답 제외)
    const { data: sampleQs } = await supabaseAdmin
      .from('act_past_questions')
      .select('question_no, question_text, options')
      .limit(10);

    const sampleText = (sampleQs ?? [])
      .map((q) => `Q${q.question_no}. ${q.question_text}`)
      .join('\n\n');

    // 6. 가상 문제 생성
    const rawQuestions = await generateVirtualQuestions(
      articles,
      sampleText,
      ragContext,
      pastIdsByArticle
    );

    // 7. ★ 문제 본문 핵심어로 유사 기출 추가 검색 → ID 병합 (최대 3개)
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

    // 8. 저장
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
      issueDate,
      articles: articles.length,
      questions: questions.length,
      ragMode: ragContext.mode,
      similarPastTotal: questions.reduce((s, q) => s + q.similar_past_question_ids.length, 0),
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

    console.error('[cron/weekly] 실패:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
