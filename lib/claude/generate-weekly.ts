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
  related_article_idx: z.number().int().min(0),
  similar_past_question_ids: z.array(z.string()).max(2).default([]),
  rag_mode: z.enum(['rag_enhanced', 'fallback']).default('fallback'),
  has_formula: z.boolean().default(false),
});

export type GeneratedArticle = z.infer<typeof ArticleSchema>;
export type GeneratedQuestion = z.infer<typeof VirtualQuestionSchema>;

/** 텍스트에서 첫 번째 완전한 JSON 배열을 추출 */
function extractJsonArray(text: string): string {
  const start = text.indexOf('[');
  if (start === -1) return '[]';

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '[]';
}

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
        content: `${sourceList}지난 7일간 국내 보험 업계 뉴스 중 다음 키워드와 관련된 기사를 검색하여 JSON 배열로만 반환하세요 (다른 설명 없이):
키워드: IFRS17, CSM, K-ICS, 계리적가정, 무저해지보험, 실손보험, 보험부채, 금리리스크, 예실차, UFR

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

  // text 블록들을 역순으로 탐색하여 ArticleSchema 유효한 JSON 배열 추출
  const allTexts = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text);

  for (const t of [...allTexts].reverse()) {
    const candidate = extractJsonArray(t);
    if (candidate === '[]') continue;
    try {
      const parsed = JSON.parse(candidate);
      const result = z.array(ArticleSchema).safeParse(parsed);
      if (result.success && result.data.length > 0) return result.data;
    } catch {
      continue;
    }
  }

  return [];
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

  const prompt = `보험계리사 2차 계리리스크관리론 시험의 출제 전문가로서 주관식 예상 문제 5개를 생성하세요.
${ragSection}
[이번 주 수집 기사]
${articleSummary}

[기출문제 패턴 참고]
${sampleQuestions}

[출제 시 반드시 고려할 키워드 (제도 변화·실무 이슈 중심)]
- IFRS17 계리적 가정: 금감원 가이드라인, 무저해지 보험 해지율, 실손보험 손해율 가정
- CSM(보험계약서비스마진): CSM 상각·조정이 보험사 손익에 미치는 영향
- K-ICS 할인율: 장기선도금리(UFR) 조정, 할인율 현실화가 부채·자본에 미치는 영향
- 예실차(예상과 실제의 차이) 분석: 계리적 가정 변경 시 리스크 관리 방안

규칙:
- 주관식 논술형 또는 계산형 (선택지 없음), 실무적 이슈 중심으로 출제
- 각 문제는 위 기사 중 하나와 연관되어야 함 (related_article_idx: 기사 배열 인덱스 0부터)
- rag_mode: "${ragContext.mode}"
- answer 필드 포함하지 않음 (정답 제공 안 함)
- 기출문제 패턴과 유사한 난이도, 보험사 실무자 관점의 구체적 문제 출제

다음 JSON 배열만 반환 (다른 설명 없이):
[{
  "no": 1~5,
  "stem": "문제 본문 (주관식 서술형 또는 계산형)",
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

    const raw = (message.content[0] as { type: string; text: string }).text;
    const text = extractJsonArray(raw);

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
