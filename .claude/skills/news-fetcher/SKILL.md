# news-fetcher — 리스크 뉴스 수집·발췌 스킬

## 용도

`/api/cron/weekly` 배치에서 Claude의 `web_search` 툴로 리스크 관련 뉴스 기사를 수집하고 구조화한다.

---

## 수집 대상

- **범위**: 직전 7일간 국내 리스크 관련 기사 전부
- **발행기관**: `act_news_sources` 테이블의 `is_active=true` 목록 우선 수집
- **제외**: 리스크관리 시험 범위와 무관한 기사 (연예, 스포츠, 일반 사회 등)

참조 키워드: `.claude/skills/news-fetcher/references/risk-keywords.md`

---

## Claude 프롬프트 구조

### System
```
당신은 보험계리사 2차 계리리스크관리 시험 수험생을 위한 학습 자료 큐레이터입니다.
지난 7일간의 뉴스에서 계리리스크관리 시험 범위와 관련된 기사를 수집하고 구조화하는 역할을 맡습니다.
```

### User (템플릿)
```
다음 발행기관을 우선적으로 검색하되, 해당 기관에 관련 기사가 없으면 다른 신뢰할 수 있는 언론사도 포함하세요.

우선 발행기관: {act_news_sources의 is_active=true name 목록}

검색 기간: 오늘부터 7일 전까지
검색 키워드 조합: {risk-keywords.md의 키워드 중 관련성 높은 것}

수집 기준:
- 금융·보험·경제 리스크 관련 기사 전부 포함
- 시험 범위: 시장리스크, 신용리스크, 운영리스크, ALM, 지급여력(RBC/K-ICS), 보험부채, 재보험, 리스크 측정 방법론(VaR, CVaR, 스트레스 테스트 등)
- 무관 기사 제외 (스포츠, 연예, 정치 등)

각 기사를 다음 JSON 형식으로 반환하세요:
[{
  "title": "기사 제목",
  "source": "발행기관명",
  "url": "기사 URL",
  "summary": "핵심 내용 2~3문장 요약",
  "published_at": "YYYY-MM-DD",
  "keywords": ["키워드1", "키워드2", "키워드3"]  // 3~5개
}]
```

---

## 유사 기출 매핑 로직

기사 `keywords` 배열로 `act_past_questions` 텍스트 검색:

```typescript
for (const article of articles) {
  const conditions = article.keywords.map(kw =>
    `question_text.ilike.%${kw}%`
  ).join(',');

  const { data: similar } = await supabase
    .from('act_past_questions')
    .select('id, year, session, question_no, question_text')
    .or(conditions)
    .limit(2);

  article.similar_past_question_ids = similar?.map(q => q.id) ?? [];
}
```

> `tags` 컬럼이 비어 있어도 `question_text` LIKE 검색으로 동작한다.

---

## 수집 결과 검증

- 기사 0건: `act_weekly_issues.status = 'failed'` 저장 후 종료
- 기사 1건 이상: 정상 처리 계속
- `url` 중복 제거: 같은 URL의 기사는 하나만 유지
- `published_at` 검증: 수집 범위 7일 초과 기사 제외
