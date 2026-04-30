import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { upsertWeeklyIssue } from '@/lib/supabase/queries/weekly';
import { runWeeklyBatch } from '@/lib/claude/run-weekly-batch';
import { getMondayOfWeek, getWeekLabel } from '@/lib/utils/week';
import type { Json } from '@/types/supabase';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ ok: true, message: '이미 이번 주 데이터 존재' });
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
    return NextResponse.json({ ok: true, ...result });
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
