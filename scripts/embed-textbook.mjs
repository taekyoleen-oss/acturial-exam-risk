/**
 * 교재 청크 임베딩 생성 스크립트
 *
 * 입력: input-textbook/chunks.jsonl
 * 출력: input-textbook/embeddings.jsonl
 *
 * 사용법:
 *   node scripts/embed-textbook.mjs
 *
 * 모델: OpenAI text-embedding-3-small (1536차원)
 * 배치: 100개씩 처리, 오류 시 재시도 3회
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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const INPUT_DIR = path.join(ROOT, 'input-textbook');
const CHUNKS_FILE = path.join(INPUT_DIR, 'chunks.jsonl');
const OUTPUT_FILE = path.join(INPUT_DIR, 'embeddings.jsonl');

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedBatch(texts, attempt = 1) {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: 1536,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API 오류 ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.data.map((d) => d.embedding);
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      console.warn(`  재시도 ${attempt}/${MAX_RETRIES}: ${e.message}`);
      await sleep(RETRY_DELAY_MS * attempt);
      return embedBatch(texts, attempt + 1);
    }
    throw e;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
if (!fs.existsSync(CHUNKS_FILE)) {
  console.error(`청크 파일을 찾을 수 없습니다: ${CHUNKS_FILE}`);
  console.error('먼저 process-textbook.mjs를 실행하세요.');
  process.exit(1);
}

const chunks = fs
  .readFileSync(CHUNKS_FILE, 'utf-8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

console.log(`총 청크 수: ${chunks.length}`);
console.log(`배치 크기: ${BATCH_SIZE}`);
console.log(`총 배치 수: ${Math.ceil(chunks.length / BATCH_SIZE)}`);

// Check for already-processed chunks (resume support)
const existingEmbeddings = new Set();
if (fs.existsSync(OUTPUT_FILE)) {
  for (const line of fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n').filter(Boolean)) {
    try {
      const { chunk_index } = JSON.parse(line);
      existingEmbeddings.add(chunk_index);
    } catch {}
  }
  console.log(`이미 처리된 청크: ${existingEmbeddings.size}개 (재개)`);
}

const pending = chunks.filter((c) => !existingEmbeddings.has(c.chunk_index));
console.log(`처리할 청크: ${pending.length}개\n`);

if (pending.length === 0) {
  console.log('모든 청크가 이미 처리되었습니다.');
  process.exit(0);
}

const outStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });
let processed = 0;

for (let i = 0; i < pending.length; i += BATCH_SIZE) {
  const batch = pending.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

  process.stdout.write(`배치 ${batchNum}/${totalBatches} (${batch.length}개) ... `);
  const start = Date.now();

  const texts = batch.map((c) => c.content);
  const embeddings = await embedBatch(texts);

  for (let j = 0; j < batch.length; j++) {
    const record = {
      chunk_index: batch[j].chunk_index,
      chapter: batch[j].chapter,
      section: batch[j].section,
      content: batch[j].content,
      has_formula: batch[j].has_formula,
      embedding: embeddings[j],
    };
    outStream.write(JSON.stringify(record) + '\n');
  }

  processed += batch.length;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`완료 (${elapsed}s) — 누적 ${processed}/${pending.length}`);

  // Rate limit: brief pause between batches
  if (i + BATCH_SIZE < pending.length) {
    await sleep(200);
  }
}

outStream.end();

console.log(`\n=== 임베딩 생성 완료 ===`);
console.log(`저장 위치: ${OUTPUT_FILE}`);
console.log(`처리된 청크: ${processed}개`);
