# question-generator — 가상 문제 생성 스킬

## 용도

주간 배치(`/api/cron/weekly`)에서 수집된 뉴스 기사와 기출문제 패턴을 바탕으로
보험계리사 2차 계리리스크관리 시험 형식의 5지선다 가상 문제 5개를 생성한다.

출력 형식 상세: `.claude/skills/question-generator/references/question-format.md`

---

## RAG 분기별 프롬프트

### 공통 System
```
당신은 보험계리사 2차 계리리스크관리 시험의 출제 전문가입니다.
실제 시험 스타일(5지선다, 객관식)에 맞는 예상 문제를 생성합니다.
생성된 문제는 정답을 포함하지 않습니다.
```

### 폴백 모드 (RAG 데이터 없음)

```
다음 이번 주 리스크 관련 기사들과 기출문제 패턴을 참고하여
5지선다 예상 문제 5개를 생성하세요.

[이번 주 기사 요약]
{articles[].title + summary + keywords 목록}

[기출문제 패턴 참고 (최근 3~5년 샘플)]
{act_past_questions 샘플 5~10문항의 question_text + options (answer 제외)}

생성 기준:
- 각 문제는 수집된 기사 내용과 연관되어야 함
- related_article_idx: 해당 문제가 어떤 기사(인덱스 0부터)와 관련되는지 명시
- 시험 스타일: 명확한 정답이 있는 개념 이해형 또는 계산형 문제
- 선택지 5개 모두 그럴듯하게 작성 (명백히 틀린 선택지 지양)
- 정답 없음: JSON에 answer 필드 포함하지 않음

출력 형식: question-format.md 참조
```

### RAG 강화 모드 (교재 데이터 있음)

```
다음 교재 핵심 개념, 이번 주 기사, 기출문제 패턴을 종합하여
5지선다 예상 문제 5개를 생성하세요.

[교재 관련 개념 (RAG 검색 결과 Top-5)]
{chunks[].chapterTitle}: {chunks[].content}

[이번 주 기사 요약]
{articles[].title + summary + keywords 목록}

[기출문제 패턴 참고]
{act_past_questions 샘플 question_text + options (answer 제외)}

생성 기준:
- 교재 개념을 기사 내용과 연결하는 문제 우선
- related_article_idx: 관련 기사 인덱스 명시
- rag_mode: 'rag_enhanced' 표시
- 정답 없음: JSON에 answer 필드 포함하지 않음

출력 형식: question-format.md 참조
```

---

## 출력 검증 (Zod)

```typescript
const VirtualQuestionSchema = z.object({
  no: z.number().int().min(1).max(5),
  stem: z.string().min(10),
  options: z.array(z.object({
    label: z.enum(['①', '②', '③', '④', '⑤']),
    text: z.string().min(1),
  })).length(5),
  related_article_idx: z.number().int().min(0),
  similar_past_question_ids: z.array(z.string().uuid()).max(2).default([]),
  rag_mode: z.enum(['rag_enhanced', 'fallback']).default('fallback'),
  has_formula: z.boolean().default(false),
});

const WeeklyQuestionsSchema = z.array(VirtualQuestionSchema).length(5);
```

---

## 문제 품질 기준

- **관련성**: 각 문제는 수집된 기사 중 하나 이상과 내용이 연결되어야 함
- **난이도**: 실제 시험(중~상급) 수준. 단순 암기보다 이해·적용형 우선
- **선택지 품질**: 오답 선택지도 실제 시험처럼 그럴듯하게 작성
- **수식**: 계산 문제는 `has_formula: true` 표시, LaTeX 수식 포함 가능
- **중복 금지**: 동일 주차 내 유사한 주제 문제 반복 금지

---

## 재시도 전략

Zod 검증 실패 시:
1. 1차 실패: 동일 프롬프트 재전송 (JSON 형식 오류 주석 추가)
2. 2차 실패: 폴백 모드로 강등 후 재시도
3. 3차 실패: `status: 'failed'` 저장, /admin에 표시
