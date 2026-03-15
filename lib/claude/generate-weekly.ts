import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { RagContext } from '@/lib/rag/resolver';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ArticleSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string(),
  summary: z.string(),
  published_at: z.string(),
  keywords: z.array(z.string()),
});

const VirtualQuestionSchema = z.object({
  no: z.number().int().min(1).max(5),
  stem: z.string().min(10),
  options: z
    .array(z.object({ label: z.string(), text: z.string() }))
    .length(5),
  related_article_idx: z.number().int().min(0),
  similar_past_question_ids: z.array(z.string()).max(2).default([]),
  rag_mode: z.enum(['rag_enhanced', 'fallback']).default('fallback'),
  has_formula: z.boolean().default(false),
});

export type GeneratedArticle = z.infer<typeof ArticleSchema>;
export type GeneratedQuestion = z.infer<typeof VirtualQuestionSchema>;

/** 1단계: 뉴스 수집 */
export async function collectNewsArticles(
  activeSourceDomains: string[]
): Promise<GeneratedArticle[]> {
  const sourceList =
    activeSourceDomains.length > 0
      ? `우선 수집 도메인: ${activeSourceDomains.join(', ')}\n`
      : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [
      {
        role: 'user',
        content: `${sourceList}지난 7일간의 국내 뉴스에서 보험계리사 2차 계리리스크관리 시험 범위(시장리스크, 신용리스크, 운영리스크, ALM, K-ICS/RBC, 보험부채, 재보험, VaR 등)와 관련된 기사를 전부 수집하세요.

각 기사를 다음 JSON 배열로만 반환하세요 (다른 설명 없이):
[{
  "title": "기사 제목",
  "source": "발행기관명",
  "url": "기사 URL",
  "summary": "핵심 내용 2~3문장 요약",
  "published_at": "YYYY-MM-DD",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}]`,
      },
    ],
  });

  // 마지막 text 블록에서 JSON 추출
  const texts = message.content.filter((b) => b.type === 'text');
  const lastText = (texts[texts.length - 1] as { type: string; text: string })?.text ?? '[]';
  const jsonStr = lastText
    .trim()
    .replace(/^```json?\n?/, '')
    .replace(/\n?```$/, '');

  const parsed = JSON.parse(jsonStr);
  return z.array(ArticleSchema).parse(parsed);
}

/** 2단계: 가상 문제 생성 */
export async function generateVirtualQuestions(
  articles: GeneratedArticle[],
  sampleQuestions: string,
  ragContext: RagContext,
  existingPastIds: Record<number, string[]>
): Promise<GeneratedQuestion[]> {
  const ragSection =
    ragContext.mode === 'rag_enhanced' && ragContext.chunks.length > 0
      ? `\n[교재 관련 개념 (RAG 검색 결과)]\n${ragContext.chunks
          .map((c) => `[${c.chapterTitle ?? ''}] ${c.content}`)
          .join('\n\n')}\n`
      : '';

  const articleSummary = articles
    .map(
      (a, i) =>
        `기사 ${i} — ${a.title} (${a.source}, ${a.published_at})\n요약: ${a.summary}\n키워드: ${a.keywords.join(', ')}`
    )
    .join('\n\n');

  const prompt = `보험계리사 2차 계리리스크관리 시험의 출제 전문가로서 5지선다 예상 문제 5개를 생성하세요.
${ragSection}
[이번 주 수집 기사]
${articleSummary}

[기출문제 패턴 참고]
${sampleQuestions}

규칙:
- 각 문제는 위 기사 중 하나와 연관되어야 함 (related_article_idx: 기사 배열 인덱스 0부터)
- rag_mode: "${ragContext.mode}"
- answer 필드 포함하지 않음 (정답 제공 안 함)
- 선택지 ①②③④⑤ 5개 필수

다음 JSON 배열만 반환 (다른 설명 없이):
[{
  "no": 1~5,
  "stem": "문제 본문",
  "options": [{"label":"①","text":"..."},{"label":"②","text":"..."},{"label":"③","text":"..."},{"label":"④","text":"..."},{"label":"⑤","text":"..."}],
  "related_article_idx": 0,
  "similar_past_question_ids": [],
  "rag_mode": "${ragContext.mode}",
  "has_formula": false
}]`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (message.content[0] as { type: string; text: string }).text
      .trim()
      .replace(/^```json?\n?/, '')
      .replace(/\n?```$/, '');

    try {
      const parsed = JSON.parse(text);
      const questions = z.array(VirtualQuestionSchema).parse(parsed);

      // 유사 기출 ID 매핑
      return questions.map((q) => ({
        ...q,
        similar_past_question_ids: existingPastIds[q.related_article_idx] ?? [],
      }));
    } catch {
      if (attempt === 2) throw new Error('가상 문제 생성 실패 (3회 재시도 초과)');
    }
  }

  return [];
}
