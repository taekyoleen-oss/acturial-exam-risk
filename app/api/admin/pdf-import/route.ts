import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';

const QuestionSchema = z.object({
  question_no: z.number().int().positive(),
  question_text: z.string().min(1),
  options: z
    .array(z.object({ label: z.string(), text: z.string() }))
    .min(5)
    .max(5),
  answer: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  has_formula: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const yearStr = formData.get('year') as string | null;

  if (!file || !yearStr) {
    return NextResponse.json({ error: 'file, year 필수' }, { status: 400 });
  }

  const year = parseInt(yearStr, 10);
  if (isNaN(year)) {
    return NextResponse.json({ error: '연도 형식 오류' }, { status: 400 });
  }

  // PDF 파싱 이력 생성
  const { data: importRow, error: importError } = await supabaseAdmin
    .from('act_pdf_imports')
    .insert({ filename: file.name, year, status: 'processing' })
    .select()
    .single();

  if (importError || !importRow) {
    return NextResponse.json({ error: '이력 생성 실패' }, { status: 500 });
  }

  // 백그라운드 처리 (응답 즉시 반환)
  processPdf(file, year, importRow.id).catch(console.error);

  return NextResponse.json({ importId: importRow.id, status: 'processing' });
}

async function processPdf(file: File, year: number, importId: string) {
  try {
    // PDF 텍스트 추출
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    // Claude로 구조화
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `다음은 보험계리사 2차 계리리스크관리 시험지 OCR 텍스트입니다.
5지선다 문항을 모두 추출하여 아래 JSON 배열 형식으로만 반환하세요. 다른 설명 없이 JSON만 반환하세요.

출력 스키마:
[{
  "question_no": number,
  "question_text": string,
  "options": [{"label": "①", "text": "..."}, {"label": "②", "text": "..."}, {"label": "③", "text": "..."}, {"label": "④", "text": "..."}, {"label": "⑤", "text": "..."}],
  "answer": string | null,
  "explanation": string | null,
  "has_formula": boolean
}]

시험지 텍스트:
${extractedText.slice(0, 15000)}`,
        },
      ],
    });

    const rawJson = (message.content[0] as { type: string; text: string }).text
      .trim()
      .replace(/^```json?\n?/, '')
      .replace(/\n?```$/, '');

    const parsed = JSON.parse(rawJson);
    const questions = z.array(QuestionSchema).parse(parsed);

    // act_past_questions INSERT
    const rows = questions.map((q) => ({
      year,
      session: '2차',
      subject: '리스크관리',
      question_no: q.question_no,
      question_text: q.question_text,
      options: q.options,
      answer: q.answer ?? null,
      explanation: q.explanation ?? null,
      has_formula: q.has_formula,
      source_pdf: importId,
    }));

    await supabaseAdmin.from('act_past_questions').upsert(rows, {
      onConflict: 'year,session,subject,question_no',
    });

    // 완료 업데이트
    await supabaseAdmin
      .from('act_pdf_imports')
      .update({ status: 'completed', question_count: questions.length, completed_at: new Date().toISOString() })
      .eq('id', importId);
  } catch (err) {
    await supabaseAdmin
      .from('act_pdf_imports')
      .update({ status: 'failed', error_msg: String(err) })
      .eq('id', importId);
  }
}
