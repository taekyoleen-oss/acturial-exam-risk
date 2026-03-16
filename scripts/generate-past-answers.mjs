/**
 * 기출문제 AI 답안 사전 생성 스크립트
 *
 * act_past_questions의 모든 문제에 대해 AI 답안을 생성하여
 * act_ai_answers 테이블에 저장합니다.
 *
 * - 이미 답안이 있는 문제는 건너뜁니다 (--force 옵션 시 덮어쓰기)
 * - API 과부하 방지를 위해 문제 간 1초 대기
 *
 * 사용법:
 *   node scripts/generate-past-answers.mjs           # 미생성 문제만
 *   node scripts/generate-past-answers.mjs --force   # 전체 재생성
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// .env.local 로드
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FORCE = process.argv.includes('--force');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 30년 경력의 시니어 계리사이자 현재 대학에서 계리리스크관리를 가르치는 교수입니다. 한국보험계리사 2차 시험 '계리리스크관리' 과목의 답안을 작성해야 합니다.

목표는 단순한 정답 제시가 아니라, 채점자가 감동할 수준의 논리적 완성도, 실무적 통찰, 그리고 최신 제도(IFRS17, K-ICS)와의 연계성을 갖춘 고득점 답안을 작성하는 것입니다.

[답안 작성 형식]
모든 답변은 다음 구조를 준수하여 작성하세요:

1. 서론 (Introduction)
   - 문제의 핵심 개념 정의
   - 해당 주제가 보험 산업 및 리스크 관리에서 가지는 중요성

2. 본론 (Main Body)
   - 다각적 분석: 보험회사, 보험소비자, 감독당국 등 다양한 이해관계자의 관점
   - 기술적/수리적 근거: 필요한 경우 수식이나 경제학적 원리 활용
   - 실무적 쟁점: 실제 업계에서 발생할 수 있는 리스크 요인과 관리 방안
   - 제도적 연계: IFRS17(보험계약회계) 및 K-ICS(신지급여력제도) 하에서 재무제표·자본건전성에 미치는 영향

3. 결론 및 시사점 (Conclusion)
   - 향후 리스크 관리 방향성 및 계리사로서의 제언

[작성 스타일]
- 전문 용어를 정확하게 사용하고, 개조식과 서술식을 혼용
- 실제 시험 답안지 2~3페이지 분량으로 상세하게 작성 (최소 1,500자 이상)
- 논리가 끊기지 않도록 목차 간 연결성 확보`;

async function sbGet(path, params = '') {
  const r = await fetch(`${SB_URL}/rest/v1/${path}?${params}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) throw new Error(`GET ${path}: ${await r.text()}`);
  return r.json();
}

async function sbUpsert(table, row) {
  // 먼저 PATCH(update) 시도, 없으면 POST(insert)
  const { question_key, ...rest } = row;
  const patch = await fetch(`${SB_URL}/rest/v1/${table}?question_key=eq.${encodeURIComponent(question_key)}`, {
    method: 'PATCH',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: Buffer.from(JSON.stringify(rest), 'utf-8'),
  });
  if (!patch.ok) throw new Error(`PATCH ${table}: ${await patch.text()}`);

  // PATCH는 대상이 없으면 204 + 0 rows → INSERT 필요
  const count = patch.headers.get('content-range');
  if (count === '*/0' || count === null) {
    const post = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: Buffer.from(JSON.stringify({ question_key, ...rest }), 'utf-8'),
    });
    if (!post.ok) throw new Error(`INSERT ${table}: ${await post.text()}`);
  }
}

async function generateAnswer(question) {
  const meta = `${question.year}년 ${question.session} Q${question.question_no} (기출문제)`;
  const prompt = `다음 보험계리사 2차 시험 '계리리스크관리' 문제에 대한 모범 답안을 작성해 주세요.\n\n[${meta}]\n\n[문제]\n${question.question_text}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
}

async function main() {
  // 1. 기출문제 전체 조회
  const questions = await sbGet(
    'act_past_questions',
    'select=id,year,session,question_no,question_text&order=year.asc,question_no.asc'
  );
  console.log(`\n총 ${questions.length}개 기출문제`);

  // 2. 기존 답안 키 조회
  let existingKeys = new Set();
  if (!FORCE) {
    const existing = await sbGet('act_ai_answers', 'select=question_key&question_key=like.past:*');
    existingKeys = new Set(existing.map(r => r.question_key));
    console.log(`기존 답안: ${existingKeys.size}개 (건너뜀)`);
  }

  const toProcess = questions.filter(q => FORCE || !existingKeys.has(`past:${q.id}`));
  console.log(`생성 대상: ${toProcess.length}개\n`);

  if (toProcess.length === 0) {
    console.log('모든 답안이 이미 생성되어 있습니다.');
    return;
  }

  let success = 0, fail = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const q = toProcess[i];
    const key = `past:${q.id}`;
    const label = `[${i + 1}/${toProcess.length}] ${q.year}년 ${q.session} Q${q.question_no}`;

    process.stdout.write(`${label} ... `);
    try {
      const answer = await generateAnswer(q);
      await sbUpsert('act_ai_answers', {
        question_key: key,
        answer,
        updated_at: new Date().toISOString(),
      });
      console.log('완료');
      success++;
    } catch (err) {
      console.error(`실패: ${err.message}`);
      fail++;
    }

    // API 요청 간격 (연속 호출 방지)
    if (i < toProcess.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`완료 — 성공: ${success}개, 실패: ${fail}개`);
  console.log('이제 모든 기출문제에서 "답안 확인" 버튼이 즉시 응답합니다.');
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
