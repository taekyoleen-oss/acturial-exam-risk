import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';

const TOPIC_TAGS = [
  'IFRS17/보험부채',
  'K-ICS/지급여력',
  '시장리스크/VaR',
  '금리리스크/ALM',
  '신용위험',
  '운영위험',
  '재보험',
  '계리기법/기초서류',
  'ERM/전사리스크',
  'CSM/계리가정',
];

const QuestionSchema = z.object({
  question_no: z.number().int().positive(),
  question_text: z.string().min(1),
  points: z.number().int().positive().default(20),
  answer: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  has_formula: z.boolean().default(false),
});

/** 텍스트에서 첫 번째 완전한 JSON 배열을 추출 */
function extractJsonArray(text: string): string {
  const start = text.indexOf('[');
  if (start === -1) return '[]';
  let depth = 0, inString = false, escape = false;
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

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const yearStr = formData.get('year') as string | null;
  const session = (formData.get('session') as string | null) ?? '2차';

  if (!file || !yearStr) {
    return NextResponse.json({ error: 'file, year 필수' }, { status: 400 });
  }

  const year = parseInt(yearStr, 10);
  if (isNaN(year)) {
    return NextResponse.json({ error: '연도 형식 오류' }, { status: 400 });
  }

  // 파일명에서 회차 자동 파싱 (예: 2018년_41회_2차시험_계리리스크관리.pdf)
  const sessionFromFilename = file.name.match(/(\d+회)/)?.[1] ?? null;
  const resolvedSession = sessionFromFilename ?? session;

  const { data: importRow, error: importError } = await supabaseAdmin
    .from('act_pdf_imports')
    .insert({ filename: file.name, year, session: resolvedSession, status: 'processing' })
    .select()
    .single();

  if (importError || !importRow) {
    return NextResponse.json({ error: '이력 생성 실패' }, { status: 500 });
  }

  processPdf(file, year, resolvedSession, importRow.id).catch(console.error);

  return NextResponse.json({ importId: importRow.id, status: 'processing' });
}

async function processPdf(file: File, year: number, session: string, importId: string) {
  try {
    // pdf-parse v1 — lib/pdf-parse.js 직접 참조 (테스트 파일 자동로드 버그 우회)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `다음은 보험계리사 2차 계리리스크관리론 시험지 OCR 텍스트입니다.
주관식 논술형 문항을 모두 추출하고, 각 문항에 아래 주제 태그 목록에서 1~2개를 선택하여 tags 배열에 포함하세요.

[주제 태그 목록]
${TOPIC_TAGS.join(', ')}

출력 스키마 (JSON 배열만 반환, 다른 설명 없이):
[{
  "question_no": 1,
  "question_text": "문제 전체 텍스트 (소문항 포함)",
  "points": 20,
  "answer": null,
  "explanation": null,
  "tags": ["태그1"],
  "has_formula": false
}]

규칙:
- question_text에 문제 전체(소문항 포함)를 그대로 담으세요
- points는 괄호 안 배점(예: (20점))에서 추출, 없으면 20
- 수식·수학기호가 포함된 문항은 has_formula: true

시험지 텍스트:
${extractedText.slice(0, 15000)}`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJsonArray(raw);
    const parsed = JSON.parse(jsonStr);
    const questions = z.array(QuestionSchema).parse(parsed);

    const rows = questions.map((q) => ({
      year,
      session,
      subject: '리스크관리',
      question_no: q.question_no,
      question_text: q.question_text,
      options: JSON.stringify([]),   // 주관식 — 선택지 없음
      answer: q.answer ?? null,
      explanation: q.explanation ?? null,
      tags: q.tags,
      has_formula: q.has_formula,
      source_pdf: importId,
    }));

    await supabaseAdmin.from('act_past_questions').upsert(rows, {
      onConflict: 'year,session,subject,question_no',
    });

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
