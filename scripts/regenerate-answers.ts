/**
 * 전문기관 자료 반영 답안 일괄 재생성 스크립트
 *
 * 사용법: npx tsx scripts/regenerate-answers.ts [--past-only | --virtual-only]
 *
 * 캐시 키: past:{id}:kidi / virtual:{issue_date}:{no}:kidi
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

async function fetchKidiContext(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  tags: string[]
): Promise<string> {
  if (!tags || tags.length === 0) return '';

  const { data } = await supabase
    .from('act_kidi_reports')
    .select('issue_no, title, summary, published_month, exam_relevance')
    .eq('status', 'processed')
    .in('exam_relevance', ['high', 'medium'])
    .overlaps('tags', tags)
    .order('exam_relevance', { ascending: true })
    .order('issue_no', { ascending: false })
    .limit(4);

  if (!data || data.length === 0) return '';

  const lines = data.map((r, i) => {
    const label = r.published_month ?? `제${r.issue_no}호`;
    const summary = r.summary ? r.summary.slice(0, 400) : '';
    return `${i + 1}. [${label}] ${r.title}\n   ${summary}`;
  });

  return `\n\n[전문기관(보험연구원) 참고자료 — 최신 동향을 답안에 반영하세요]\n${lines.join('\n\n')}`;
}

async function generateAnswer(
  client: InstanceType<typeof import('@anthropic-ai/sdk').default>,
  questionText: string,
  metaPrefix: string,
  kidiContext: string
): Promise<string> {
  const userPrompt = `다음 보험계리사 2차 시험 '계리리스크관리' 문제에 대한 모범 답안을 작성해 주세요.\n\n${metaPrefix}[문제]\n${questionText}${kidiContext}`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const pastOnly = args.includes('--past-only');
  const virtualOnly = args.includes('--virtual-only');

  const { createClient } = await import('@supabase/supabase-js');
  const Anthropic = (await import('@anthropic-ai/sdk')).default;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let total = 0;
  let success = 0;
  let skipped = 0;
  let failed = 0;

  // ─────────────────────────────────────
  // 1. 기출문제
  // ─────────────────────────────────────
  if (!virtualOnly) {
    const { data: questions, error } = await supabase
      .from('act_past_questions')
      .select('id, year, session, question_no, question_text, tags')
      .order('year', { ascending: false })
      .order('question_no', { ascending: true });

    if (error) { console.error('기출문제 조회 오류:', error.message); process.exit(1); }

    console.log(`\n📚 기출문제 ${questions!.length}개 답안 생성 시작\n`);

    for (let i = 0; i < questions!.length; i++) {
      const q = questions![i];
      const cacheKey = `past:${q.id}:kidi`;
      total++;

      // 이미 생성된 경우 건너뜀
      const { data: existing } = await supabase
        .from('act_ai_answers')
        .select('id')
        .eq('question_key', cacheKey)
        .single();

      if (existing) {
        process.stdout.write(`[${i + 1}/${questions!.length}] ${q.year}년 Q${q.question_no} → 이미 존재, 건너뜀\n`);
        skipped++;
        continue;
      }

      process.stdout.write(`[${i + 1}/${questions!.length}] ${q.year}년 ${q.session} Q${q.question_no}... `);

      try {
        const tags = (q.tags as string[]) ?? [];
        const kidiContext = await fetchKidiContext(supabase, tags);
        const metaPrefix = `[${q.year}년 ${q.session} Q${q.question_no} (기출문제)]\n\n`;
        const answer = await generateAnswer(client, q.question_text, metaPrefix, kidiContext);

        await supabase.from('act_ai_answers').upsert(
          { question_key: cacheKey, answer, updated_at: new Date().toISOString() },
          { onConflict: 'question_key' }
        );

        const kidiCount = kidiContext ? kidiContext.match(/^\d+\./gm)?.length ?? 0 : 0;
        console.log(`✓ (전문기관 ${kidiCount}개 참조)`);
        success++;
      } catch (err) {
        console.log(`✗ 오류: ${(err as Error).message}`);
        failed++;
      }

      // Rate limit 방지: 1.2초 대기
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  // ─────────────────────────────────────
  // 2. 예상문제 (주간 이슈)
  // ─────────────────────────────────────
  if (!pastOnly) {
    const { data: issues, error } = await supabase
      .from('act_weekly_issues')
      .select('id, issue_date, articles, questions')
      .eq('status', 'published')
      .order('issue_date', { ascending: false });

    if (error) { console.error('주간 이슈 조회 오류:', error.message); process.exit(1); }

    const vqTotal = issues!.reduce(
      (sum, issue) => sum + (Array.isArray(issue.questions) ? issue.questions.length : 0), 0
    );
    console.log(`\n🤖 예상문제 ${vqTotal}개 답안 생성 시작\n`);

    for (const issue of issues!) {
      const questions = Array.isArray(issue.questions) ? issue.questions : [];
      const articles = Array.isArray(issue.articles) ? issue.articles : [];

      for (const q of questions) {
        const cacheKey = `virtual:${issue.issue_date}:${q.no}:kidi`;
        total++;

        const { data: existing } = await supabase
          .from('act_ai_answers')
          .select('id')
          .eq('question_key', cacheKey)
          .single();

        if (existing) {
          process.stdout.write(`[${issue.issue_date}] 예상Q${q.no} → 이미 존재, 건너뜀\n`);
          skipped++;
          continue;
        }

        process.stdout.write(`[${issue.issue_date}] 예상Q${q.no}... `);

        try {
          // 연관 기사의 keywords를 tags로 사용
          const article = articles[q.related_article_idx] as { keywords?: string[] } | undefined;
          const tags: string[] = article?.keywords ?? [];

          const kidiContext = await fetchKidiContext(supabase, tags);
          const metaPrefix = `[예상 문제 ${q.no} (${issue.issue_date} AI 생성)]\n\n`;
          const answer = await generateAnswer(client, q.stem, metaPrefix, kidiContext);

          await supabase.from('act_ai_answers').upsert(
            { question_key: cacheKey, answer, updated_at: new Date().toISOString() },
            { onConflict: 'question_key' }
          );

          const kidiCount = kidiContext ? kidiContext.match(/^\d+\./gm)?.length ?? 0 : 0;
          console.log(`✓ (전문기관 ${kidiCount}개 참조)`);
          success++;
        } catch (err) {
          console.log(`✗ 오류: ${(err as Error).message}`);
          failed++;
        }

        await new Promise(r => setTimeout(r, 1200));
      }
    }
  }

  console.log(`\n완료: 성공 ${success}개 / 건너뜀 ${skipped}개 / 실패 ${failed}개 / 합계 ${total}개`);
}

main().catch(err => { console.error(err); process.exit(1); });
