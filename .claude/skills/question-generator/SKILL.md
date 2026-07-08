# question-generator — 가상 문제 생성 스킬

## 용도

주간 배치(`/api/cron/weekly`)에서 수집된 뉴스 기사와 기출문제 패턴을 바탕으로
보험계리사 2차 계리리스크관리 시험 형식의 **주관식 논술형/계산형** 가상 문제를 생성한다.
2차 시험은 주관식이므로 **선택지(options)가 없다**. 문제 수는 기사 수에 따라 3~5개(기사 ≤5→3, ≤7→4, 그 외 5)다.

출력 형식 상세: `.claude/skills/question-generator/references/question-format.md`

---

## KIRI 보고서 학습 노트 생성 워크플로우

전문기관 보고서(`act_kidi_reports`)에는 `study_notes` 필드가 있다.
임포트(`/api/admin/kidi-import`) 직후 이 필드는 NULL이며, 별도 단계에서 생성해야 한다.

### 생성 API

- **GET** `/api/admin/kidi-enrich` — `study_notes IS NULL`인 보고서 수 반환
- **POST** `/api/admin/kidi-enrich` — 미생성 보고서 최대 5개에 대해 학습 노트 생성

### 관리자 UI 흐름

1. 어드민 `/admin` → **KIRI 보고서** 탭 진입
2. **"다음 10개 처리"** 버튼 → PDF 임포트 및 요약 생성
3. **"현황 확인"** 버튼 → 학습 노트 미생성 보고서 수 조회
4. **"다음 5개 학습 노트 생성"** 버튼 → Claude Sonnet으로 `study_notes` 생성
5. 미생성 보고서가 0개가 될 때까지 4번 반복

### 학습 노트 출력 형식 (마크다운)

```markdown
## 1. 보고서 개요
(2~3줄 핵심 요약)

## 2. 주요 내용
### 가. [첫 번째 핵심 주제]
- 내용 bullet

## 3. 핵심 용어 정리
| 용어 | 정의 및 설명 |
|------|-------------|
| **용어** | 설명 |

## 4. 시험 출제 포인트
> 답안 작성 연습 권장
1. 포인트 1
2. 포인트 2

## 5. 관련 제도·규제 연계
- **IFRS17**: 연관점
- **K-ICS**: 연관점
```

### 모달 표시 조건

- `study_notes` 값 있음 → `StudyNotesRenderer`로 마크다운 렌더링
- `study_notes IS NULL` → "⏳ 학습 노트 생성 중입니다. 잠시 후 다시 확인해 주세요." 메시지 표시
  → 어드민에서 `/api/admin/kidi-enrich` 실행 필요

### 스크립트 대안

CLI에서 직접 실행할 경우:
```bash
npx tsx scripts/enrich-kidi-content.ts         # 미생성 보고서만
npx tsx scripts/enrich-kidi-content.ts --reprocess  # 전체 재생성
```

---

## RAG 분기별 프롬프트

### 공통 System
```
당신은 보험계리사 2차 계리리스크관리 시험의 출제 전문가입니다.
실제 시험 스타일(주관식 논술형/계산형, 선택지 없음)에 맞는 예상 문제를 생성합니다.
생성된 문제는 정답을 포함하지 않습니다.
```

### 폴백 모드 (RAG 데이터 없음)

```
다음 이번 주 리스크 관련 기사들과 기출문제 패턴을 참고하여
주관식 예상 문제 N개(기사 수에 따라 3~5개)를 생성하세요.

[이번 주 기사 요약]
{articles[].title + summary + keywords 목록}

[기출문제 패턴 참고 (최근 3~5년 샘플)]
{act_past_questions 샘플 5~10문항의 question_text (answer 제외)}

생성 기준:
- 각 문제는 수집된 기사 내용과 연관되어야 함
- related_article_idx: 해당 문제가 어떤 기사(인덱스 0부터)와 관련되는지 명시
- topic_tag: 문제마다 서로 다른 주제 태그 부여
- 시험 스타일: 주관식 논술형 또는 계산형 (선택지 없음), 실무·감독 관점의 심층 문제
- 정답 없음: JSON에 answer 필드 포함하지 않음

출력 형식: question-format.md 참조
```

### RAG 강화 모드 (교재 데이터 있음)

```
다음 교재 핵심 개념, 이번 주 기사, 기출문제 패턴을 종합하여
주관식 예상 문제 N개(기사 수에 따라 3~5개)를 생성하세요.

[교재 관련 개념 (RAG 검색 결과 Top-5)]
{chunks[].chapterTitle}: {chunks[].content}

[이번 주 기사 요약]
{articles[].title + summary + keywords 목록}

[기출문제 패턴 참고]
{act_past_questions 샘플 question_text (answer 제외)}

생성 기준:
- 교재 개념을 기사 내용과 연결하는 문제 우선
- related_article_idx: 관련 기사 인덱스 명시
- topic_tag: 문제마다 서로 다른 주제 태그 부여
- rag_mode: 'rag_enhanced' 표시
- 정답 없음: JSON에 answer 필드 포함하지 않음

출력 형식: question-format.md 참조
```

---

## 출력 검증 (Zod)

```typescript
// 주관식 — options 없음. 문제 수는 3~5개 가변.
const VirtualQuestionSchema = z.object({
  no: z.number().int().min(1),
  stem: z.string().min(10),                 // 논술/계산 문제 본문
  topic_tag: z.string(),                    // 주제 태그 (문제마다 상이)
  related_article_idx: z.number().int().min(0),
  similar_past_question_ids: z.array(z.string().uuid()).max(2).default([]),
  rag_mode: z.enum(['rag_enhanced', 'fallback']).default('fallback'),
  has_formula: z.boolean().default(false),
});

const WeeklyQuestionsSchema = z.array(VirtualQuestionSchema).min(3).max(5);
```

---

## 문제 품질 기준

- **관련성**: 각 문제는 수집된 기사 중 하나 이상과 내용이 연결되어야 함
- **난이도**: 실제 시험(중~상급) 수준. 단순 암기보다 이해·적용·논술형 우선
- **답안 요구**: 문제 본문에 구체적 조건·계산식 또는 논술 요구사항을 명시 (수험생이 답안을 직접 작성)
- **수식**: 계산 문제는 `has_formula: true` 표시, LaTeX 수식 포함 가능
- **중복 금지**: 동일 주차 내 유사한 주제 문제 반복 금지

---

## 재시도 전략

Zod 검증 실패 시:
1. 1차 실패: 동일 프롬프트 재전송 (JSON 형식 오류 주석 추가)
2. 2차 실패: 폴백 모드로 강등 후 재시도
3. 3차 실패: `status: 'failed'` 저장, /admin에 표시
