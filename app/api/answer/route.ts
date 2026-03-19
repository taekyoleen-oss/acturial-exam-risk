import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/server';

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
- 논리가 끊기지 않도록 목차 간 연결성 확보
- 제공된 전문기관 참고자료가 있는 경우, 최신 동향·사례·수치를 답안에 구체적으로 인용하여 현장감 있는 답안을 작성할 것`;

async function fetchKidiContext(tags: string[]): Promise<string> {
  if (!tags || tags.length === 0) return '';

  const { data } = await supabaseAdmin
    .from('act_kidi_reports')
    .select('issue_no, title, summary, published_month, exam_relevance')
    .eq('status', 'processed')
    .in('exam_relevance', ['high', 'medium'])
    .overlaps('tags', tags)
    .order('exam_relevance', { ascending: true }) // high 먼저
    .order('issue_no', { ascending: false })       // 최신 먼저
    .limit(4);

  if (!data || data.length === 0) return '';

  const lines = data.map((r, i) => {
    const label = r.published_month ?? `제${r.issue_no}호`;
    const summary = r.summary ? r.summary.slice(0, 400) : '';
    return `${i + 1}. [${label}] ${r.title}\n   ${summary}`;
  });

  return `\n\n[전문기관(보험연구원) 참고자료 — 최신 동향을 답안에 반영하세요]\n${lines.join('\n\n')}`;
}

export async function POST(request: NextRequest) {
  try {
    const { questionText, questionMeta, questionKey, tags } = await request.json();

    if (!questionText || typeof questionText !== 'string') {
      return NextResponse.json({ error: '문제 텍스트가 필요합니다.' }, { status: 400 });
    }

    // 1. DB 캐시 확인 (tags가 없는 경우에만 캐시 사용 — tags가 있으면 최신 KIDI 반영 위해 재생성 가능)
    const useTags = Array.isArray(tags) && tags.length > 0;
    if (questionKey && !useTags) {
      const { data: cached } = await supabaseAdmin
        .from('act_ai_answers')
        .select('answer')
        .eq('question_key', questionKey)
        .single();

      if (cached?.answer) {
        return NextResponse.json({ answer: cached.answer, cached: true });
      }
    }

    // tags가 있을 때: KIDI 캐시 여부 확인 (kidi_ prefix 키 사용)
    const cacheKey = useTags ? `${questionKey}:kidi` : questionKey;
    if (useTags && cacheKey) {
      const { data: cached } = await supabaseAdmin
        .from('act_ai_answers')
        .select('answer')
        .eq('question_key', cacheKey)
        .single();

      if (cached?.answer) {
        return NextResponse.json({ answer: cached.answer, cached: true });
      }
    }

    // 2. KIDI 참고자료 조회
    const kidiContext = useTags ? await fetchKidiContext(tags) : '';

    // 3. Claude로 답안 생성
    const metaPrefix = questionMeta ? `[${questionMeta}]\n\n` : '';
    const userPrompt = `다음 보험계리사 2차 시험 '계리리스크관리' 문제에 대한 모범 답안을 작성해 주세요.\n\n${metaPrefix}[문제]\n${questionText}${kidiContext}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const answer = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n');

    // 4. DB에 캐시 저장
    const saveKey = cacheKey || questionKey;
    if (saveKey && answer) {
      await supabaseAdmin
        .from('act_ai_answers')
        .upsert(
          { question_key: saveKey, answer, updated_at: new Date().toISOString() },
          { onConflict: 'question_key' }
        );
    }

    return NextResponse.json({ answer, cached: false });
  } catch (err) {
    console.error('[/api/answer]', err);
    return NextResponse.json({ error: '답안 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
