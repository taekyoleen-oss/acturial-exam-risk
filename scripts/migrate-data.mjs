/**
 * Supabase 데이터 마이그레이션 스크립트
 * 기존 프로젝트 → 신규 프로젝트
 */

const OLD_URL = 'https://habzqdxspupdkxinhpfp.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhYnpxZHhzcHVwZGt4aW5ocGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUzMDM1NiwiZXhwIjoyMDg5MTA2MzU2fQ.2pe2f-YV_JqSMFP1c2GXxA-RP_-1QLntIZTiStQA9kg';

const NEW_URL = 'https://alsxyalzqpysxlcfhaze.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsc3h5YWx6cXB5c3hsY2ZoYXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUzNDM3NiwiZXhwIjoyMDkyMTEwMzc2fQ.8-qP51_-sQ7GcPmtI3htG_LIDAJLnNeeqb1m0jFzWsU';

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
