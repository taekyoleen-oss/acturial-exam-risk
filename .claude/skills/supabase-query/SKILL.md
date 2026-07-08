# supabase-query — Supabase 쿼리 패턴 스킬

## 용도

이 앱에서 자주 사용하는 Supabase 쿼리 패턴과 주의사항을 정리한다.

---

## 클라이언트 초기화

```typescript
// lib/supabase/server.ts — 서버 컴포넌트·Route Handler용
import { createClient } from '@supabase/supabase-js';

// 공개 읽기 (RLS 적용)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 관리자 작업 (RLS 우회, 서버 전용)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

```typescript
// 클라이언트 컴포넌트(로그인/회원가입/설정 폼)는 인라인으로 브라우저 클라이언트를 생성한다.
// (lib/supabase/client.ts 모듈은 현재 어디서도 import되지 않는 dead code이므로 참조하지 말 것.)
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
// 세션 갱신은 proxy.ts(미들웨어)가 매 요청 처리.
```

---

## 핵심 쿼리 패턴

### 기출문제 조회 (공개 — 정답 제외 필수)

```typescript
// lib/supabase/queries/past-questions.ts

export async function getPastQuestionsByYear(year: number) {
  const { data, error } = await supabase
    .from('act_past_questions')
    .select(`
      id, year, session, subject,
      question_no, question_text, options,
      tags, has_formula
    `)
    // ※ answer, explanation 절대 포함 금지
    .eq('year', year)
    .order('question_no');

  if (error) throw error;
  return data;
}

export async function getAvailableYears() {
  const { data, error } = await supabase
    .from('act_past_questions')
    .select('year')
    .order('year', { ascending: false });

  if (error) throw error;
  return [...new Set(data?.map(r => r.year))];
}
```

### 주간 이슈 조회

```typescript
// lib/supabase/queries/weekly.ts

export async function getCurrentWeeklyIssue() {
  const { data, error } = await supabase
    .from('act_weekly_issues')
    .select('*')
    .eq('status', 'published')
    .order('issue_date', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function getWeeklyIssueByYearWeek(year: number, week: number) {
  // week_label 기반 조회 또는 issue_date 범위 계산
  const startOfWeek = getMonday(year, week); // lib/utils/week.ts
  const { data, error } = await supabase
    .from('act_weekly_issues')
    .select('*')
    .eq('issue_date', startOfWeek)
    .eq('status', 'published')
    .single();

  if (error) throw error;
  return data;
}

export async function getWeeklyArchiveList() {
  const { data, error } = await supabase
    .from('act_weekly_issues')
    .select('id, issue_date, week_label, status')
    .eq('status', 'published')
    .order('issue_date', { ascending: false });

  if (error) throw error;
  return data;
}
```

### 유사 기출 ID → 실제 데이터 조회

```typescript
export async function getPastQuestionsByIds(ids: string[]) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('act_past_questions')
    .select(`
      id, year, session, question_no,
      question_text, options, has_formula
    `)
    // ※ answer, explanation 절대 포함 금지
    .in('id', ids);

  if (error) throw error;
  return data;
}
```

### RAG 임베딩 pgvector 검색

```typescript
// lib/supabase/queries/rag.ts

export async function searchRagChunks(
  queryEmbedding: number[],
  subject: string = 'risk_management',
  matchCount: number = 5
) {
  const { data, error } = await supabaseAdmin.rpc('match_rag_chunks', {
    query_embedding: queryEmbedding,
    match_subject: subject,
    match_count: matchCount,
  });

  if (error) throw error;
  return data ?? [];
}

export async function hasRagData(subject: string = 'risk_management') {
  const { count, error } = await supabase
    .from('act_rag_embeddings')
    .select('act_rag_textbooks!inner(subject)', { count: 'exact', head: true })
    .eq('act_rag_textbooks.subject', subject);

  return !error && (count ?? 0) > 0;
}
```

---

## 관리자 쿼리 (supabaseAdmin 사용)

```typescript
// 기출 PDF 파싱 결과 INSERT
export async function insertParsedQuestions(
  questions: ParsedQuestion[],
  year: number
) {
  const rows = questions.map(q => ({
    ...q,
    year,
    session: '2차',
    subject: '리스크관리',
  }));

  const { error } = await supabaseAdmin
    .from('act_past_questions')
    .insert(rows);

  if (error) throw error;
}

// 주간 이슈 저장
export async function upsertWeeklyIssue(issue: WeeklyIssueInsert) {
  const { error } = await supabaseAdmin
    .from('act_weekly_issues')
    .upsert(issue, { onConflict: 'issue_date' });

  if (error) throw error;
}
```

---

## 주의사항

1. **정답 노출 금지**: `select()`에 `answer`, `explanation` 절대 포함하지 말 것 (공개 쿼리)
2. **anon key 범위**: 공개 읽기만 허용. 쓰기는 반드시 `supabaseAdmin` (service_role key)
3. **페이지네이션**: 기출문제 목록은 `.range(from, to)` 또는 `.limit()` 적용
4. **에러 처리**: 모든 쿼리에서 `error` 확인 후 throw — 클라이언트에 raw 에러 노출 금지
5. **서버 전용**: `supabaseAdmin`은 Route Handler, Server Action, Server Component에서만 사용
