/**
 * 주간 예상문제 배치 공통 로직
 * cron/weekly 와 admin/trigger-weekly 양쪽에서 호출
 */
import { supabaseAdmin } from '@/lib/supabase/server';
import { resolveRagMode } from '@/lib/rag/resolver';
import { searchQuestionsByKeywords } from '@/lib/supabase/queries/past-questions';
import { upsertWeeklyIssue, getRecentPublishedQuestions } from '@/lib/supabase/queries/weekly';
import { collectNewsArticles, generateVirtualQuestions } from '@/lib/claude/generate-weekly';
import type { Json } from '@/types/supabase';
import type { GeneratedQuestion } from '@/lib/claude/generate-weekly';

// 시험에 출제되는 모든 주제 태그
const ALL_TOPIC_TAGS = [
  '계리기법/기초서류',
  'ERM/전사리스크',
  'K-ICS/지급여력',
  '재보험',
  'IFRS17/보험부채',
  'CSM/계리가정',
  '금리리스크/ALM',
  '시장리스크/VaR',
  '신용위험',
  '운영위험',
] as const;

// 주제별 기출 샘플 조회 (각 태그에서 최신 1~2문제)
async function fetchPastQuestionsByTopic(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  await Promise.all(
    ALL_TOPIC_TAGS.map(async (tag) => {
      const { data } = await supabaseAdmin
        .from('act_past_questions')
        .select('year, session, question_no, question_text')
        .contains('tags', [tag])
        .order('year', { ascending: false })
        .limit(2);

      if (data && data.length > 0) {
        result[tag] = data
          .map((q) => `[${q.year}년 ${q.session} Q${q.question_no}] ${q.question_text.slice(0, 200)}…`)
          .join('\n');
      }
    })
  );

  return result;
}

// 최근 N주 이슈에서 사용된 topic_tag 목록 추출
function extractRecentTopics(recentQuestions: Json[]): string[] {
  const tags: string[] = [];
  for (const q of recentQuestions) {
    const question = q as Record<string, unknown>;
    if (typeof question.topic_tag === 'string' && question.topic_tag) {
      tags.push(question.topic_tag);
    }
  }
  // 2회 이상 나온 태그만 "회피 대상"으로 (1회는 허용)
  const counts = new Map<string, number>();
  tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  return [...counts.entries()].filter(([, c]) => c >= 2).map(([t]) => t);
}

const ACTUARIAL_TERMS = [
  'IFRS17', 'CSM', 'K-ICS', 'UFR', '계리', '무저해지', '실손보험',
  '금리리스크', '예실차', '보험부채', '지급여력', '할인율', '해지율',
  '손해율', '계약서비스마진', '재보험', '보험료적립금', '위험준비금',
  '보험계약', '계리적가정', '금감원', '보험사', '경험통계',
];

function extractKeyTerms(text: string): string[] {
  return ACTUARIAL_TERMS.filter((t) => text.includes(t)).slice(0, 3);
}

export interface BatchResult {
  issueDate: string;
  weekLabel: string;
  articles: number;
  questions: number;
  ragMode: string;
  recentTopicsAvoided: string[];
}

export async function runWeeklyBatch(
  issueDate: string,
  weekLabel: string
): Promise<BatchResult> {
  // 1. 활성 뉴스 소스
  const { data: sources } = await supabaseAdmin
    .from('act_news_sources')
    .select('domain')
    .eq('is_active', true);
  const domains = (sources ?? []).map((s) => s.domain);

  // 2. 뉴스 수집 (5~10개)
  const articles = await collectNewsArticles(domains);
  if (!articles.length) throw new Error('수집된 기사 없음');

  // 3. 유사 기출 매핑 (기사 키워드 기준)
  const pastIdsByArticle: Record<number, string[]> = {};
  for (let i = 0; i < articles.length; i++) {
    const similar = await searchQuestionsByKeywords(articles[i].keywords, 3);
    pastIdsByArticle[i] = similar.map((q) => q.id);
  }

  // 4. RAG 분기
  const allKeywords = articles.flatMap((a) => a.keywords);
  const ragContext = await resolveRagMode(allKeywords);

  // 5. 주제별 기출 샘플 (랜덤 10개 → 주제별 매핑으로 교체)
  const pastByTopic = await fetchPastQuestionsByTopic();

  // 6. 최근 4주 사용 주제 추출
  const recentQuestions = await getRecentPublishedQuestions(4);
  const recentTopics = extractRecentTopics(recentQuestions);

  // 7. 가상 문제 생성 (3~5개, 주제 중복 없음)
  const rawQuestions = await generateVirtualQuestions(
    articles,
    '',               // sampleQuestions는 pastByTopic으로 대체
    ragContext,
    pastIdsByArticle,
    recentTopics,
    pastByTopic
  );

  // 8. 문제 본문 핵심어로 유사 기출 추가 검색
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

  // 9. 저장
  await upsertWeeklyIssue({
    issue_date: issueDate,
    week_label: weekLabel,
    articles: articles as unknown as Json,
    questions: questions as unknown as Json,
    generated_at: new Date().toISOString(),
    status: 'published',
  });

  return {
    issueDate,
    weekLabel,
    articles: articles.length,
    questions: questions.length,
    ragMode: ragContext.mode,
    recentTopicsAvoided: recentTopics,
  };
}
