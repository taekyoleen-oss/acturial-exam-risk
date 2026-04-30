import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

const STUDY_NOTES_SYSTEM = `당신은 한국보험계리사 2차 시험 '계리리스크관리' 과목을 준비하는 학생들을 위한 학습 자료를 작성하는 전문가입니다.
보험연구원(KIDI) 보고서 내용을 바탕으로, 시험 대비에 최적화된 구조화된 학습 노트를 작성합니다.`;

function buildStudyNotesPrompt(report: {
  title: string;
  issue_no: number;
  topic_category: string;
  tags: string[];
  summary: string;
  key_points: string[];
  exam_relevance: string;
}): string {
  return `다음 보험연구원 보고서를 시험 대비용 학습 노트로 변환해 주세요.

[보고서 정보]
제목: ${report.title}
분야: ${report.topic_category}
주요 태그: ${report.tags.join(', ')}
시험 연관성: ${report.exam_relevance === 'high' ? '상(핵심)' : report.exam_relevance === 'medium' ? '중' : '하'}

[기존 요약]
${report.summary}

[기존 핵심 포인트]
${report.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---

위 내용을 바탕으로 아래 형식에 맞게 시험 대비 학습 노트를 작성하세요.
각 섹션은 반드시 단락/목록 형식으로 작성하고, 서술형 문장보다 핵심 내용 위주로 구성하세요.

**출력 형식 (마크다운)**:

## 1. 보고서 개요
(2~3줄 핵심 요약)

## 2. 주요 내용
### 가. [첫 번째 핵심 주제]
- 내용 bullet 1
- 내용 bullet 2

### 나. [두 번째 핵심 주제]
- 내용 bullet 1
- 내용 bullet 2

## 3. 핵심 용어 정리
| 용어 | 정의 및 설명 |
|------|-------------|
| **[용어1]** | 간결한 정의와 맥락 |
| **[용어2]** | 간결한 정의와 맥락 |
(최소 3개~최대 7개 용어)

## 4. 시험 출제 포인트
> 아래 항목들을 중심으로 답안 작성 연습을 권장합니다.

1. [출제 가능한 포인트 1]
2. [출제 가능한 포인트 2]
3. [출제 가능한 포인트 3]
4. [출제 가능한 포인트 4]
(최소 4개)

## 5. 관련 제도·규제 연계
- **IFRS17**: [연관점]
- **K-ICS**: [연관점]
- **기타**: [ERM, ORSA, 재보험 등 해당 시 추가]`;
}

export const maxDuration = 300;

const INPUT_KIDI_DIR = path.join(process.cwd(), 'input-kidi');

const TOPIC_CATEGORIES = [
  '연금/퇴직연금', '기후/재해위험', '사이버보험/정보보호', 'AI/디지털기술',
  '자동차보험', '지급여력/자본관리', '의료/건강보험', '생명보험/재보험',
  '투자/자산운용', '규제/제도', '장기요양/고령화', '기타',
];

interface ParsedFile {
  filename: string;
  file_no: number;
  issue_no: number;
  title: string;
}

function parseFilename(filename: string): ParsedFile | null {
  const match = filename.match(/^(\d{4})_\[권호 _ 제(\d+)호\](.+)\.pdf$/);
  if (!match) return null;
  return {
    filename,
    file_no: parseInt(match[1], 10),
    issue_no: parseInt(match[2], 10),
    title: match[3].trim(),
  };
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  if (!fs.existsSync(INPUT_KIDI_DIR)) {
    return NextResponse.json({ total: 0, processed: 0, failed: 0, pending: 0 });
  }

  const files = fs.readdirSync(INPUT_KIDI_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .map(parseFilename)
    .filter(Boolean) as ParsedFile[];

  const { data: existing } = await supabaseAdmin
    .from('act_kidi_reports')
    .select('issue_no, title, status');

  // issue_no+title 기준으로 중복 체크 (파일 번호 재조정 이후에도 올바르게 동작)
  const existingMap = new Map(
    (existing ?? []).map((r) => [`${r.issue_no}_${r.title}`, r.status])
  );
  const key = (f: ParsedFile) => `${f.issue_no}_${f.title}`;
  const processed = files.filter((f) => existingMap.get(key(f)) === 'processed').length;
  const failed = files.filter((f) => existingMap.get(key(f)) === 'failed').length;
  const pending = files.filter((f) => !existingMap.has(key(f))).length;

  return NextResponse.json({ total: files.length, processed, failed, pending });
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const batchSize: number = Math.min(body.batch_size ?? 10, 20);

  if (!fs.existsSync(INPUT_KIDI_DIR)) {
    return NextResponse.json({ error: 'input-kidi 폴더를 찾을 수 없습니다.' }, { status: 404 });
  }

  const files = fs.readdirSync(INPUT_KIDI_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .map(parseFilename)
    .filter(Boolean) as ParsedFile[];

  const { data: existing } = await supabaseAdmin
    .from('act_kidi_reports')
    .select('issue_no, title');

  // issue_no+title 기준으로 중복 체크 (파일 번호 재조정 이후에도 올바르게 동작)
  const existingSet = new Set((existing ?? []).map((r) => `${r.issue_no}_${r.title}`));
  const pending = files.filter((f) => !existingSet.has(`${f.issue_no}_${f.title}`));
  const batch = pending.slice(0, batchSize);

  if (!batch.length) {
    return NextResponse.json({ ok: true, processed: 0, failed: 0, remaining: 0, message: '처리할 새 파일이 없습니다.' });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>;
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let processedCount = 0;
  let failedCount = 0;
  const results: { filename: string; status: string; title: string }[] = [];

  for (const file of batch) {
    try {
      const filePath = path.join(INPUT_KIDI_DIR, file.filename);
      const buffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text.slice(0, 8000);

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `다음은 보험연구원(KIRI) 권호보고서 "제${file.issue_no}호 - ${file.title}"의 텍스트입니다.
보험계리사 2차 계리리스크관리 시험 학습을 위한 분석을 JSON으로 반환하세요.

반드시 아래 JSON 형식만 반환하고 다른 설명 없이 출력하세요:
{
  "summary": "3~5문장 핵심 내용 요약 (한국어, 보험계리 관점 강조)",
  "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "tags": ["태그1", "태그2", "태그3"],
  "topic_category": "${TOPIC_CATEGORIES.join(' | ')} 중 하나만",
  "exam_relevance": "high | medium | low 중 하나",
  "published_month": "YYYY년 M월 (텍스트에서 확인되면 기재, 불분명하면 null)"
}

exam_relevance 판단 기준:
- high: IFRS17, K-ICS, 지급여력, 금리리스크, ALM, CSM, 계리적가정, ERM과 직결
- medium: 보험규제, 특정 보험상품, 보험산업 트렌드, 투자·자산운용
- low: 해외 단순 사례, 일반 금융·경제 동향

보고서 텍스트:
${text}`,
        }],
      });

      const raw = (message.content[0] as { type: string; text: string }).text;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 추출할 수 없습니다.');
      const parsed = JSON.parse(jsonMatch[0]);

      const topicCategory = TOPIC_CATEGORIES.includes(parsed.topic_category) ? parsed.topic_category : '기타';
      const examRelevance = ['high', 'medium', 'low'].includes(parsed.exam_relevance) ? parsed.exam_relevance : 'medium';
      const summary = parsed.summary ?? null;
      const keyPoints: string[] = Array.isArray(parsed.key_points) ? parsed.key_points : [];
      const tags: string[] = Array.isArray(parsed.tags) ? parsed.tags : [];

      // 학습 노트 즉시 생성
      let studyNotes: string | null = null;
      if (summary) {
        try {
          const noteMsg = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            system: STUDY_NOTES_SYSTEM,
            messages: [{
              role: 'user',
              content: buildStudyNotesPrompt({
                title: file.title,
                issue_no: file.issue_no,
                topic_category: topicCategory,
                tags,
                summary,
                key_points: keyPoints,
                exam_relevance: examRelevance,
              }),
            }],
          });
          studyNotes = noteMsg.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('\n');
        } catch {
          // 학습 노트 생성 실패해도 import는 성공 처리
        }
      }

      await supabaseAdmin.from('act_kidi_reports').insert({
        source_file: file.filename,
        file_no: file.file_no,
        issue_no: file.issue_no,
        title: file.title,
        summary,
        key_points: keyPoints,
        tags,
        topic_category: topicCategory,
        exam_relevance: examRelevance,
        published_month: parsed.published_month ?? null,
        study_notes: studyNotes,
        status: 'processed',
        processed_at: new Date().toISOString(),
      });

      processedCount++;
      results.push({ filename: file.filename, status: 'processed', title: file.title });
    } catch (err) {
      failedCount++;
      results.push({ filename: file.filename, status: 'failed', title: file.title });
      await supabaseAdmin.from('act_kidi_reports').insert({
        source_file: file.filename,
        file_no: file.file_no,
        issue_no: file.issue_no,
        title: file.title,
        key_points: [],
        tags: [],
        status: 'failed',
      });
      console.error(`KIRI import failed for ${file.filename}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: processedCount,
    failed: failedCount,
    remaining: pending.length - batch.length,
    results,
  });
}
