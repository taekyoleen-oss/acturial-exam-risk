/**
 * RAG 테스트용 임베딩 생성 스크립트
 *
 * 사용법:
 *   node scripts/generate-embeddings.mjs
 *
 * 출력:
 *   scripts/output/metadata.json
 *   scripts/output/embeddings.jsonl
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// .env.local 로드
import { readFileSync } from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
const envLines = readFileSync(envPath, 'utf-8').split('\n');
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

// API 키 유효성 확인
const apiKey = process.env.OPENAI_API_KEY ?? '';
if (!apiKey.startsWith('sk-')) {
  console.error('\n오류: OPENAI_API_KEY가 설정되지 않았습니다.');
  console.error(`현재 값: "${apiKey.slice(0, 30)}..."`);
  console.error('.env.local 에서 OPENAI_API_KEY=sk-... 형태로 설정해주세요.\n');
  process.exit(1);
}

// fetch 직접 사용 (한글 처리 안정성)
async function createEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API 오류 ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

// ─── 테스트용 청크 데이터 ──────────────────────────────────────────────────────
const chunks = [
  {
    chunk_index: 0,
    chapter: 1,
    chapter_title: '리스크 관리의 개요',
    section: '1.1 리스크의 정의',
    page_start: 1,
    content: '리스크란 미래의 불확실성으로 인해 발생할 수 있는 손실 또는 예상치 못한 결과의 가능성을 의미한다. 보험업에서의 리스크는 보험위험, 시장위험, 신용위험, 운영위험으로 분류된다.',
    has_formula: false,
  },
  {
    chunk_index: 1,
    chapter: 1,
    chapter_title: '리스크 관리의 개요',
    section: '1.2 리스크 관리 프로세스',
    page_start: 5,
    content: '리스크 관리 프로세스는 리스크 식별, 리스크 측정, 리스크 평가, 리스크 대응, 모니터링의 5단계로 구성된다. 각 단계는 순환적으로 반복되며 조직의 리스크 허용 수준에 따라 조정된다.',
    has_formula: false,
  },
  {
    chunk_index: 2,
    chapter: 2,
    chapter_title: '시장위험',
    section: '2.1 VaR의 정의',
    page_start: 20,
    content: 'VaR(Value at Risk)는 정상적인 시장 상황에서 특정 신뢰수준 하에 일정 보유기간 동안 발생할 수 있는 최대 손실액을 의미한다. 예를 들어, 99% 신뢰수준의 1일 VaR가 100억원이라면 100일 중 1일은 손실이 100억원을 초과할 수 있다.',
    has_formula: false,
  },
  {
    chunk_index: 3,
    chapter: 2,
    chapter_title: '시장위험',
    section: '2.2 VaR 계산 방법',
    page_start: 25,
    content: 'VaR 산출 방법에는 역사적 시뮬레이션법, 분산-공분산법(델타-노말법), 몬테카를로 시뮬레이션법이 있다. 분산-공분산법에서 VaR = μ - z_α × σ 이며, z_α는 신뢰수준에 해당하는 표준정규분포의 분위수이다.',
    has_formula: true,
  },
  {
    chunk_index: 4,
    chapter: 3,
    chapter_title: '보험위험',
    section: '3.1 사망률 리스크',
    page_start: 50,
    content: '사망률 리스크는 실제 사망률이 예상 사망률보다 높거나 낮을 가능성에서 발생한다. 생명보험사는 사망률 상승 리스크에, 연금보험사는 사망률 하락(장수) 리스크에 노출된다.',
    has_formula: false,
  },
  {
    chunk_index: 5,
    chapter: 3,
    chapter_title: '보험위험',
    section: '3.2 해지율 리스크',
    page_start: 60,
    content: '해지율 리스크는 계약자의 해지 행동이 예상과 다를 경우 발생한다. 대량 해지(mass lapse)는 금리 급등 등 특정 시나리오에서 집중 발생할 수 있으며, 유동성 리스크와 연계된다.',
    has_formula: false,
  },
  {
    chunk_index: 6,
    chapter: 4,
    chapter_title: '신용위험',
    section: '4.1 신용위험의 구성요소',
    page_start: 80,
    content: '신용위험은 거래 상대방의 채무불이행으로 인한 손실 위험이다. 주요 구성요소는 PD(부도확률), LGD(부도시손실률), EAD(부도시익스포저)이며, 예상손실 EL = PD × LGD × EAD 로 계산된다.',
    has_formula: true,
  },
  {
    chunk_index: 7,
    chapter: 5,
    chapter_title: '운영위험',
    section: '5.1 운영위험의 정의 및 유형',
    page_start: 100,
    content: '운영위험은 부적절하거나 잘못된 내부 프로세스, 인력, 시스템 또는 외부 사건으로 인한 손실 위험이다. Basel II는 운영위험을 7개 손실 유형으로 분류하며, 기본지표법, 표준법, 고급측정법으로 자본을 산출한다.',
    has_formula: false,
  },
];

// ─── 임베딩 생성 ───────────────────────────────────────────────────────────────
async function generateEmbeddings() {
  const outputDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`총 ${chunks.length}개 청크 임베딩 생성 시작...`);

  const results = [];
  for (const chunk of chunks) {
    process.stdout.write(`  [${chunk.chunk_index + 1}/${chunks.length}] ${chunk.section} ... `);

    const embedding = await createEmbedding(chunk.content);
    results.push({ ...chunk, embedding });
    console.log('완료');
  }

  // metadata.json 저장
  const metadata = {
    title: '리스크관리 테스트 교재',
    subject: 'risk_management',
    edition: 'test-2026',
    year: 2026,
    source_checksum: 'test-checksum-001',
  };
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  // embeddings.jsonl 저장 (줄당 1청크)
  const jsonl = results.map((r) => JSON.stringify(r)).join('\n');
  fs.writeFileSync(path.join(outputDir, 'embeddings.jsonl'), jsonl, 'utf-8');

  console.log('\n저장 완료:');
  console.log('  scripts/output/metadata.json');
  console.log('  scripts/output/embeddings.jsonl');
  console.log(`\n임베딩 벡터 차원 확인: ${results[0].embedding.length}차원`);
}

generateEmbeddings().catch((err) => {
  console.error('오류:', err.message);
  process.exit(1);
});
