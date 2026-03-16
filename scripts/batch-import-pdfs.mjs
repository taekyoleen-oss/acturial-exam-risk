/**
 * 기출문제 PDF 배치 임포트 스크립트
 *
 * input-pdf/ 디렉토리의 모든 PDF를 순서대로 /api/admin/pdf-import 에 업로드합니다.
 * 각 PDF의 파싱이 완료(completed/failed)될 때까지 기다린 후 다음으로 넘어갑니다.
 *
 * 사용법:
 *   node scripts/batch-import-pdfs.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// .env.local 로드
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const BASE_URL = 'http://localhost:3003';
const ADMIN_ID = process.env.ADMIN_USER_ID;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PDF_DIR = path.join(ROOT, 'input-pdf');

// PDF 파일 목록 (연도순 정렬)
const files = fs.readdirSync(PDF_DIR)
  .filter(f => f.endsWith('.pdf'))
  .sort();

console.log(`\n총 ${files.length}개 PDF 파일 발견:\n${files.map(f => '  ' + f).join('\n')}\n`);

/** Supabase에서 importId 상태 폴링 */
async function waitForImport(importId, filename) {
  const maxWait = 180; // 최대 3분
  let elapsed = 0;
  while (elapsed < maxWait) {
    await new Promise(r => setTimeout(r, 5000));
    elapsed += 5;

    const r = await fetch(`${SB_URL}/rest/v1/act_pdf_imports?id=eq.${importId}&select=status,question_count,error_msg`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    const [row] = await r.json();
    if (!row) continue;

    if (row.status === 'completed') {
      console.log(`  완료: ${row.question_count}개 문항 파싱됨`);
      return true;
    }
    if (row.status === 'failed') {
      console.error(`  실패: ${row.error_msg}`);
      return false;
    }
    process.stdout.write(`  처리 중... (${elapsed}초)`);
    process.stdout.write('\r');
  }
  console.error(`  타임아웃 (${maxWait}초 초과)`);
  return false;
}

/** PDF 한 개 업로드 */
async function importPdf(filename) {
  const yearMatch = filename.match(/^(\d{4})년/);
  if (!yearMatch) { console.error(`연도 파싱 실패: ${filename}`); return false; }
  const year = parseInt(yearMatch[1], 10);

  const filePath = path.join(PDF_DIR, filename);
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('year', String(year));

  const res = await fetch(`${BASE_URL}/api/admin/pdf-import`, {
    method: 'POST',
    headers: { 'x-admin-id': ADMIN_ID },
    body: formData,
  });

  if (!res.ok) {
    const t = await res.text();
    console.error(`  업로드 오류 ${res.status}: ${t}`);
    return false;
  }
  const { importId } = await res.json();
  console.log(`  importId: ${importId}`);
  return await waitForImport(importId, filename);
}

/** 메인 */
async function main() {
  let success = 0, fail = 0;

  for (const filename of files) {
    console.log(`\n[${filename}] 업로드 중...`);
    const ok = await importPdf(filename);
    if (ok) success++;
    else fail++;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`배치 완료 — 성공: ${success}개, 실패: ${fail}개`);

  if (success > 0) {
    console.log('\nRAG 임베딩 생성 중...');
    const { execSync } = await import('child_process');
    execSync('node scripts/embed-past-questions.mjs', { cwd: ROOT, stdio: 'inherit' });
  }
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
