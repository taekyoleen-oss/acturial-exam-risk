/**
 * KIDI 보험연구원 주간지 PDF 배치 파싱 스크립트
 *
 * 사용법:
 *   npx tsx scripts/parse-kidi.ts [--dry-run] [--reprocess] [--file=파일명]
 *
 * 옵션:
 *   --dry-run     : DB 저장 없이 파싱 결과만 출력
 *   --reprocess   : 이미 처리된 파일도 재처리
 *   --file=XXX    : 특정 파일 하나만 처리
 *
 * 환경변수 (.env.local):
 *   ANTHROPIC_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = path.join(__dirname, '../input-kidi');

// PDF 파싱은 pdf-parse 사용
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  buf: Buffer
) => Promise<{ text: string; numpages: number }>;

// 환경변수 로드 (.env.local)
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local 파일이 없습니다.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
}

/** 파일명에서 메타데이터 파싱 */
function parseFilename(filename: string): {
  fileNo: number;
  issueNo: number;
  title: string;
} | null {
  // 예: 0045_[권호 _ 제635호]2025년 글로벌 보험회사의 M&A 주요 사례.pdf
  const match = filename.match(/^(\d+)_\[권호 _ 제(\d+)호\](.+)\.pdf$/);
  if (!match) return null;
  return {
    fileNo: parseInt(match[1], 10),
    issueNo: parseInt(match[2], 10),
    title: match[3].trim(),
  };
}

const TOPIC_CATEGORIES = [
  '연금/퇴직연금',
  '기후/재해위험',
  '사이버보험/정보보호',
  'AI/디지털기술',
  '자동차보험',
  '지급여력/자본관리',
  '의료/건강보험',
  '생명보험/재보험',
  '투자/자산운용',
  '규제/제도',
  '장기요양/고령화',
  '기타',
];

async function summarizeWithClaude(text: string, title: string) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `다음은 보험연구원(KIDI) 주간 보고서의 내용입니다.
제목: ${title}

아래 지시에 따라 분석하세요.

1. summary: 보고서 핵심 내용을 계리사 시험 수험생 관점에서 2~3문단으로 요약
2. key_points: 시험에서 출제 가능한 핵심 포인트 5개 (간결한 문장)
3. tags: 관련 주제 태그 2~4개 (예: IFRS17, 지급여력, 기후위험, 재보험 등)
4. topic_category: 아래 카테고리 중 가장 적합한 것 1개 선택
   ${TOPIC_CATEGORIES.join(', ')}

JSON만 반환 (설명 없이):
{
  "summary": "...",
  "key_points": ["...", "...", "...", "...", "..."],
  "tags": ["...", "..."],
  "topic_category": "..."
}

보고서 본문 (최대 8000자):
${text.slice(0, 8000)}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text;

  // JSON 추출
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON 파싱 실패: ' + raw.slice(0, 200));
  return JSON.parse(jsonMatch[0]) as {
    summary: string;
    key_points: string[];
    tags: string[];
    topic_category: string;
  };
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const reprocess = args.includes('--reprocess');
  const singleFile = args.find((a) => a.startsWith('--file='))?.split('=')[1];

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 이미 처리된 파일 목록 조회
  const { data: existing } = await supabase
    .from('act_kidi_reports')
    .select('source_file, status');
  const processedFiles = new Set(
    (existing ?? [])
      .filter((r) => !reprocess && r.status === 'processed')
      .map((r) => r.source_file)
  );

  // 처리할 파일 목록
  let files = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .sort();

  if (singleFile) {
    files = files.filter((f) => f.includes(singleFile));
    if (files.length === 0) {
      console.error(`파일을 찾을 수 없습니다: ${singleFile}`);
      process.exit(1);
    }
  }

  const pending = files.filter((f) => !processedFiles.has(f));
  console.log(`처리 대상: ${pending.length}개 / 전체 ${files.length}개`);

  if (pending.length === 0) {
    console.log('처리할 파일이 없습니다. --reprocess 옵션을 사용하면 재처리합니다.');
    return;
  }

  if (!isDryRun) {
    console.log(`${pending.length}개 파일 처리를 시작합니다...`);
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const filename = pending[i];
    const meta = parseFilename(filename);
    if (!meta) {
      console.warn(`[SKIP] 파일명 파싱 실패: ${filename}`);
      continue;
    }

    console.log(`\n[${i + 1}/${pending.length}] ${filename}`);
    console.log(`  권호: 제${meta.issueNo}호 | 제목: ${meta.title}`);

    try {
      const filePath = path.join(INPUT_DIR, filename);
      const buffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text;
      console.log(`  PDF 텍스트: ${text.length}자`);

      const result = await summarizeWithClaude(text, meta.title);
      console.log(`  카테고리: ${result.topic_category}`);
      console.log(`  태그: ${result.tags.join(', ')}`);
      console.log(`  핵심포인트: ${result.key_points.length}개`);

      if (isDryRun) {
        console.log('  [DRY-RUN] DB 저장 생략');
        console.log('  요약 미리보기:', result.summary.slice(0, 100) + '...');
        success++;
        continue;
      }

      // DB upsert
      const { error } = await supabase
        .from('act_kidi_reports')
        .upsert(
          {
            issue_no: meta.issueNo,
            file_no: meta.fileNo,
            title: meta.title,
            summary: result.summary,
            key_points: result.key_points,
            tags: result.tags,
            topic_category: result.topic_category,
            source_file: filename,
            status: 'processed',
            processed_at: new Date().toISOString(),
            error_msg: null,
          },
          { onConflict: 'source_file' }
        );

      if (error) {
        throw new Error(`DB 저장 실패: ${error.message}`);
      }

      console.log('  ✓ 저장 완료');
      success++;
    } catch (err) {
      console.error(`  ✗ 오류:`, err);
      failed++;

      if (!isDryRun) {
        await supabase.from('act_kidi_reports').upsert(
          {
            issue_no: meta.issueNo,
            file_no: meta.fileNo,
            title: meta.title,
            source_file: filename,
            status: 'error',
            error_msg: String(err),
          },
          { onConflict: 'source_file' }
        );
      }
    }

    // API 레이트 리밋 방지 (1초 대기)
    if (i < pending.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n완료: 성공 ${success}개, 실패 ${failed}개`);
}

main().catch((err) => {
  console.error('스크립트 오류:', err);
  process.exit(1);
});
