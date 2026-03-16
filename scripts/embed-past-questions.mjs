/**
 * 기출문제 시딩 + RAG 임베딩 생성 스크립트
 *
 * 1. 샘플 기출문제를 act_past_questions에 삽입
 * 2. 각 문제의 임베딩을 생성하여 act_rag_textbooks / act_rag_embeddings에 저장
 *
 * 사용법:
 *   node scripts/embed-past-questions.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// .env.local 로드
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase REST 직접 호출 (ByteString 문제 우회)
async function sbPost(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: Buffer.from(JSON.stringify(rows), 'utf-8'),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${table} INSERT 오류 ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function sbGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${table} GET 오류 ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function sbPatch(table, filter, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: Buffer.from(JSON.stringify(body), 'utf-8'),
  });
  if (!res.ok) throw new Error(`${table} PATCH 오류 ${res.status}: ${await res.text()}`);
}

async function sbDelete(table, filter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`${table} DELETE 오류 ${res.status}: ${await res.text()}`);
}


// ─── 샘플 기출문제 데이터 ────────────────────────────────────────────────────
const pastQuestions = [
  {
    year: 2024, session: '2차', subject: '리스크관리', question_no: 1,
    question_text: '다음 중 VaR(Value at Risk)의 특성에 대한 설명으로 옳지 않은 것은?',
    options: [
      { label: '①', text: 'VaR는 특정 신뢰수준 하에서 일정 보유기간 동안 발생 가능한 최대손실을 나타낸다.' },
      { label: '②', text: '정규분포를 가정한 분산-공분산법은 두꺼운 꼬리(fat tail) 위험을 과소평가할 수 있다.' },
      { label: '③', text: 'VaR는 일반적으로 서브애디티비티(subadditivity) 성질을 만족한다.' },
      { label: '④', text: '역사적 시뮬레이션법은 과거 데이터의 분포를 그대로 사용한다.' },
      { label: '⑤', text: 'CVaR(조건부 VaR)는 VaR를 초과하는 손실의 기댓값이다.' },
    ],
    answer: '③', explanation: 'VaR는 일반적으로 서브애디티비티를 만족하지 않는다. CVaR(ES)가 코히런트 위험척도로 서브애디티비티를 만족한다.',
    tags: ['VaR', '시장리스크', '위험척도'], has_formula: false,
  },
  {
    year: 2024, session: '2차', subject: '리스크관리', question_no: 2,
    question_text: 'K-ICS(킥스) 제도 하에서 보험회사의 요구자본 산출에 관한 설명으로 옳은 것은?',
    options: [
      { label: '①', text: '킥스는 원가주의 기반의 재무건전성 제도이다.' },
      { label: '②', text: '보험위험 요구자본은 사망위험, 장수위험, 장해·질병위험, 대재해위험으로 구성된다.' },
      { label: '③', text: '시장리스크 요구자본에는 신용위험이 포함된다.' },
      { label: '④', text: '요구자본 합산 시 위험 간 상관관계를 고려하지 않는다.' },
      { label: '⑤', text: '킥스비율은 가용자본을 요구자본으로 나눈 값이다.' },
    ],
    answer: '⑤', explanation: '킥스비율 = 가용자본/요구자본. K-ICS는 시가주의 기반이며 위험 간 상관관계를 반영한 집계를 사용한다.',
    tags: ['K-ICS', '킥스', '요구자본', '보험건전성'], has_formula: false,
  },
  {
    year: 2024, session: '2차', subject: '리스크관리', question_no: 3,
    question_text: '신용위험의 구성요소인 PD, LGD, EAD에 대한 설명으로 옳지 않은 것은?',
    options: [
      { label: '①', text: 'PD(Probability of Default)는 특정 기간 내 채무불이행이 발생할 확률이다.' },
      { label: '②', text: 'LGD(Loss Given Default)는 부도 발생 시 회수되지 못하는 비율이다.' },
      { label: '③', text: 'EAD(Exposure at Default)는 부도 시점의 익스포저 금액이다.' },
      { label: '④', text: '예상손실(EL) = PD × LGD × EAD로 산출된다.' },
      { label: '⑤', text: 'LGD는 담보물 가치와 무관하게 결정된다.' },
    ],
    answer: '⑤', explanation: 'LGD는 담보물의 가치, 선순위 여부 등 회수율에 영향을 미치는 요소에 따라 결정된다.',
    tags: ['신용위험', 'PD', 'LGD', 'EAD'], has_formula: false,
  },
  {
    year: 2023, session: '2차', subject: '리스크관리', question_no: 1,
    question_text: 'ALM(자산부채관리)에서 사용하는 듀레이션 갭(Duration Gap)에 대한 설명으로 옳은 것은?',
    options: [
      { label: '①', text: '듀레이션 갭이 0이면 금리 변동에 완전히 면역화된 상태이다.' },
      { label: '②', text: '듀레이션 갭이 양(+)이면 금리 상승 시 순자산가치가 증가한다.' },
      { label: '③', text: '수정듀레이션은 채권가격 변화율을 금리 변화로 나눈 값이다.' },
      { label: '④', text: '볼록성(Convexity)은 듀레이션의 한계를 보완하지 못한다.' },
      { label: '⑤', text: '면역전략은 부채 듀레이션을 자산 듀레이션보다 크게 유지한다.' },
    ],
    answer: '①', explanation: '듀레이션 갭 = 자산듀레이션 - (부채/자산) × 부채듀레이션. 갭이 0이면 금리 변동에 대해 순자산가치 중립.',
    tags: ['ALM', '듀레이션', '금리위험'], has_formula: true,
  },
  {
    year: 2023, session: '2차', subject: '리스크관리', question_no: 2,
    question_text: '운영위험(Operational Risk)의 Basel II 7대 손실 유형에 해당하지 않는 것은?',
    options: [
      { label: '①', text: '내부 사기(Internal Fraud)' },
      { label: '②', text: '외부 사기(External Fraud)' },
      { label: '③', text: '시스템 장애(System Failure)' },
      { label: '④', text: '유가증권 가격 변동(Market Price Change)' },
      { label: '⑤', text: '영업 중단 및 시스템 오류(Business Disruption)' },
    ],
    answer: '④', explanation: '유가증권 가격 변동은 시장위험에 해당하며 운영위험의 7대 손실 유형에 포함되지 않는다.',
    tags: ['운영위험', 'Basel', '손실유형'], has_formula: false,
  },
  {
    year: 2023, session: '2차', subject: '리스크관리', question_no: 3,
    question_text: '재보험(Reinsurance)의 형태 중 비례재보험에 해당하는 것은?',
    options: [
      { label: '①', text: '초과손해액재보험(Excess of Loss)' },
      { label: '②', text: '스톱로스재보험(Stop Loss)' },
      { label: '③', text: '쿼터쉐어재보험(Quota Share)' },
      { label: '④', text: '초과손해율재보험(Aggregate XL)' },
      { label: '⑤', text: '캣본드(Cat Bond)' },
    ],
    answer: '③', explanation: '쿼터쉐어(비례재보험)는 보험료와 손실을 일정 비율로 분담한다. ①②④는 비비례재보험이다.',
    tags: ['재보험', '비례재보험', '쿼터쉐어'], has_formula: false,
  },
  {
    year: 2022, session: '2차', subject: '리스크관리', question_no: 1,
    question_text: '다음 중 코히런트 위험척도(Coherent Risk Measure)의 조건에 해당하지 않는 것은?',
    options: [
      { label: '①', text: '서브애디티비티(Subadditivity)' },
      { label: '②', text: '단조성(Monotonicity)' },
      { label: '③', text: '양의 동차성(Positive Homogeneity)' },
      { label: '④', text: '변환 불변성(Translation Invariance)' },
      { label: '⑤', text: '볼록성(Convexity)' },
    ],
    answer: '⑤', explanation: '코히런트 위험척도의 4가지 공리: 서브애디티비티, 단조성, 양의 동차성, 변환 불변성. 볼록성은 별도 조건이다.',
    tags: ['위험척도', 'CVaR', '코히런트'], has_formula: false,
  },
  {
    year: 2022, session: '2차', subject: '리스크관리', question_no: 2,
    question_text: '보험부채 평가 시 최선추정부채(Best Estimate Liability)에 포함되지 않는 것은?',
    options: [
      { label: '①', text: '미래 보험금 지급액의 현재가치' },
      { label: '②', text: '미래 사업비의 현재가치' },
      { label: '③', text: '미래 보험료 수입의 현재가치' },
      { label: '④', text: '리스크 마진(Risk Margin)' },
      { label: '⑤', text: '미래 해지환급금의 현재가치' },
    ],
    answer: '④', explanation: '리스크 마진은 BEL에 별도로 추가되는 항목이다. BEL = 미래 현금흐름의 확률가중 현재가치.',
    tags: ['보험부채', 'BEL', 'K-ICS', '최선추정'], has_formula: false,
  },
  {
    year: 2022, session: '2차', subject: '리스크관리', question_no: 3,
    question_text: '몬테카를로 시뮬레이션을 이용한 VaR 산출에 관한 설명으로 옳지 않은 것은?',
    options: [
      { label: '①', text: '복잡한 포트폴리오의 비선형 위험을 반영할 수 있다.' },
      { label: '②', text: '시뮬레이션 횟수가 많을수록 정확도가 높아진다.' },
      { label: '③', text: '계산량이 많아 실시간 리스크 관리에 제약이 있다.' },
      { label: '④', text: '분산-공분산법보다 항상 보수적인 VaR를 산출한다.' },
      { label: '⑤', text: '난수 생성의 품질이 결과에 영향을 미친다.' },
    ],
    answer: '④', explanation: '몬테카를로법이 항상 보수적인 것은 아니며, 가정하는 분포와 시뮬레이션 방법에 따라 결과가 달라진다.',
    tags: ['VaR', '몬테카를로', '시뮬레이션'], has_formula: false,
  },
  {
    year: 2021, session: '2차', subject: '리스크관리', question_no: 1,
    question_text: '금리위험의 측정 방법 중 BPV(Basis Point Value)에 대한 설명으로 옳은 것은?',
    options: [
      { label: '①', text: 'BPV는 금리가 1%포인트 변할 때 채권가격의 변화액이다.' },
      { label: '②', text: 'BPV는 수정듀레이션에 채권가격을 곱하고 10,000으로 나눈 값이다.' },
      { label: '③', text: 'BPV가 클수록 금리 민감도가 낮다.' },
      { label: '④', text: 'BPV는 볼록성을 충분히 반영한다.' },
      { label: '⑤', text: '장기채권의 BPV는 단기채권보다 항상 작다.' },
    ],
    answer: '②', explanation: 'BPV(DV01) = 수정듀레이션 × 채권가격 / 10,000. 금리 1bp(0.01%) 변화 시 가격 변화액.',
    tags: ['금리위험', 'BPV', 'DV01', '듀레이션'], has_formula: true,
  },
];

// ─── 임베딩 생성 (fetch 직접 사용) ───────────────────────────────────────────
async function createEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI 오류 ${res.status}: ${await res.text()}`);
  return (await res.json()).data[0].embedding;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. DB에 있는 기출문제 전체 조회 (PDF 파싱 완료된 실제 문제)
  console.log('1. DB에서 기출문제 조회 중...');
  const allQuestions = await sbGet(
    'act_past_questions',
    'select=id,year,session,question_no,question_text,tags&order=year.desc'
  );

  console.log(`\n2. 임베딩 생성 (총 ${allQuestions.length}개)...`);

  // 3. act_rag_textbooks에 "기출문제 모음" 항목 생성 (중복 방지)
  const CHECKSUM = 'past-questions-v1';
  const existingList = await sbGet('act_rag_textbooks', `select=id&checksum=eq.${CHECKSUM}`);
  const existing = existingList[0] ?? null;

  let textbookId;
  if (existing) {
    textbookId = existing.id;
    console.log(`   기존 교재 항목 재사용: ${textbookId}`);
    await sbDelete('act_rag_embeddings', `textbook_id=eq.${textbookId}`);
  } else {
    const [tb] = await sbPost('act_rag_textbooks', [{
      title: '기출문제 모음 (보험계리사 2차 리스크관리)',
      subject: 'risk_management',
      edition: '2021-2024',
      checksum: CHECKSUM,
      source_file: 'past-questions-seed',
    }]);
    textbookId = tb.id;
    console.log(`   새 교재 항목 생성: ${textbookId}`);
  }

  // 4. 각 기출문제 임베딩 생성 및 삽입
  const BATCH_SIZE = 5;
  let chunkIndex = 0;

  for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
    const batch = allQuestions.slice(i, i + BATCH_SIZE);
    const rows = [];

    for (const q of batch) {
      process.stdout.write(`  [${chunkIndex + 1}/${allQuestions.length}] ${q.year}년 Q${q.question_no} ... `);
      // 임베딩 입력: 문제 본문 + 태그
      const inputText = `[기출문제] ${q.year}년 2차 리스크관리 Q${q.question_no}\n${q.question_text}${q.tags?.length ? '\n키워드: ' + q.tags.join(', ') : ''}`;
      const embedding = await createEmbedding(inputText);

      rows.push({
        textbook_id: textbookId,
        chunk_index: chunkIndex,
        chapter: null,
        chapter_title: `${q.year}년 기출문제`,
        section: `Q${q.question_no}`,
        page_start: null,
        content: inputText,
        has_formula: false,
        embedding,
      });
      chunkIndex++;
      console.log('완료');
    }

    await sbPost('act_rag_embeddings', rows);
  }

  // 5. total_chunks 업데이트
  await sbPatch('act_rag_textbooks', `id=eq.${textbookId}`, { total_chunks: chunkIndex });

  console.log(`\n완료: ${chunkIndex}개 청크 삽입`);
  console.log('act_past_questions + act_rag_embeddings 모두 업데이트되었습니다.');
}

main().catch((err) => {
  console.error('오류:', err.message);
  process.exit(1);
});
