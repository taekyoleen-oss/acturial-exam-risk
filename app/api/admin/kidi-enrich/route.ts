import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export const maxDuration = 300;

const SYSTEM_PROMPT = `당신은 한국보험계리사 2차 시험 '계리리스크관리' 과목을 준비하는 학생들을 위한 학습 자료를 작성하는 전문가입니다.
보험연구원(KIDI) 보고서 내용을 바탕으로, 시험 대비에 최적화된 구조화된 학습 노트를 작성합니다.`;

function buildUserPrompt(report: {
  title: string;
  topic_category: string | null;
  tags: string[];
  summary: string | null;
  key_points: string[];
  exam_relevance: string;
}): string {
  return `다음 보험연구원 보고서를 시험 대비용 학습 노트로 변환해 주세요.

[보고서 정보]
제목: ${report.title}
분야: ${report.topic_category ?? '일반'}
주요 태그: ${report.tags.join(', ')}
시험 연관성: ${report.exam_relevance === 'high' ? '상(핵심)' : report.exam_relevance === 'medium' ? '중' : '하'}

[기존 요약]
${report.summary ?? '(요약 없음)'}

[기존 핵심 포인트]
${report.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

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
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const { count, error } = await supabaseAdmin
    .from('act_kidi_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processed')
    .is('study_notes', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ missing: count ?? 0 });
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const batchSize: number = Math.min(body.batch_size ?? 5, 10);

  const { data: reports, error } = await supabaseAdmin
    .from('act_kidi_reports')
    .select('id, title, topic_category, tags, summary, key_points, exam_relevance')
    .eq('status', 'processed')
    .is('study_notes', null)
    .order('exam_relevance', { ascending: true })
    .order('issue_no', { ascending: false })
    .limit(batchSize);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!reports?.length) {
    return NextResponse.json({ ok: true, processed: 0, failed: 0, remaining: 0, message: '생성할 학습 노트가 없습니다.' });
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let processedCount = 0;
  let failedCount = 0;

  for (const report of reports) {
    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildUserPrompt({
            title: report.title,
            topic_category: report.topic_category,
            tags: report.tags ?? [],
            summary: report.summary,
            key_points: Array.isArray(report.key_points) ? (report.key_points as string[]) : [],
            exam_relevance: report.exam_relevance,
          }),
        }],
      });

      const studyNotes = msg.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('\n');

      await supabaseAdmin
        .from('act_kidi_reports')
        .update({ study_notes: studyNotes })
        .eq('id', report.id);

      processedCount++;
    } catch (err) {
      console.error(`Study notes generation failed for ${report.title}:`, err);
      failedCount++;
    }
  }

  const { count: remaining } = await supabaseAdmin
    .from('act_kidi_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processed')
    .is('study_notes', null);

  return NextResponse.json({
    ok: true,
    processed: processedCount,
    failed: failedCount,
    remaining: remaining ?? 0,
  });
}
