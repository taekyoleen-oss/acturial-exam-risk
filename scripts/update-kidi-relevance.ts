/**
 * KIDI 보고서 시험 연관성 평가 스크립트
 *
 * 사용법: npx tsx scripts/update-kidi-relevance.ts [--reprocess]
 *
 * 각 보고서를 계리리스크관리 시험 출제 범위와 비교하여
 * exam_relevance = 'high' | 'medium' | 'low' 로 분류합니다.
 */

import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const EXAM_SYLLABUS = `
계리리스크관리 시험 출제 범위 (보험계리사 2차):

[핵심 출제 분야 - 높은 연관성]
- IFRS17: 보험계약 분류, 보험부채 측정(GMM/PAA/VFA), CSM(계약서비스마진), RA(위험조정), 전환방법
- K-ICS / 지급여력제도: 요구자본(시장위험액, 보험위험액, 신용위험액, 운영위험액), 가용자본, SCR, MCR, Solvency II
- ALM(자산부채관리): 듀레이션 매칭, 면역화, 금리리스크 헤지, 현금흐름 매칭
- 금리리스크: 금리민감도, 듀레이션, 컨벡시티, PV01, 이자율 스트레스 테스트
- 시장리스크: VaR, CVaR, 주가/환율/신용 스프레드 리스크, 스트레스 테스트
- 신용위험: PD, LGD, EAD, 신용VaR, 상대방 리스크, 재보험 신용리스크
- 운영리스크: 손실분포법, 시나리오분석, 핵심리스크지표(KRI)
- 재보험: 비례/비비례 재보험, 손해율/발생손해액 재보험, XL/QS, 재보험 최적화
- ERM(전사적 리스크관리): ORSA, 리스크 선호도, 리스크 한도, 리스크 거버넌스
- 자본관리: 경제적 자본, RAROC, 자본배분, 배당정책

[중간 출제 분야 - 중간 연관성]
- 기후/재해위험: 자연재해 모델링, 기후 스트레스 테스트, 파라메트릭 보험
- 사이버리스크: 사이버 보험, 정보보호, 시스템리스크
- AI/빅데이터: 보험 언더라이팅, 손해사정 자동화, 모형 리스크
- 대체투자/자산운용: 사모신용, 부동산, 인프라 투자, 자산운용 외부위탁
- 지속가능성/ESG: 그린채권, 생물다양성 리스크, TCFD

[낮은 연관성 - 시험 출제 가능성 낮음]
- 자동차보험 (단순 손해율 분석, 공임 협의)
- 개인 의료/건강보험 실손 세부사항
- 연금 세제/개혁 정치적 사항
- 고령자 돌봄 복지 정책
- 이민정책, 사회재난 복지
- 단순 시장 동향 (M&A 사례 나열)
`;

async function assessRelevance(
  title: string,
  summary: string | null,
  tags: string[],
  category: string | null
): Promise<{ relevance: 'high' | 'medium' | 'low'; reason: string }> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `다음 보험연구원 보고서가 계리리스크관리 시험과 얼마나 연관있는지 평가하세요.

[보고서 정보]
제목: ${title}
카테고리: ${category ?? '-'}
태그: ${tags.join(', ')}
요약: ${(summary ?? '').slice(0, 500)}

[시험 출제 범위]
${EXAM_SYLLABUS}

아래 JSON만 반환하세요 (설명 없이):
{
  "relevance": "high" 또는 "medium" 또는 "low",
  "reason": "한 문장 이유"
}

판단 기준:
- high: 시험 핵심 출제 분야와 직접 연관 (IFRS17, K-ICS, ALM, VaR, ERM, 재보험 등)
- medium: 시험과 간접 연관 (기후리스크, AI, 대체투자, 사이버리스크 등)
- low: 시험 출제 가능성 낮음 (자동차보험 공임, 복지정책, 단순 시장 동향 등)`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { relevance: 'medium', reason: '평가 실패' };
  const result = JSON.parse(match[0]);
  return {
    relevance: result.relevance as 'high' | 'medium' | 'low',
    reason: result.reason,
  };
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const reprocess = args.includes('--reprocess');

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 아직 평가 안 된 보고서 조회
  let query = supabase
    .from('act_kidi_reports')
    .select('id, title, summary, tags, topic_category, exam_relevance')
    .eq('status', 'processed');

  if (!reprocess) {
    query = query.eq('exam_relevance', 'medium'); // 기본값인 것만 재평가
  }

  const { data: reports, error } = await query.order('issue_no', { ascending: false });

  if (error) { console.error(error); process.exit(1); }
  if (!reports?.length) { console.log('평가할 보고서가 없습니다.'); return; }

  console.log(`평가 대상: ${reports.length}개`);
  let high = 0, medium = 0, low = 0;

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    process.stdout.write(`[${i + 1}/${reports.length}] ${r.title.slice(0, 40)}... `);

    const result = await assessRelevance(r.title, r.summary, r.tags ?? [], r.topic_category);

    await supabase
      .from('act_kidi_reports')
      .update({ exam_relevance: result.relevance })
      .eq('id', r.id);

    if (result.relevance === 'high') high++;
    else if (result.relevance === 'medium') medium++;
    else low++;

    console.log(`→ ${result.relevance === 'high' ? '상' : result.relevance === 'medium' ? '중' : '하'} (${result.reason.slice(0, 50)})`);

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n완료: 상 ${high}개 / 중 ${medium}개 / 하 ${low}개`);
}

main().catch(err => { console.error(err); process.exit(1); });
