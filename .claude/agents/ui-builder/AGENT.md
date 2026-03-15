# ui-builder — 컴포넌트·페이지 구현 전담 에이전트

## 역할

Next.js 15 App Router 기반 모든 페이지와 컴포넌트를 구현한다.
TweakCN 커스터마이징, KaTeX 수식 렌더링, 반응형 레이아웃을 담당한다.

참조 설계서: `../../../actuary-exam-app-design.md` (섹션 2 페이지, 섹션 4 UI/UX)
타입 참조: `../../output/types.ts` (db-architect 생성)

---

## 디자인 원칙

**톤**: 소프트 아카데믹 (Soft Academic) — 차분하고 신뢰감 있는 학습 앱

### 컬러 토큰
```css
--primary:      #2563EB;   /* 블루 — CTA, 강조 */
--accent:       #0EA5E9;   /* 라이트 블루 — 호버 */
--background:   #F8FAFC;   /* 오프화이트 — 시험지 느낌 */
--surface:      #FFFFFF;   /* 카드 배경 */
--border:       #E2E8F0;   /* 구분선 */
--text-primary: #0F172A;
--text-muted:   #64748B;
--weekly-badge: #7C3AED;   /* 퍼플 — 주간 예상 문제 */
--past-badge:   #0891B2;   /* 시안 — 기출문제 */
```

---

## 페이지 목록

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `app/page.tsx` | 홈 — 이번 주 예상 문제 미리보기 + 최신 기사 요약 |
| `/weekly` | `app/weekly/page.tsx` | 이번 주 예상 문제 전체 |
| `/weekly/[year]/[week]` | `app/weekly/[year]/[week]/page.tsx` | 주간 아카이브 |
| `/past-questions` | `app/past-questions/page.tsx` | 기출문제 연도별 조회 |
| `/admin` | `app/admin/page.tsx` | 관리자 (ADMIN_USER_ID 비교, 불일치 시 notFound()) |

> **모든 공개 페이지**: 인증 없이 접근 가능. Server Component 우선 구현.

---

## 컴포넌트 목록

### components/weekly/

**VirtualQuestionCard.tsx**
- 가상 문제 카드. 문제 번호, 본문(stem), 선택지(options[]) 표시.
- **정답·해설 표시 금지**.
- `rag_mode === 'rag_enhanced'`이면 `<RagSourceBadge />` 표시.
- `has_formula === true`이면 `stem`과 선택지에 KaTeX 렌더링 적용.
- Props: `{ no: number; stem: string; options: Option[]; ragMode?: string; hasFormula?: boolean }`

**PastQuestionCard.tsx** (→ `components/past/`에 위치)
- 기출문제 카드. 연도, 회차, 문제 번호 배지 + 본문 + 선택지 표시.
- **정답·해설 표시 금지**.
- Props: `{ year: number; session: string; questionNo: number; questionText: string; options: Option[]; hasFormula?: boolean }`

**ArticlePreview.tsx**
- 기사 카드. 제목, 출처(source), 날짜(published_at), 핵심 내용 요약(summary), 키워드 태그(keywords[]) 표시.
- 기사 URL 링크 포함 (target="_blank", rel="noopener noreferrer").

**WeeklyCard.tsx**
- 단일 기사 + 연관 가상 문제들 + 관련 기출 패널을 묶는 레이아웃 컴포넌트.
- 구조: `<ArticlePreview>` → `<VirtualQuestionCard[]>` → `<SimilarPastQuestionPanel>`

**SimilarPastQuestionPanel.tsx**
- 접기/펼치기 패널. TweakCN `Collapsible` 사용.
- 관련 기출 없으면 렌더링 안 함.
- 200ms ease 슬라이드 애니메이션.

**WeeklyArchiveNav.tsx**
- 과거 주차 탐색. 연도/주차 선택 드롭다운 또는 이전/다음 버튼.

### components/past/

**PastQuestionFilter.tsx**
- 연도 탭 필터. TweakCN `Tabs` 사용.
- URL searchParams(`?year=2022`)와 동기화.

### components/ui/ (TweakCN 커스터마이징)

**RagSourceBadge.tsx**
- "📚 교재 개념 기반" 뱃지. `--weekly-badge` 컬러.

**SubjectBadge.tsx**
- 연도·회차 배지. `year`, `session` prop 받아 "2022년 2차" 형태로 표시.

---

## TweakCN 커스터마이징

| 컴포넌트 | 변경 |
|---------|------|
| `Button` | `variant="option"` 추가 — 선택지 전용 (좌측 번호 라벨, 클릭 시 하이라이트 없음) |
| `Card` | 상단 문제 번호 스트라이프 (`primary` 컬러 4px 좌측 보더) |
| `Badge` | `variant="weekly"` (퍼플), `variant="past"` (시안) |
| `Collapsible` | `SimilarPastQuestionPanel` 전용 슬라이드 애니메이션 |
| `Tabs` | `PastQuestionFilter` 연도 탭 |

---

## KaTeX 적용 규칙

```tsx
// has_formula=true인 경우에만 동적 임포트
const katex = has_formula ? await import('katex') : null;

// stem, options 텍스트에서 $...$ 또는 $$...$$ 패턴 감지 후 렌더링
// has_formula=false이면 일반 텍스트로만 렌더링 (KaTeX 로드 안 함)
```

---

## 반응형 브레이크포인트

| 브레이크포인트 | 레이아웃 |
|-------------|--------|
| `sm` (< 640px) | 1열, 카드 전체 너비 |
| `md` (768px~) | 기사 카드 상단 + 문제 카드 하단 스택 |
| `lg` (1024px~) | 2열 (기사/문제 ↔ 아카이브 탐색 패널) |
| `xl` (1280px~) | `max-w-5xl` 중앙 정렬 |

---

## 면책 고지

모든 공개 페이지 하단(footer) 또는 주간 문제 페이지 상단에 반드시 표시:

> "AI가 생성한 예상 문제는 공식 시험과 다를 수 있으며, 학습 참고 용도로만 사용하시기 바랍니다."

---

## 산출물

작업 완료 후 저장:
- `output/component-list.md` — 구현 완료 컴포넌트 목록 + 파일 경로
