import { supabase, supabaseAdmin } from '@/lib/supabase/server';

// 최신 주간 이슈 조회
export async function getCurrentWeeklyIssue() {
  const { data, error } = await supabase
    .from('act_weekly_issues')
    .select('*')
    .eq('status', 'published')
    .order('issue_date', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

// 특정 날짜(월요일)로 주간 이슈 조회
export async function getWeeklyIssueByDate(issueDate: string) {
  const { data, error } = await supabase
    .from('act_weekly_issues')
    .select('*')
    .eq('issue_date', issueDate)
    .eq('status', 'published')
    .single();

  if (error) return null;
  return data;
}

// 아카이브 목록 (최신순)
export async function getWeeklyArchiveList() {
  const { data, error } = await supabase
    .from('act_weekly_issues')
    .select('id, issue_date, week_label, status, generated_at')
    .eq('status', 'published')
    .order('issue_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// 주간 이슈 저장 (주간 배치용, 관리자 클라이언트)
import type { Json } from '@/types/supabase';

export async function upsertWeeklyIssue(issue: {
  issue_date: string;
  week_label: string;
  articles: Json;
  questions: Json;
  generated_at: string;
  status: string;
}) {
  const { error } = await supabaseAdmin
    .from('act_weekly_issues')
    .upsert(issue, { onConflict: 'issue_date' });

  if (error) throw error;
}

// 최근 배치 상태 조회 (관리자용)
export async function getRecentBatchStatus(limit = 8) {
  const { data, error } = await supabaseAdmin
    .from('act_weekly_issues')
    .select('id, issue_date, week_label, status, generated_at')
    .order('issue_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** 최근 N주 발행된 이슈의 questions 배열 반환 (topic_tag 중복 방지용) */
export async function getRecentPublishedQuestions(weeks = 4): Promise<Json[]> {
  const { data, error } = await supabaseAdmin
    .from('act_weekly_issues')
    .select('questions')
    .eq('status', 'published')
    .order('issue_date', { ascending: false })
    .limit(weeks);

  if (error) return [];
  return (data ?? []).flatMap((row) =>
    Array.isArray(row.questions) ? (row.questions as Json[]) : []
  );
}
