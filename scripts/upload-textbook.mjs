/**
 * 교재 임베딩 DB 업로드 스크립트
 *
 * 입력:
 *   - input-textbook/metadata.json
 *   - input-textbook/embeddings.jsonl
 *
 * 사용법:
 *   node scripts/upload-textbook.mjs
 *
 * 기존 /api/rag/upload Route Handler를 multipart/form-data로 호출합니다.
 * x-admin-id 헤더에 ADMIN_USER_ID 값을 사용합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// .env.local 로드
const envPath = path.resolve(ROOT, '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

if (!ADMIN_USER_ID) {
  console.error('ADMIN_USER_ID 환경변수가 없습니다.');
  process.exit(1);
}

const INPUT_DIR = path.join(ROOT, 'input-textbook');
const META_FILE = path.join(INPUT_DIR, 'metadata.json');
const EMBED_FILE = path.join(INPUT_DIR, 'embeddings.jsonl');

for (const f of [META_FILE, EMBED_FILE]) {
  if (!fs.existsSync(f)) {
    console.error(`파일을 찾을 수 없습니다: ${f}`);
    console.error('먼저 process-textbook.mjs → embed-textbook.mjs 순서로 실행하세요.');
    process.exit(1);
  }
}

const metadataContent = fs.readFileSync(META_FILE, 'utf-8');
const embeddingsContent = fs.readFileSync(EMBED_FILE, 'utf-8');

const metadata = JSON.parse(metadataContent);
const embedLines = embeddingsContent.split('\n').filter(Boolean);
console.log(`교재: ${metadata.title}`);
console.log(`임베딩 수: ${embedLines.length}개`);
console.log(`업로드 대상: ${BASE_URL}/api/rag/upload`);

// Build multipart form data using Blob/File API (Node.js 18+)
const formData = new FormData();
formData.append(
  'metadata',
  new Blob([metadataContent], { type: 'application/json' }),
  'metadata.json'
);
formData.append(
  'embeddings',
  new Blob([embeddingsContent], { type: 'application/x-ndjson' }),
  'embeddings.jsonl'
);

console.log('\n업로드 중...');

const res = await fetch(`${BASE_URL}/api/rag/upload`, {
  method: 'POST',
  headers: {
    'x-admin-id': ADMIN_USER_ID,
  },
  body: formData,
});

const responseText = await res.text();

if (!res.ok) {
  console.error(`업로드 실패 (${res.status}): ${responseText}`);
  process.exit(1);
}

let result;
try {
  result = JSON.parse(responseText);
} catch {
  result = responseText;
}

console.log(`\n=== 업로드 완료 ===`);
console.log(`상태: ${res.status}`);
console.log('응답:', JSON.stringify(result, null, 2));
