/**
 * 교재 전처리 스크립트
 *
 * 입력: input-textbook/raw.txt (OCR 추출된 텍스트)
 * 출력:
 *   - input-textbook/chunks.jsonl  (청킹 결과)
 *   - input-textbook/metadata.json (교재 메타데이터)
 *
 * 사용법:
 *   node scripts/process-textbook.mjs [입력파일경로]
 *   node scripts/process-textbook.mjs                    # 기본: input-textbook/raw.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT_DIR = path.join(ROOT, 'input-textbook');

const inputFile = process.argv[2] ?? path.join(INPUT_DIR, 'raw.txt');
const chunksOutput = path.join(INPUT_DIR, 'chunks.jsonl');
const metaOutput = path.join(INPUT_DIR, 'metadata.json');

const CHUNK_SIZE = 800;   // 목표 청크 크기 (글자 수)
const OVERLAP = 200;      // 이전 청크와의 겹침 (글자 수)

// ─── 챕터/섹션 감지 패턴 ───────────────────────────────────────────────────
const CHAPTER_RE = /^제\s*(\d+|[일이삼사오육칠팔구십]+)\s*장\s*[:\s]*(.*)$/;
const SECTION_RE = /^(\d+)\s*\.\s*(\d+)\s+(.+)$/;
const SECTION_SHORT_RE = /^(\d+)\s*\.\s*(.+)$/;

// 수식 감지 패턴 (LaTeX 스타일 + 기호)
const FORMULA_RE = /(\$\$?[^$]+\$\$?|\\frac|\\sum|\\int|\\sqrt|[∑∫√±×÷≤≥≠∞αβγδεζηθλμπρστφψω])/;

function detectChapter(line) {
  const m = line.trim().match(CHAPTER_RE);
  if (m) return { chapter: m[1], chapter_title: m[2].trim() };
  return null;
}

function detectSection(line) {
  const m1 = line.trim().match(SECTION_RE);
  if (m1) return `${m1[1]}.${m1[2]}`;
  const m2 = line.trim().match(SECTION_SHORT_RE);
  if (m2) return m2[1];
  return null;
}

function hasFormula(text) {
  return FORMULA_RE.test(text);
}

function splitIntoParagraphs(text) {
  // Split on blank lines
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

function chunkParagraphs(paragraphs) {
  const chunks = [];
  let current = '';
  let overlap = '';

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;

    if (candidate.length <= CHUNK_SIZE) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current);
        // Prepare overlap from end of current chunk
        overlap = current.slice(-OVERLAP);
      }
      // Start new chunk with overlap prefix
      current = overlap ? overlap + '\n\n' + para : para;
      overlap = '';

      // If a single paragraph exceeds CHUNK_SIZE, hard-split it
      if (current.length > CHUNK_SIZE * 2) {
        let pos = 0;
        while (pos < current.length) {
          chunks.push(current.slice(pos, pos + CHUNK_SIZE));
          pos += CHUNK_SIZE - OVERLAP;
        }
        current = '';
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function processText(rawText) {
  const lines = rawText.split('\n');

  let currentChapter = '0';
  let currentChapterTitle = '서론';
  let currentSection = '';

  // Group lines into sections
  const sections = [];
  let sectionLines = [];

  for (const line of lines) {
    const chap = detectChapter(line);
    if (chap) {
      if (sectionLines.length > 0) {
        sections.push({ chapter: currentChapter, chapter_title: currentChapterTitle, section: currentSection, text: sectionLines.join('\n') });
        sectionLines = [];
      }
      currentChapter = chap.chapter;
      currentChapterTitle = chap.chapter_title;
      currentSection = '';
      continue;
    }

    const sec = detectSection(line);
    if (sec) {
      if (sectionLines.length > 0) {
        sections.push({ chapter: currentChapter, chapter_title: currentChapterTitle, section: currentSection, text: sectionLines.join('\n') });
        sectionLines = [];
      }
      currentSection = sec;
      continue;
    }

    sectionLines.push(line);
  }

  if (sectionLines.length > 0) {
    sections.push({ chapter: currentChapter, chapter_title: currentChapterTitle, section: currentSection, text: sectionLines.join('\n') });
  }

  // Chunk each section
  const allChunks = [];
  let globalIdx = 0;

  for (const sec of sections) {
    const paragraphs = splitIntoParagraphs(sec.text);
    const chunks = chunkParagraphs(paragraphs);

    for (const chunkContent of chunks) {
      if (!chunkContent.trim()) continue;
      allChunks.push({
        chunk_index: globalIdx++,
        chapter: sec.chapter,
        chapter_title: sec.chapter_title,
        section: sec.section,
        content: chunkContent.trim(),
        has_formula: hasFormula(chunkContent),
      });
    }
  }

  return allChunks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
if (!fs.existsSync(inputFile)) {
  console.error(`입력 파일을 찾을 수 없습니다: ${inputFile}`);
  console.error('input-textbook/raw.txt 에 OCR 텍스트를 배치한 후 다시 실행하세요.');
  process.exit(1);
}

console.log(`입력 파일: ${inputFile}`);
const rawText = fs.readFileSync(inputFile, 'utf-8');
console.log(`텍스트 길이: ${rawText.length.toLocaleString()}자`);

const chunks = processText(rawText);
console.log(`생성된 청크 수: ${chunks.length}`);

// Write chunks.jsonl
const chunksJsonl = chunks.map((c) => JSON.stringify(c)).join('\n');
fs.mkdirSync(INPUT_DIR, { recursive: true });
fs.writeFileSync(chunksOutput, chunksJsonl, 'utf-8');
console.log(`청크 저장: ${chunksOutput}`);

// Write metadata.json
const metadata = {
  title: '계리리스크관리 교재',
  description: '보험계리사 2차 계리리스크관리 시험 교재 (270페이지)',
  source_type: 'textbook',
  language: 'ko',
  total_chunks: chunks.length,
  total_chars: rawText.length,
  chapters: [...new Set(chunks.map((c) => c.chapter))].length,
  created_at: new Date().toISOString(),
};
fs.writeFileSync(metaOutput, JSON.stringify(metadata, null, 2), 'utf-8');
console.log(`메타데이터 저장: ${metaOutput}`);

// Summary
const formulaChunks = chunks.filter((c) => c.has_formula).length;
console.log(`\n=== 처리 결과 ===`);
console.log(`총 청크: ${chunks.length}개`);
console.log(`수식 포함: ${formulaChunks}개`);
console.log(`챕터 수: ${metadata.chapters}개`);
console.log(`평균 청크 크기: ${Math.round(rawText.length / chunks.length)}자`);
