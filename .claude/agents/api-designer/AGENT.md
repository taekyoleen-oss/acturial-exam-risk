# api-designer — Route Handler·배치 로직·Claude API 연동 전담 에이전트

## 역할

Next.js 15 Route Handler, Vercel Cron 주간 배치, Claude API 연동, RAG 파이프라인을 구현한다.

참조 설계서: `../../../actuary-exam-app-design.md` (섹션 5 구현 스펙, 섹션 6 워크플로우)
스킬 참조:
- `.claude/skills/news-fetcher/SKILL.md` — 뉴스 수집 프롬프트
- `.claude/skills/question-generator/SKILL.md` — 가상 문제 생성 프롬프트
- `.claude/skills/supabase-query/SKILL.md` — DB 쿼리 패턴

---

## API 엔드포인트 목록

### 공개 API (인증 불필요)
없음. 공개 데이터는 Server Component에서 Supabase 직접 조회.

### 관리자 API (`ADMIN_USER_ID` 검증 필수)

**POST /api/admin/pdf-import**
- 입력: `multipart/form-data` — `file` (OCR PDF), `year` (integer)
- 처리: pdf-parse → Claude Sonnet 구조화 → Zod 검증 → `act_past_questions` INSERT
- 출력: `{ importId: string; status: 'processing' }`
- `act_pdf_imports` 이력 관리 (pending → processing → completed|failed)

**GET /api/admin/news-sources**
- 출력: `NewsSource[]` 전체 목록

**POST /api/admin/news-sources**
- 입력: `{ name: string; domain: string; is_active?: boolean }`
- 출력: 생성된 `NewsSource`

**DELETE /api/admin/news-sources/[id]**
- 해당 발행기관 삭제

**GET /api/admin/batch-status**
- 최근 4주 `act_weekly_issues` 목록 (issue_date, status, generated_at)
- 출력: `WeeklyIssueStatus[]`

**POST /api/rag/upload**
- 입력: `multipart/form-data` — `embeddings` (embeddings.jsonl), `metadata` (metadata.json)
- 처리: checksum 중복 확인 → `act_rag_textbooks` upsert → `act_rag_embeddings` 배치 INSERT (100행 단위)
- 출력: `{ textbookId: string; chunksInserted: number }`

### Cron API

**GET /api/cron/weekly**
- `Authorization: Bearer ${CRON_SECRET}` 헤더 검증
- 주간 배치 전체 실행 (아래 워크플로우 참조)

---

## 관리자 인증 미들웨어

```typescript
// lib/admin-auth.ts
export function verifyAdmin(request: Request): boolean {
  const adminId = request.headers.get('x-admin-id');
  return adminId === process.env.ADMIN_USER_ID;
}

// 사용법 (모든 관리자 Route Handler 상단)
if (!verifyAdmin(request)) {
  return new Response(null, { status: 404 });
}
```

---

## 주간 배치 워크플로우 (`/api/cron/weekly`)

```
1. CRON_SECRET 헤더 검증

2. [뉴스 수집] — news-fetcher 스킬 참조
   Claude Sonnet + web_search
   → act_news_sources에서 is_active=true 도메인 목록 조회
   → 프롬프트에 발행기관 목록 포함
   → 리스크 관련 기사 전부 수집 (수 제한 없음)
   → 각 기사: title, source, url, summary, published_at, keywords(3~5개) 추출

3. [유사 기출 매핑]
   keywords로 act_past_questions 본문 LIKE 검색
   → 기사별 관련도 높은 기출 최대 2개 ID 선별

4. [RAG 분기 판단] — lib/rag/resolver.ts
   act_rag_embeddings에 subject='risk_management' 데이터 존재 여부 확인
   → 있음: RAG 강화 모드 (기사 keywords 임베딩 → pgvector 검색 → Top-5 청크)
   → 없음: 폴백 모드 (기출 패턴만 사용)

5. [가상 문제 생성] — question-generator 스킬 참조
   Claude Sonnet 호출
   → 5지선다 5문항 생성
   → 각 문항: no, stem, options[], related_article_idx, similar_past_question_ids, rag_mode
   → 정답 포함하지 않음
   → Zod 검증, 실패 시 최대 2회 재시도

6. [저장]
   act_weekly_issues INSERT (status: 'published')
   실패 시: status: 'failed' 저장 (알림 없음, /admin에서 확인)
```

---

## RAG 분기 판단 로직 (`lib/rag/resolver.ts`)

```typescript
interface RagContext {
  mode: 'rag_enhanced' | 'fallback';
  chunks: Array<{ content: string; chapterTitle: string; section: string }>;
}

async function resolveRagMode(keywords: string[]): Promise<RagContext> {
  // 1. 데이터 존재 여부 확인
  const { count } = await supabase
    .from('act_rag_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('textbook_id.subject', 'risk_management');  // join 필요

  if (!count || count === 0) return { mode: 'fallback', chunks: [] };
  if (!process.env.OPENAI_API_KEY) return { mode: 'fallback', chunks: [] };

  // 2. 키워드 임베딩 생성
  const queryText = keywords.join(' ');
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: queryText,
  });

  // 3. pgvector 유사도 검색
  const { data: chunks } = await supabase.rpc('match_rag_chunks', {
    query_embedding: embedding.data[0].embedding,
    match_subject: 'risk_management',
    match_count: 5,
  });

  return { mode: 'rag_enhanced', chunks: chunks ?? [] };
}
```

> RAG 검색 실패 시 폴백 모드로 강등. 사용자 경험 영향 없음.

---

## PDF 파싱 프롬프트 구조

```typescript
const prompt = `
다음은 보험계리사 2차 계리리스크관리 시험지 OCR 텍스트입니다.
5지선다 문항을 모두 추출하여 아래 JSON 배열 형식으로 반환하세요.

출력 스키마:
[{
  "question_no": number,
  "question_text": string,
  "options": [{"label": "①"|"②"|"③"|"④"|"⑤", "text": string}],
  "answer": string,        // 정답 번호 또는 라벨
  "explanation": string,   // 해설 (없으면 null)
  "has_formula": boolean   // 수식 포함 여부
}]

시험지 텍스트:
${extractedText}
`;
```

Zod 검증 스키마:
```typescript
const QuestionSchema = z.object({
  question_no: z.number(),
  question_text: z.string().min(1),
  options: z.array(z.object({ label: z.string(), text: z.string() })).length(5),
  answer: z.string().nullable(),
  explanation: z.string().nullable(),
  has_formula: z.boolean(),
});
```

---

## 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # 서버 전용, RLS 우회
ANTHROPIC_API_KEY=                # Claude Sonnet (주간 배치, PDF 파싱)
OPENAI_API_KEY=                   # text-embedding-3-small (RAG용, 없으면 폴백)
CRON_SECRET=                      # Vercel Cron 인증
ADMIN_USER_ID=                    # 관리자 식별자 (임의 문자열)
```

---

## Vercel Cron 설정 (`vercel.json`)

```json
{
  "crons": [{
    "path": "/api/cron/weekly",
    "schedule": "0 23 * * 0"
  }]
}
```
> UTC 23:00 일요일 = KST 월요일 08:00

---

## 산출물

작업 완료 후 저장:
- `output/api-contracts.md` — 각 Route Handler 입출력 계약 (request/response 타입)
