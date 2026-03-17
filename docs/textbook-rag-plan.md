# 교재 RAG 추가 계획

> **상태**: 대기 중 — 교재 파일 확보 후 실행
> **스크립트**: 모두 구현·커밋 완료, 교재 파일만 준비되면 즉시 실행 가능

---

## 현재 RAG 인프라 (이미 구축됨)

- `act_rag_textbooks` / `act_rag_embeddings` 테이블 존재
- `app/api/rag/upload/route.ts` — metadata.json + embeddings.jsonl 업로드 API 완비
- `lib/rag/resolver.ts` — pgvector 유사도 검색 완비
- `scripts/generate-embeddings.mjs` — 임베딩 생성 스크립트 존재
- **기반 인프라 추가 구축 불필요, 스크립트만 추가**

---

## 구현 단계

### Step 1: 교재 원문 준비
- PDF 또는 텍스트 파일을 `input-textbook/raw.txt`로 배치
- OCR이 필요한 경우: PDF → OCR 텍스트 추출 선행

### Step 2: 청킹 (`scripts/process-textbook.mjs`)
- 입력: `input-textbook/raw.txt`
- 처리:
  - 챕터/섹션 마커 감지 (`제X장`, `X.X` 패턴)
  - 약 800자 단위 청킹 (문단 경계 존중, 200자 overlap)
  - 수식 포함 여부 감지 (LaTeX 패턴 또는 수식 기호)
- 출력:
  - `input-textbook/chunks.jsonl` — (chunk_index, chapter, chapter_title, section, content, has_formula)
  - `input-textbook/metadata.json` — 교재 메타데이터

### Step 3: 임베딩 생성 (`scripts/embed-textbook.mjs`)
- 입력: `input-textbook/chunks.jsonl`
- 모델: OpenAI text-embedding-3-small (1536차원)
- 배치 처리 (100개씩), 에러 시 재시도 3회, 중단 후 재개 지원
- 출력: `input-textbook/embeddings.jsonl`

### Step 4: DB 업로드 (`scripts/upload-textbook.mjs`)
- 입력: `input-textbook/metadata.json` + `input-textbook/embeddings.jsonl`
- `/api/rag/upload`에 multipart POST
- `x-admin-id` 헤더 필요 (`ADMIN_USER_ID` 값)

---

## 실행 명령어

```bash
# 1. OCR 추출된 교재 텍스트를 배치
cp 교재원문.txt input-textbook/raw.txt

# 2. 청킹 (챕터/섹션 분리, 800자 단위)
node scripts/process-textbook.mjs

# 3. 임베딩 생성 (~$0.003, 약 ₩4)
node scripts/embed-textbook.mjs

# 4. Supabase DB 업로드
node scripts/upload-textbook.mjs
```

---

## 비용 분석

| 항목 | 수치 |
|------|------|
| 규모 | 270페이지 × 평균 2,500자 = 약 675,000자 (135,000 토큰) |
| 청크 수 | 약 840~900개 |
| 모델 | OpenAI text-embedding-3-small |
| 단가 | $0.02 / 1M tokens |
| **총 임베딩 비용** | **약 $0.003 (₩4) — 사실상 무료** |

---

## 완료 후 검증

1. `chunks.jsonl` 생성 확인 — 청크 수, 챕터 분리 적절성
2. `embeddings.jsonl` 생성 확인 — 청크 수 일치
3. DB 업로드 확인 — `act_rag_textbooks` / `act_rag_embeddings` 레코드 수
4. 주간 배치 실행 → RAG 모드가 `rag_enhanced`로 전환 확인
5. 이번 주 예상문제에 📚 배지 표시 확인

---

## 참고

- `input-textbook/raw.txt`, `input-textbook/embeddings.jsonl`은 용량이 클 수 있으므로 `.gitignore` 추가 권장
- OCR 추출이 필요한 경우 별도 지원 가능
