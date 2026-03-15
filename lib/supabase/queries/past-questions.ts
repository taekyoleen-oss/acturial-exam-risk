import { supabase, supabaseAdmin } from '@/lib/supabase/server';

// 연도별 기출문제 조회 (정답·해설 제외 — 공개 정책)
export async function getPastQuestionsByYear(year: number) {
  const { data, error } = await supabase
    .from('act_past_questions')
    .select('id, year, session, subject, question_no, question_text, options, tags, has_formula')
    .eq('year', year)
    .order('question_no');

  if (error) throw error;
  return data ?? [];
}

// 조회 가능한 연도 목록
export async function getAvailableYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from('act_past_questions')
    .select('year')
    .order('year', { ascending: false });

  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.year))];
}

// 유사 기출 ID 배열로 조회 (정답·해설 제외)
export async function getPastQuestionsByIds(ids: string[]) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('act_past_questions')
    .select('id, year, session, subject, question_no, question_text, options, tags, has_formula')
    .in('id', ids);

  if (error) throw error;
  return (data ?? []) as unknown as import('@/types/question').PastQuestion[];
}

// 키워드로 유사 기출 검색 (주간 배치용, 관리자 클라이언트)
export async function searchQuestionsByKeywords(keywords: string[], limit = 2) {
  if (!keywords.length) return [];

  const orConditions = keywords
    .map((kw) => `question_text.ilike.%${kw}%`)
    .join(',');

  const { data, error } = await supabaseAdmin
    .from('act_past_questions')
    .select('id, year, session, question_no, question_text')
    .or(orConditions)
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
