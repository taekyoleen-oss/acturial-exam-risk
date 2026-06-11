/**
 * 주간 배치 실패 원인 진단 스크립트
 * 단계별로 실행하여 어느 레이어에서 실패하는지 확인
 */
import fs from 'fs';
import path from 'path';

const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

async function main() {
  console.log('=== 1단계: 활성 뉴스 소스 조회 ===');
  const { supabaseAdmin } = await import('../lib/supabase/server');
  const { data: sources, error: srcErr } = await supabaseAdmin
    .from('act_news_sources')
    .select('domain')
    .eq('is_active', true);
  if (srcErr) {
    console.error('뉴스 소스 조회 실패:', srcErr);
    process.exit(1);
  }
  const domains = (sources ?? []).map((s) => s.domain);
  console.log('활성 도메인:', domains);

  console.log('\n=== 2단계: 뉴스 수집 (collectNewsArticles) ===');
  const { collectNewsArticles } = await import('../lib/claude/generate-weekly');
  try {
    const articles = await collectNewsArticles(domains);
    console.log(`수집된 기사: ${articles.length}개`);
    articles.forEach((a, i) => console.log(`  [${i}] ${a.title} (${a.source}, ${a.published_at})`));
    if (!articles.length) {
      console.error('>>> 실패 지점: 기사 0개 — cron의 "수집된 기사 없음" 에러와 일치');
      process.exit(2);
    }
  } catch (err) {
    console.error('>>> 실패 지점: collectNewsArticles에서 예외 발생');
    console.error(err);
    process.exit(3);
  }

  console.log('\n진단 완료: 1~2단계 정상. 실패 원인은 이후 단계(RAG/문제생성/저장)일 가능성.');
}

main();
