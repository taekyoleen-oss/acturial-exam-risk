# input-textbook/

교재 RAG 파이프라인 작업 디렉토리

## 파일 배치

| 파일 | 설명 |
|------|------|
| `raw.txt` | OCR 추출된 교재 원문 텍스트 (직접 배치) |
| `chunks.jsonl` | `process-textbook.mjs` 출력 — 청킹된 교재 단위 |
| `metadata.json` | `process-textbook.mjs` 출력 — 교재 메타데이터 |
| `embeddings.jsonl` | `embed-textbook.mjs` 출력 — 청크별 임베딩 벡터 |

## 실행 순서

```bash
# 1. raw.txt를 이 디렉토리에 배치
# 2. 청킹
node scripts/process-textbook.mjs

# 3. 임베딩 생성
node scripts/embed-textbook.mjs

# 4. DB 업로드
node scripts/upload-textbook.mjs
```

## 주의
- `raw.txt`, `embeddings.jsonl`은 용량이 클 수 있으므로 .gitignore에 추가 권장
