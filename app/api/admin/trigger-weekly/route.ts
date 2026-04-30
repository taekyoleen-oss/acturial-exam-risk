import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { upsertWeeklyIssue } from '@/lib/supabase/queries/weekly';
import { runWeeklyBatch } from '@/lib/claude/run-weekly-batch';
import { getMondayOfWeek, getWeekLabel } from '@/lib/utils/week';
import type { Json } from '@/types/supabase';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });
  }

  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const issueDate = getMondayOfWeek(kstNow);
  const weekLabel = getWeekLabel(new Date(issueDate));

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
    const result = await runWeeklyBatch(issueDate, weekLabel);
    return NextResponse.json({
      ok: true,
      skipped: false,
      weekLabel: result.weekLabel,
      articles: result.articles,
      questions: result.questions,
      ragMode: result.ragMode,
      recentTopicsAvoided: result.recentTopicsAvoided,
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
