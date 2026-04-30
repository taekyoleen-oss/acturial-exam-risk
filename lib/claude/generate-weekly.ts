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
  topic_tag: z.string().default('ERM/전사리스크'),
  related_article_idx: z.number().int().min(0),
  similar_past_question_ids: z.array(z.string()).max(3).default([]),
  rag_mode: z.enum(['rag_enhanced', 'fallback']).default('fallback'),
  has_formula: z.boolean().default(false),
});

export type GeneratedArticle = z.infer<typeof ArticleSchema>;
export type GeneratedQuestion = z.infer<typeof VirtualQuestionSchema>;

// 기출 주제 배분 (2014-2025 분석 기반)
const EXAM_TOPIC_DISTRIBUTION = `
[보험계리사 2차 계리리스크관리 기출 주제 배분 — 2014~2025년 분석]
• 계리기법/기초서류 (35%) — 보험료·준비금 계산, 기초율 설정, 경험통계, 계리기초서류 심사
• ERM/전사리스크 (30%) — 리스크 측정·관리 체계, ORSA, 리스크 거버넌스, 위험허용한도
• K-ICS/지급여력 (20%) — 요구자본·가용자본 계산, 위험계수, SCR 산출
• 재보험 (20%) — 비례/비비례 재보험, Cat bond, 재보험 리스크 이전, 세션구조
• IFRS17/보험부채 (18%) — 계약집합, BBA·VFA·PAA 측정모형, CSM, 할인율
• CSM/계리가정 (15%) — CSM 상각, 계리적 가정 설정, 예실차 분석
• 금리리스크/ALM (12%) — 듀레이션 갭, 금리 시나리오, 자산부채 매칭 전략
• 시장리스크/VaR (10%) — VaR, CVaR, 스트레스 테스트, 감도 분석
• 신용위험 (8%) — 신용등급, 부도율, 신용 스프레드, 상대방 리스크
• 운영위험 (8%) — AMA, 손실사건, 내부통제, BCP
`.trim();

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

/** 1단계: 뉴스 수집 (5~10개) */
export async function collectNewsArticles(
  activeSourceDomains: string[]
): Promise<GeneratedArticle[]> {
  const sourceList =
    activeSourceDomains.length > 0
      ? `우선 수집 도메인: ${activeSourceDomains.join(', ')}\n`
      : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5000,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [
      {
        role: 'user',
        content: `${sourceList}지난 7일간 국내외 보험·금융·리스크 관련 뉴스를 아래 10개 주제에서 고르게 수집하여 5~10개 기사를 JSON 배열로만 반환하세요 (다른 설명 없이).

[수집 대상 10개 주제 — 기출 빈도 기반]

① 계리기법/기초서류 (출제 비중 35%)
   키워드: 보험료 계산, 순보험료, 영업보험료, 준비금, 책임준비금, 계리기초율, 경험통계,
           사망률, 해지율, 계리기초서류, 상품심사, 위험률, 예정이율, 신계약비

② ERM/전사리스크 (출제 비중 30%)
   키워드: ERM, ORSA, 전사리스크관리, 리스크 거버넌스, 위험허용한도, 리스크 appetite,
           스트레스 테스트, 시나리오 분석, 리스크 집중도, 내부모형

③ K-ICS/지급여력 (출제 비중 20%)
   키워드: K-ICS, 지급여력비율, 요구자본, 가용자본, SCR, 위험기준자본, 생명리스크,
           시장리스크 계수, 신용리스크 요구자본, 운영리스크 요구자본, 군집리스크

④ 재보험/거대위험 (출제 비중 20%)
   키워드: 재보험, 비례재보험, 초과손해재보험, XL, 재보험 프로그램, Cat bond,
           보험연계증권(ILS), 자연재해, 홍수, 태풍, 지진, 산불, 거대위험, 재보험 세션

⑤ IFRS17/보험부채 (출제 비중 18%)
   키워드: IFRS17, 보험계약부채, 계약집합, BBA, VFA, PAA, 최선추정부채, RA,
           보험계약마진, 보험부채 할인율, OCI 선택

⑥ CSM/계리가정 (출제 비중 15%)
   키워드: CSM, 계약서비스마진, CSM 상각, 계리적 가정 변경, 예실차, 비금융위험조정,
           무저해지보험 해지율 가정, 실손보험 손해율 가정, 금감원 가이드라인

⑦ 금리리스크/ALM (출제 비중 12%)
   키워드: ALM, 금리리스크, 듀레이션 갭, 수정듀레이션, 금리 시나리오, 자산부채 매칭,
           UFR, 장기선도금리, 할인율 현실화, 금리 민감도

⑧ 시장리스크/VaR (출제 비중 10%)
   키워드: VaR, CVaR, 시장리스크, 주식위험, 부동산위험, 환율위험, 집중위험,
           스트레스 VaR, 백테스팅, 감도분석

⑨ 신용위험 (출제 비중 8%)
   키워드: 신용위험, 신용등급, 부도율, LGD, 신용 스프레드, 상대방 리스크,
           자산담보부증권, 사모신용, 신용파생상품

⑩ 운영위험 (출제 비중 8%)
   키워드: 운영리스크, 손실사건, 내부통제, AMA, 사이버위험, 랜섬웨어, BCP,
           개인정보 유출, 시스템 장애, 불완전판매

수집 규칙:
- 각 주제에서 최소 1개 이상 기사 수집 시도
- 뉴스가 없는 주제(재보험, 자연재해, 운영위험 등)도 최근 7~14일 확장 검색
- 동일 주제 기사 3개 이상이면 다른 주제 기사 우선
- 기사 수 최소 5개, 최대 10개

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

  const allTexts = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text);

  for (const t of [...allTexts].reverse()) {
    const candidate = extractJsonArray(t);
    if (candidate === '[]') continue;
    try {
      const parsed = JSON.parse(candidate);
      const result = z.array(ArticleSchema).safeParse(parsed);
      if (result.success && result.data.length > 0) {
        // 최대 10개로 제한
        return result.data.slice(0, 10);
      }
    } catch {
      continue;
    }
  }

  return [];
}

/** 2단계: 가상 문제 생성 (3~5개, 주제 중복 없음) */
export async function generateVirtualQuestions(
  articles: GeneratedArticle[],
  sampleQuestions: string,
  ragContext: RagContext,
  existingPastIds: Record<number, string[]>,
  recentTopics: string[] = [],          // 최근 4주 사용된 주제 태그
  pastByTopic: Record<string, string> = {} // 주제별 기출 예시
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

  const recentTopicsSection = recentTopics.length > 0
    ? `\n[최근 4주 이미 출제된 주제 — 반드시 회피]\n${recentTopics.map(t => `• ${t}`).join('\n')}\n`
    : '';

  const pastByTopicSection = Object.keys(pastByTopic).length > 0
    ? `\n[주제별 기출문제 예시]\n${Object.entries(pastByTopic)
        .map(([tag, example]) => `▶ ${tag}\n${example}`)
        .join('\n\n')}\n`
    : `\n[기출문제 패턴 참고]\n${sampleQuestions}\n`;

  // 기사 수에 따라 목표 문제 수 결정 (기사 5개→3문제, 7개→4문제, 10개→5문제)
  const targetQCount = articles.length <= 5 ? 3 : articles.length <= 7 ? 4 : 5;

  const prompt = `보험계리사 2차 계리리스크관리론 시험 출제 전문가로서 주관식 예상 문제 ${targetQCount}개를 생성하세요.
${ragSection}
${EXAM_TOPIC_DISTRIBUTION}
${recentTopicsSection}
[이번 주 수집 기사 (총 ${articles.length}개)]
${articleSummary}
${pastByTopicSection}

[출제 규칙 — 반드시 준수]
1. 문제 수: 정확히 ${targetQCount}개 (no: 1~${targetQCount})
2. 주제 다양성: 각 문제는 서로 다른 topic_tag를 가져야 함
   허용 태그: 계리기법/기초서류 | ERM/전사리스크 | K-ICS/지급여력 | 재보험 | IFRS17/보험부채 | CSM/계리가정 | 금리리스크/ALM | 시장리스크/VaR | 신용위험 | 운영위험
3. 최근 회피 주제: 위 [최근 4주 이미 출제된 주제]는 가능하면 출제하지 말 것
   (불가피한 경우에만 허용하되, 같은 주에 2문제 이상 동일 태그 금지)
4. 기출 유사도: 각 문제는 위 기출문제 패턴과 동일한 수준과 형식으로 출제
5. 기사 연결: 각 문제는 이번 주 기사 중 하나와 연관 (related_article_idx)
   단, 기사에 없는 주제(재보험, 자연재해 등)도 기사를 간접 연결하거나 별도 출제 가능
6. 주관식 논술형 또는 계산형 (선택지 없음)
7. 보험사 실무·감독 관점의 구체적이고 심층적인 문제 출제

다음 JSON 배열만 반환 (다른 설명, 마크다운 없이):
[{
  "no": 1,
  "stem": "문제 본문 (구체적 조건, 계산식 또는 논술 요구사항 포함)",
  "topic_tag": "위 허용 태그 중 하나",
  "related_article_idx": 0,
  "similar_past_question_ids": [],
  "rag_mode": "${ragContext.mode}",
  "has_formula": false
}]`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const text = extractJsonArray(raw);

    try {
      const parsed = JSON.parse(text);
      const questions = z.array(VirtualQuestionSchema).parse(parsed);

      // 주제 중복 검증 — 같은 topic_tag 2개 이상이면 경고 로그만 (차단하지 않음)
      const tagCounts = new Map<string, number>();
      questions.forEach((q) => tagCounts.set(q.topic_tag, (tagCounts.get(q.topic_tag) ?? 0) + 1));
      const duplicated = [...tagCounts.entries()].filter(([, c]) => c > 1);
      if (duplicated.length > 0 && attempt < 2) {
        console.warn(`[generate-weekly] 주제 중복 감지 (재시도 ${attempt + 1}):`, duplicated);
        continue;
      }

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
