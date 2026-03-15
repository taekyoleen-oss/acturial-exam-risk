# ERD 상세 문서

## 테이블 관계도

```
act_past_questions
  │  (기출문제 원본, PDF 파싱으로 입력)
  │
  └──[uuid[] 참조]──► act_weekly_issues.questions[].similar_past_question_ids

act_weekly_issues
  │  (독립 테이블, 주간 배치로 생성)
  │  issue_date UNIQUE (주 1회)
  │
  └── status: 'draft' | 'published' | 'failed'

act_news_sources
     (관리자 편집, 주간 배치 시 is_active=true 목록 참조)

act_pdf_imports
     (기출 PDF 파싱 이력, 관리자 /admin에서 확인)

act_rag_textbooks ──< act_rag_embeddings
     textbook_id FK (ON DELETE CASCADE)
     embedding vector(1536) — OpenAI text-embedding-3-small
     HNSW 인덱스 (vector_cosine_ops)
```

## 데이터 흐름

```
[관리자 — /admin]

  OCR PDF 업로드
    → POST /api/admin/pdf-import
    → act_pdf_imports (pending → completed)
    → act_past_questions INSERT

  embeddings.jsonl 업로드
    → POST /api/rag/upload
    → act_rag_textbooks UPSERT
    → act_rag_embeddings 배치 INSERT

  뉴스 발행기관 설정
    → GET/POST/DELETE /api/admin/news-sources
    → act_news_sources CRUD

[Vercel Cron — 매주 월요일 08:00 KST]

  GET /api/cron/weekly
    → act_news_sources (is_active=true) 조회
    → Claude Sonnet: 뉴스 수집
    → act_past_questions: 유사 기출 키워드 검색
    → act_rag_embeddings: pgvector 유사도 검색 (있는 경우)
    → Claude Sonnet: 가상 문제 5개 생성
    → act_weekly_issues INSERT

[일반 사용자 — 공개 페이지]

  / (홈)
    → act_weekly_issues (최신 1건, published) 조회

  /weekly
    → act_weekly_issues (최신, published) 조회
    → act_past_questions (similar_past_question_ids 기반) 조회
      ※ answer, explanation 제외

  /weekly/[year]/[week]
    → act_weekly_issues (issue_date 기반) 조회

  /past-questions?year=2022
    → act_past_questions (year 필터) 조회
      ※ answer, explanation 제외
```

## 컬럼 접근 제어 요약

| 테이블 | 공개 제외 컬럼 | 이유 |
|-------|-------------|------|
| `act_past_questions` | `answer`, `explanation` | 정답·해설 미표시 정책 |
| `act_weekly_issues` | — | questions jsonb에 정답 없음 (생성 시 제외) |
