import { supabase, supabaseAdmin } from '@/lib/supabase/server';

// RAG 데이터 존재 여부 확인
export async function hasRagData(subject = 'risk_management'): Promise<boolean> {
  const { count, error } = await supabase
    .from('act_rag_textbooks')
    .select('*', { count: 'exact', head: true })
    .eq('subject', subject);

  return !error && (count ?? 0) > 0;
}

// pgvector 유사도 검색 (match_rag_chunks 함수 호출)
export async function searchRagChunks(
  queryEmbedding: number[],
  subject = 'risk_management',
  matchCount = 5
) {
  const { data, error } = await supabaseAdmin.rpc('match_rag_chunks', {
    query_embedding: queryEmbedding as unknown as string,
    match_subject: subject,
    match_count: matchCount,
  });

  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    content: string;
    chapter_title: string | null;
    section: string | null;
    has_formula: boolean;
    similarity: number;
  }>;
}

// 교재 목록 조회
export async function getRagTextbooks() {
  const { data, error } = await supabase
    .from('act_rag_textbooks')
    .select('id, title, subject, edition, year, total_chunks, uploaded_at')
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
