/**
 * Supabase 데이터 마이그레이션 스크립트
 * 기존 프로젝트 → 신규 프로젝트
 *
 * ⚠️ 사용 중단(DEPRECATED): 일회성 프로젝트 이전 마이그레이션 완료본.
 *    재실행이 필요한 경우에만 아래 환경변수를 설정하여 실행할 것.
 *
 * 필수 환경변수 (service_role 키는 코드/이력에 하드코딩 금지):
 *   MIGRATE_OLD_URL, MIGRATE_OLD_SERVICE_ROLE_KEY
 *   MIGRATE_NEW_URL, MIGRATE_NEW_SERVICE_ROLE_KEY
 *
 * 실행 예: MIGRATE_OLD_URL=... MIGRATE_OLD_SERVICE_ROLE_KEY=... \
 *          MIGRATE_NEW_URL=... MIGRATE_NEW_SERVICE_ROLE_KEY=... node scripts/migrate-data.mjs
 */

const OLD_URL = process.env.MIGRATE_OLD_URL;
const OLD_KEY = process.env.MIGRATE_OLD_SERVICE_ROLE_KEY;

const NEW_URL = process.env.MIGRATE_NEW_URL;
const NEW_KEY = process.env.MIGRATE_NEW_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error(
    '❌ 필수 환경변수 누락: MIGRATE_OLD_URL, MIGRATE_OLD_SERVICE_ROLE_KEY, ' +
      'MIGRATE_NEW_URL, MIGRATE_NEW_SERVICE_ROLE_KEY 를 설정하세요.'
  );
  process.exit(1);
}

const PAGE_SIZE = 100;

async function fetchAll(baseUrl, key, table, select = '*') {
  const rows = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${baseUrl}/rest/v1/${table}?select=${select}&limit=${PAGE_SIZE}&offset=${offset}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) throw new Error(`fetch ${table} failed: ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function upsert(baseUrl, key, table, rows, onConflict) {
  if (rows.length === 0) return 0;
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const url = `${baseUrl}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: `resolution=merge-duplicates,return=minimal`,
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`upsert ${table} [${i}~${i + batch.length}] failed: ${err}`);
    }
    inserted += batch.length;
    process.stdout.write(`\r  ${table}: ${inserted}/${rows.length} 건 완료`);
  }
  console.log('');
  return inserted;
}

async function migrate(table, { select = '*', transform } = {}) {
  process.stdout.write(`\n📥 [${table}] 읽는 중...`);
  const rows = await fetchAll(OLD_URL, OLD_KEY, table, select);
  console.log(` ${rows.length}건`);
  if (rows.length === 0) return;
  const data = transform ? rows.map(transform) : rows;
  await upsert(NEW_URL, NEW_KEY, table, data);
}

async function main() {
  console.log('=== Supabase 데이터 마이그레이션 시작 ===\n');

  // 1. 기출문제
  await migrate('act_past_questions');

  // 2. 주간 이슈
  await migrate('act_weekly_issues');

  // 3. KIDI 보고서
  await migrate('act_kidi_reports');

  // 4. AI 답안 캐시
  await migrate('act_ai_answers');

  // 5. 뉴스 발행기관 (마이그레이션 SQL에 기본 데이터 있음 → 삭제 후 재삽입)
  {
    const delRes = await fetch(`${NEW_URL}/rest/v1/act_news_sources?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { apikey: NEW_KEY, Authorization: `Bearer ${NEW_KEY}` },
    });
    if (!delRes.ok) throw new Error(`delete act_news_sources failed: ${await delRes.text()}`);
    console.log('\n🗑️  act_news_sources 기존 데이터 삭제 완료');
    await migrate('act_news_sources');
  }

  // 6. PDF 파싱 이력
  await migrate('act_pdf_imports');

  // 7. RAG 교재 메타데이터
  await migrate('act_rag_textbooks');

  // 8. RAG 임베딩 (vector 포함 — 가장 무거운 테이블)
  console.log('\n📥 [act_rag_embeddings] 읽는 중... (임베딩 데이터 포함)');
  const embeddings = await fetchAll(OLD_URL, OLD_KEY, 'act_rag_embeddings');
  console.log(` ${embeddings.length}건`);
  if (embeddings.length > 0) {
    // vector 타입은 문자열 또는 배열로 오므로 그대로 전달
    await upsert(NEW_URL, NEW_KEY, 'act_rag_embeddings', embeddings);
  }

  console.log('\n✅ 마이그레이션 완료!');
  console.log('\n⚠️  참고: act_user_profiles는 auth.users 의존성으로 인해 제외됨');
}

main().catch((err) => {
  console.error('\n❌ 오류:', err.message);
  process.exit(1);
});
