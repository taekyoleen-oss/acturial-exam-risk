/**
 * KIDI 보고서 시험 학습용 상세 콘텐츠 생성 스크립트
 *
 * 사용법: npx tsx scripts/enrich-kidi-content.ts [--reprocess]
 *
 * 기존 title/summary/key_points/tags를 기반으로
 * 시험 대비용 구조화된 study_notes를 생성합니다.
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

const SYSTEM_PROMPT = `당신은 한국보험계리사 2차 시험 '계리리스크관리' 과목을 준비하는 학생들을 위한 학습 자료를 작성하는 전문가입니다.
보험연구원(KIDI) 보고서 내용을 바탕으로, 시험 대비에 최적화된 구조화된 학습 노트를 작성합니다.`;

const USER_PROMPT_TEMPLATE = (
  title: string,
  category: string | null,
  tags: string[],
  summary: string,
  keyPoints: string[],
  examRelevance: string
) => `다음 보험연구원 보고서를 시험 대비용 학습 노트로 변환해 주세요.

[보고서 정보]
제목: ${title}
분야: ${category ?? '일반'}
주요 태그: ${tags.join(', ')}
시험 연관성: ${examRelevance === 'high' ? '상(핵심)' : examRelevance === 'medium' ? '중' : '하'}

[기존 요약]
${summary}

[기존 핵심 포인트]
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---

위 내용을 바탕으로 아래 형식에 맞게 시험 대비 학습 노트를 작성하세요.
각 섹션은 반드시 단락/목록 형식으로 작성하고, 서술형 문장보다 핵심 내용 위주로 구성하세요.
용어 설명은 학생이 처음 보는 개념도 이해할 수 있도록 간결하고 명확하게 작성하세요.

**출력 형식 (마크다운)**:

## 1. 보고서 개요
(2~3줄 핵심 요약. 무엇에 관한 보고서인지, 왜 중요한지)

## 2. 주요 내용
### 가. [첫 번째 핵심 주제]
- 내용 bullet 1
- 내용 bullet 2
- 내용 bullet 3

### 나. [두 번째 핵심 주제]
- 내용 bullet 1
- 내용 bullet 2

(필요시 다~라 추가)

## 3. 핵심 용어 정리
| 용어 | 정의 및 설명 |
|------|-------------|
| **[용어1]** | 간결한 정의와 맥락 |
| **[용어2]** | 간결한 정의와 맥락 |
(최소 3개~최대 7개 용어)

## 4. 시험 출제 포인트
> 아래 항목들을 중심으로 답안 작성 연습을 권장합니다.

1. [출제 가능한 포인트 1 — 구체적으로]
2. [출제 가능한 포인트 2 — 구체적으로]
3. [출제 가능한 포인트 3 — 구체적으로]
4. [출제 가능한 포인트 4 — 구체적으로]
(최소 4개)

## 5. 관련 제도·규제 연계
- **IFRS17**: [이 보고서 내용과 IFRS17의 연관점]
- **K-ICS**: [K-ICS 지급여력제도와의 연관점]
- **기타**: [ERM, ORSA, 재보험 등 관련 제도가 있으면 추가]

(연관이 없으면 "해당 없음" 또는 간접적 연관만 기재)`;

async function generateStudyNotes(
  client: InstanceType<typeof import('@anthropic-ai/sdk').default>,
  report: {
    title: string;
    topic_category: string | null;
    tags: string[];
    summary: string | null;
    key_points: string[];
    exam_relevance: string;
  }
): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: USER_PROMPT_TEMPLATE(
        report.title,
        report.topic_category,
        report.tags,
        report.summary ?? '(요약 없음)',
        report.key_points,
        report.exam_relevance
      ),
    }],
  });

  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const reprocess = args.includes('--reprocess');

  const { createClient } = await import('@supabase/supabase-js');
  const Anthropic = (await import('@anthropic-ai/sdk')).default;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let query = supabase
    .from('act_kidi_reports')
    .select('id, title, topic_category, tags, summary, key_points, exam_relevance')
    .eq('status', 'processed');

  if (!reprocess) {
    query = query.is('study_notes', null);
  }

  const { data: reports, error } = await query.order('exam_relevance', { ascending: true }).order('issue_no', { ascending: false });

  if (error) { console.error(error); process.exit(1); }
  if (!reports?.length) { console.log('생성할 보고서가 없습니다.'); return; }

  console.log(`\n📝 학습 노트 생성 대상: ${reports.length}개\n`);
  let success = 0, failed = 0;

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    process.stdout.write(`[${i + 1}/${reports.length}] ${r.title.slice(0, 40)}... `);

    try {
      const keyPoints = Array.isArray(r.key_points) ? (r.key_points as string[]) : [];
      const studyNotes = await generateStudyNotes(client, {
        title: r.title,
        topic_category: r.topic_category,
        tags: r.tags ?? [],
        summary: r.summary,
        key_points: keyPoints,
        exam_relevance: r.exam_relevance,
      });

      await supabase
        .from('act_kidi_reports')
        .update({ study_notes: studyNotes })
        .eq('id', r.id);

      console.log('✓');
      success++;
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
      failed++;
    }

    // Rate limit 방지
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n완료: 성공 ${success}개 / 실패 ${failed}개`);
}

main().catch(err => { console.error(err); process.exit(1); });
