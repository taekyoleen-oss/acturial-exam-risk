# 가상 문제 JSON 출력 포맷

## 전체 구조

주간 배치 출력은 아래 형식의 JSON 배열 5개이다.

```json
[
  {
    "no": 1,
    "stem": "K-ICS 체계에서 금리리스크 측정 시 사용하는 방법으로 가장 적절한 것은?",
    "options": [
      { "label": "①", "text": "VaR 99.5% 신뢰수준 1년 측정" },
      { "label": "②", "text": "손익계산서 기준 금리 감응도 측정" },
      { "label": "③", "text": "현금흐름 할인법에 의한 부채 평가" },
      { "label": "④", "text": "자산부채 듀레이션 갭 기반 순자산가치 변동 측정" },
      { "label": "⑤", "text": "신용등급 전이행렬을 이용한 가중평균 측정" }
    ],
    "related_article_idx": 0,
    "similar_past_question_ids": ["uuid-1", "uuid-2"],
    "rag_mode": "rag_enhanced",
    "has_formula": false
  },
  ...
]
```

## 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `no` | integer (1~5) | 문제 번호 |
| `stem` | string | 문제 본문 (지문 + 질문) |
| `options` | array[5] | 선택지. label은 ①②③④⑤ |
| `related_article_idx` | integer | 관련 기사의 배열 인덱스 (0부터) |
| `similar_past_question_ids` | uuid[] | 유사 기출문제 ID (0~2개) |
| `rag_mode` | string | `'rag_enhanced'` 또는 `'fallback'` |
| `has_formula` | boolean | 수식(LaTeX) 포함 여부 |

## 제약사항

- `answer` 필드 **포함하지 않음** — 정답은 사용자에게 제공하지 않는다
- `explanation` 필드 **포함하지 않음**
- 선택지는 반드시 5개, label은 ①②③④⑤ 순서 고정
- `stem`에 지문이 길 경우 줄바꿈(`\n`) 사용 가능

## 수식 포함 문제 예시

```json
{
  "no": 3,
  "stem": "포트폴리오의 1일 VaR(99%)가 100억원이다. 보유기간을 10일로 환산한 VaR는?\n(단, 일별 수익률은 i.i.d. 정규분포를 따른다고 가정)",
  "options": [
    { "label": "①", "text": "$$100\\sqrt{10}$$억원" },
    { "label": "②", "text": "$$100 \\times 10$$억원" },
    { "label": "③", "text": "$$\\frac{100}{\\sqrt{10}}$$억원" },
    { "label": "④", "text": "$$100 \\times 10^2$$억원" },
    { "label": "⑤", "text": "$$100 \\times \\sqrt{\\frac{10}{252}}$$억원" }
  ],
  "related_article_idx": 2,
  "similar_past_question_ids": [],
  "rag_mode": "fallback",
  "has_formula": true
}
```

## act_weekly_issues.questions 저장 형식

위 배열이 그대로 `act_weekly_issues.questions` jsonb 컬럼에 저장된다.
