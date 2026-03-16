import { supabase, supabaseAdmin } from '@/lib/supabase/server';

// 연도·회차·태그 필터 기출문제 조회 (정답·해설 제외)
export async function getPastQuestions({
  year,
  session,
  tag,
}: {
  year?: number;
  session?: string;
  tag?: string;
} = {}) {
  let query = supabase
    .from('act_past_questions')
    .select('id, year, session, subject, question_no, question_text, tags, has_formula')
    .order('year', { ascending: false })
    .order('question_no');

  if (year) query = query.eq('year', year);
  if (session) query = query.eq('session', session);
  if (tag) query = query.contains('tags', [tag]);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// 연도·회차 목록 (필터 UI용)
export async function getAvailableYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from('act_past_questions')
    .select('year')
    .order('year', { ascending: false });

  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.year))];
}

export async function getAvailableSessionsByYear(year: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('act_past_questions')
    .select('session')
    .eq('year', year)
    .order('session');

  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.session))];
}

// 사용 중인 태그 전체 목록
export async function getAvailableTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from('act_past_questions')
    .select('tags');

  if (error) throw error;
  const allTags = (data ?? []).flatMap((r) => (r.tags as string[]) ?? []);
  return [...new Set(allTags)].sort();
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
