import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';

const MetadataSchema = z.object({
  title: z.string(),
  subject: z.string().default('risk_management'),
  edition: z.string().optional(),
  year: z.number().optional(),
  source_checksum: z.string().optional(),
});

const ChunkSchema = z.object({
  chunk_index: z.number(),
  chapter: z.number().optional(),
  chapter_title: z.string().optional(),
  section: z.string().optional(),
  page_start: z.number().optional(),
  content: z.string(),
  has_formula: z.boolean().default(false),
  embedding: z.array(z.number()).length(1536),
});

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const formData = await request.formData();
  const embeddingsFile = formData.get('embeddings') as File | null;
  const metadataFile = formData.get('metadata') as File | null;

  if (!embeddingsFile || !metadataFile) {
    return NextResponse.json({ error: 'embeddings, metadata 파일 필수' }, { status: 400 });
  }

  // metadata.json 파싱
  const metaRaw = JSON.parse(await metadataFile.text());
  const meta = MetadataSchema.parse(metaRaw);

  // 중복 체크
  if (meta.source_checksum) {
    const { data: existing } = await supabaseAdmin
      .from('act_rag_textbooks')
      .select('id, title')
      .eq('checksum', meta.source_checksum)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `이미 업로드된 교재입니다: ${existing.title}`, textbookId: existing.id },
        { status: 409 }
      );
    }
  }

  // textbook INSERT
  const { data: textbook, error: tbError } = await supabaseAdmin
    .from('act_rag_textbooks')
    .insert({
      title: meta.title,
      subject: meta.subject,
      edition: meta.edition ?? null,
      year: meta.year ?? null,
      checksum: meta.source_checksum ?? null,
      source_file: embeddingsFile.name,
    })
    .select()
    .single();

  if (tbError || !textbook) {
    return NextResponse.json({ error: '교재 등록 실패' }, { status: 500 });
  }

  // embeddings.jsonl 스트리밍 파싱 및 배치 INSERT
  const text = await embeddingsFile.text();
  const lines = text.split('\n').filter((l) => l.trim());
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE).map((line) => {
      const raw = JSON.parse(line);
      const chunk = ChunkSchema.parse(raw);
      return {
        textbook_id: textbook.id,
        chunk_index: chunk.chunk_index,
        chapter: chunk.chapter ?? null,
        chapter_title: chunk.chapter_title ?? null,
        section: chunk.section ?? null,
        page_start: chunk.page_start ?? null,
        content: chunk.content,
        has_formula: chunk.has_formula,
        embedding: chunk.embedding as unknown as string,
      };
    });

    const { error } = await supabaseAdmin.from('act_rag_embeddings').insert(batch);
    if (error) {
      await supabaseAdmin.from('act_rag_textbooks').delete().eq('id', textbook.id);
      return NextResponse.json({ error: `임베딩 INSERT 실패: ${error.message}` }, { status: 500 });
    }
    inserted += batch.length;
  }

  // total_chunks 업데이트
  await supabaseAdmin
    .from('act_rag_textbooks')
    .update({ total_chunks: inserted })
    .eq('id', textbook.id);

  return NextResponse.json({ textbookId: textbook.id, chunksInserted: inserted });
}
