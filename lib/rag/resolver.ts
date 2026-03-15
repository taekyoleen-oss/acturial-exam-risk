import { hasRagData, searchRagChunks } from '@/lib/supabase/queries/rag';

export interface RagChunk {
  id: string;
  content: string;
  chapterTitle: string | null;
  section: string | null;
  hasFormula: boolean;
  similarity: number;
}

export interface RagContext {
  mode: 'rag_enhanced' | 'fallback';
  chunks: RagChunk[];
}

/**
 * RAG 강화 모드 / 폴백 모드 분기 판단.
 * 어떤 경우에도 폴백으로 강등하여 가상 문제 생성이 중단되지 않도록 한다.
 */
export async function resolveRagMode(keywords: string[]): Promise<RagContext> {
  // OpenAI 키 없으면 즉시 폴백
  if (!process.env.OPENAI_API_KEY) {
    return { mode: 'fallback', chunks: [] };
  }

  try {
    const exists = await hasRagData('risk_management');
    if (!exists) return { mode: 'fallback', chunks: [] };

    // 키워드로 임베딩 생성
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: keywords.join(' '),
    });

    const queryEmbedding = embeddingRes.data[0].embedding;
    const rawChunks = await searchRagChunks(queryEmbedding, 'risk_management', 5);

    if (!rawChunks.length) return { mode: 'fallback', chunks: [] };

    const chunks: RagChunk[] = rawChunks.map((c) => ({
      id: c.id,
      content: c.content,
      chapterTitle: c.chapter_title,
      section: c.section,
      hasFormula: c.has_formula,
      similarity: c.similarity,
    }));

    return { mode: 'rag_enhanced', chunks };
  } catch {
    // 에러 시 폴백 강등 (사용자 경험 영향 없음)
    return { mode: 'fallback', chunks: [] };
  }
}
