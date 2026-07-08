# ERD 상세 문서

## 테이블 관계도

```
act_past_questions
  │  (기출문제 원본, PDF 파싱으로 입력)
  │
  └──[uuid[] 참조]──► act_weekly_issues.questions[].similar_past_question_ids

act_weekly_issues
  │  (독립 테이블, 주간 배치로 생성)
  │  issue_date UNIQUE (주당 1건, 당주 published 있으면 배치 no-op)
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

act_ai_answers
     (AI 모범답안 캐시. question_key UNIQUE:
      기출 'past:{id}' | 가상 'virtual:{issue_date}:{question_no}')
     승인 회원 전용 (/api/answer가 게이트)

act_kidi_reports
     (보험연구원 보고서. 임포트→enrich→학습노트 파이프라인)
     status: pending|processed|error, exam_relevance: high|medium|low
     study_notes(마크다운) — 승인 회원에게 노출
     └──[태그 매칭]──► act_past_questions (related_question_tags ↔ tags)

auth.users ──< act_user_profiles
     id FK (ON DELETE CASCADE), 트리거 handle_new_user()로 자동 생성
     status: pending|approved|rejected (관리자 승인)
```

> **전체 9개 테이블**: 위 6개 + `act_ai_answers`, `act_kidi_reports`, `act_user_profiles`.

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

[Vercel Cron — 매일 08:00 KST (schedule "0 23 * * *"), 당주 published 있으면 no-op]

  GET /api/cron/weekly
    → 당주 status='published' 이슈 존재 시 즉시 종료(멱등, 실패 시 다음 날 재시도)
    → act_news_sources (is_active=true) 조회
    → Claude Sonnet: 뉴스 수집 (5~10개)
    → act_past_questions: 유사 기출 키워드 검색
    → act_rag_embeddings: pgvector 유사도 검색 (있는 경우)
    → Claude Sonnet: 주관식 가상 문제 3~5개 생성 (선택지 없음)
    → act_weekly_issues INSERT

[회원 인증 — Supabase Auth]

  회원가입 POST /api/auth/signup
    → auth.users INSERT → 트리거 → act_user_profiles (status='pending')
  관리자 승인 PATCH /api/admin/users
    → act_user_profiles.status='approved'
  승인 회원 전용
    → POST /api/answer (AI 모범답안, act_ai_answers 캐시)
    → GET /api/kidi-reports* (KIDI 보고서·학습노트)

[KIDI 파이프라인 — 관리자/CLI]

  POST /api/admin/kidi-import (또는 scripts/parse-kidi.ts)
    → act_kidi_reports INSERT (요약·태그)
  scripts/update-kidi-relevance.ts
    → exam_relevance, related_question_tags 분류
  POST /api/admin/kidi-enrich (또는 scripts/enrich-kidi-content.ts)
    → study_notes 생성

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

| 테이블 | 접근 제어 | 이유 |
|-------|---------|------|
| `act_past_questions` | 공개 응답에서 `answer`, `explanation` 제외 | 정답·해설 미표시 정책 |
| `act_weekly_issues` | 제외 컬럼 없음 | questions jsonb에 정답 없음 (생성 시 제외) |
| `act_ai_answers` | 승인 회원 전용(`/api/answer` 게이트, `supabaseAdmin` 접근) | AI 모범답안 = 페이월 콘텐츠 |
| `act_kidi_reports` | `study_notes`는 승인 회원 전용 열람 | KIDI 학습노트 = 페이월 콘텐츠 |
| `act_user_profiles` | 본인 프로필만(RLS `user_read_own`), 관리자만 승인 변경 | 회원 개인정보 |
