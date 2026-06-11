/**
 * 주간 배치 로컬 실행 스크립트
 * Vercel 환경변수 문제 등으로 cron이 실패했을 때 로컬 키로 직접 실행
 * (cron/weekly 라우트와 동일한 흐름)
 */
import fs from 'fs';
import path from 'path';

const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

async function main() {
  const { getMondayOfWeek, getWeekLabel } = await import('../lib/utils/week');
  const { upsertWeeklyIssue } = await import('../lib/supabase/queries/weekly');
  const { runWeeklyBatch } = await import('../lib/claude/run-weekly-batch');

  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const issueDate = getMondayOfWeek(kstNow);
  const weekLabel = getWeekLabel(new Date(issueDate));
  console.log(`대상 주차: ${weekLabel} (${issueDate})`);

  try {
    const result = await runWeeklyBatch(issueDate, weekLabel);
    console.log('배치 성공:', JSON.stringify(result, null, 2));
  } catch (err) {
    await upsertWeeklyIssue({
      issue_date: issueDate,
      week_label: weekLabel,
      articles: [],
      questions: [],
      generated_at: new Date().toISOString(),
      status: 'failed',
    });
    console.error('배치 실패:', err);
    process.exit(1);
  }
}

main();
