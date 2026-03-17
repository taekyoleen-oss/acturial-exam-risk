-- =========================================
-- 주간 예상 문제 시드 데이터
-- 2026년 3월 1주차 (3월 2일) + 3월 2주차 (3월 9일)
-- =========================================

-- =========================================
-- 2026년 3월 1주차 (issue_date: 2026-03-02)
-- =========================================
INSERT INTO act_weekly_issues (issue_date, week_label, articles, questions, generated_at, status)
VALUES (
  '2026-03-02',
  '2026년 3월 1주차',

  -- articles
  '[
    {
      "title": "금융위, IFRS17·K-ICS 맞춤형 자본규제 고도화 방안 발표",
      "source": "금융위원회",
      "url": "https://www.fsc.go.kr/no010101/84128",
      "summary": "금융위원회가 IFRS17·K-ICS 도입 2년을 맞아 新회계·자본제도에 맞춘 보험업권 자본규제 고도화 방안을 발표했다. 장수·해지·대재해 등 신규 위험을 반영한 요구자본이 크게 증가함에 따라 후순위채 발행비용 등 과도한 규제자본 부담을 완화하는 방향으로 제도를 정비한다. 보험회사의 자본의 질적 개선을 유도하면서 건전성 규제의 실효성을 높이는 것이 핵심이다.",
      "published_at": "2026-03-04",
      "keywords": ["K-ICS", "IFRS17", "요구자본", "지급여력", "보험자본규제"]
    },
    {
      "title": "이란 전쟁 위기에 코스피 사상 최대 폭락…금융시장 극도의 변동성",
      "source": "한국경제",
      "url": "https://www.hankyung.com",
      "summary": "이란-이스라엘 군사충돌 장기화 우려로 3월 첫째 주 코스피가 역대 최대 일중 하락폭을 기록하며 시장리스크가 급격히 확대됐다. 유가 급등과 환율 상승이 맞물리며 금융기관의 시장포지션 손실 우려가 커졌고, 스트레스 시나리오하 VaR 재산정 요구가 증가했다. 금융당국은 주요 금융기관 시장리스크 모니터링을 강화하고 비상계획 점검을 지시했다.",
      "published_at": "2026-03-05",
      "keywords": ["시장리스크", "VaR", "코스피", "스트레스테스트", "변동성"]
    },
    {
      "title": "개인 신용대출 4년 8개월 만에 최대 증가…빚투 리스크 재부상",
      "source": "매일경제",
      "url": "https://www.mk.co.kr",
      "summary": "2026년 3월 개인 신용대출이 1.4조원 급증하며 4년 8개월 만에 최대치를 기록했다. 증시 반등 기대에 따른 레버리지 투자(빚투) 수요가 재점화된 결과로, 금융기관의 신용리스크 노출이 증가했다. 당국은 대출 집중도 관리와 신용손실충당금 적립 강화를 금융권에 요구할 방침이다.",
      "published_at": "2026-03-03",
      "keywords": ["신용리스크", "신용대출", "PD", "LGD", "충당금"]
    },
    {
      "title": "미 NAIC, 보험사 AI 거버넌스 평가 시범사업 본격 확대",
      "source": "보험연구원",
      "url": "https://www.kiri.or.kr",
      "summary": "미국보험감독관협의회(NAIC)가 2026년 3~9월 보험사의 AI 시스템 평가 시범사업을 확대 시행한다. 이는 보험사 내부의 AI 알고리즘 편향, 데이터 품질, 모델 위험 등 운영리스크 관리체계가 실제로 작동하는지 점검하는 데 목적이 있다. 국내 금감원도 유사한 AI 리스크 평가 프레임워크 도입을 검토 중이다.",
      "published_at": "2026-03-04",
      "keywords": ["운영리스크", "AI리스크", "모델위험", "거버넌스", "내부통제"]
    },
    {
      "title": "저성장·고금리·고환율 삼중 압박…보험사 ALM 전략 재편 시급",
      "source": "서울경제",
      "url": "https://www.sedaily.com",
      "summary": "원/달러 환율 1,400원 유지, 기준금리 2.5% 동결, 경제성장률 1%대 전망으로 보험사가 ALM(자산부채관리) 전략 재편 압박에 직면했다. 고금리 환경에서 취득한 장기채권의 시가 하락과 부채듀레이션-자산듀레이션 미스매치가 지급여력비율을 압박하고 있다. 보험사들은 헤지 전략 강화와 자산 포트폴리오 재조정을 검토 중이다.",
      "published_at": "2026-03-02",
      "keywords": ["ALM", "금리리스크", "듀레이션갭", "지급여력", "헤지"]
    }
  ]'::jsonb,

  -- questions
  '[
    {
      "no": 1,
      "stem": "금융위원회가 발표한 K-ICS 자본규제 고도화 방안에 따르면, 新회계·자본제도(IFRS17·K-ICS) 하에서 보험회사의 요구자본(SCR) 산출에 새롭게 반영된 위험 유형으로 가장 적절하지 않은 것은?",
      "options": [
        { "label": "①", "text": "장수위험(Longevity Risk)" },
        { "label": "②", "text": "해지위험(Lapse Risk)" },
        { "label": "③", "text": "대재해위험(Catastrophe Risk)" },
        { "label": "④", "text": "규제위험(Regulatory Risk)" },
        { "label": "⑤", "text": "대형의료위험(Mass Accident Risk)" }
      ],
      "related_article_idx": 0,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    },
    {
      "no": 2,
      "stem": "코스피 급락과 같은 극단적 시장 상황에서 금융기관이 보유 포트폴리오의 시장리스크를 측정하는 방법으로, 정규분포 가정이 성립하지 않는 극단적 손실 구간을 보완하기 위해 VaR와 함께 사용하는 리스크 측정 지표로 가장 적절한 것은?",
      "options": [
        { "label": "①", "text": "기대손실(EL: Expected Loss)" },
        { "label": "②", "text": "조건부 VaR(CVaR / Expected Shortfall)" },
        { "label": "③", "text": "잔존만기 가중평균(WAMR)" },
        { "label": "④", "text": "샤프지수(Sharpe Ratio)" },
        { "label": "⑤", "text": "기술적 지급여력비율(RBC)" }
      ],
      "related_article_idx": 1,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    },
    {
      "no": 3,
      "stem": "개인 신용대출 급증 상황에서 금융기관이 신용리스크를 측정할 때 사용하는 Basel III 기준 내부등급법(IRB)의 주요 투입변수에 관한 설명으로 가장 적절하지 않은 것은?",
      "options": [
        { "label": "①", "text": "PD(부도확률): 차주가 1년 내에 부도가 발생할 확률" },
        { "label": "②", "text": "LGD(부도시손실률): 부도 발생 시 회수하지 못하는 익스포저의 비율" },
        { "label": "③", "text": "EAD(부도시익스포저): 부도 시점에 예상되는 총 익스포저 금액" },
        { "label": "④", "text": "M(만기): 자산의 잔존만기로, 짧을수록 요구자본이 증가한다" },
        { "label": "⑤", "text": "UL(예상외손실): 기대손실을 초과하는 손실로, 자본으로 흡수해야 한다" }
      ],
      "related_article_idx": 2,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    },
    {
      "no": 4,
      "stem": "보험사의 AI 시스템 도입 확대에 따라 운영리스크 관리의 중요성이 부각되고 있다. Basel II/III 및 보험 Solvency 체계에서 운영리스크(Operational Risk)에 대한 설명으로 가장 적절한 것은?",
      "options": [
        { "label": "①", "text": "운영리스크는 시장리스크와 신용리스크의 합산으로 정의된다" },
        { "label": "②", "text": "내부 프로세스, 사람, 시스템 또는 외부 사건으로 인해 발생하는 손실 리스크이다" },
        { "label": "③", "text": "운영리스크 요구자본은 오직 기본지표법(BIA)으로만 산출할 수 있다" },
        { "label": "④", "text": "AI 모델 오류는 전략리스크로 분류되어 운영리스크 범위에서 제외된다" },
        { "label": "⑤", "text": "K-ICS에서 운영리스크는 요구자본 산출에 포함되지 않는다" }
      ],
      "related_article_idx": 3,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    },
    {
      "no": 5,
      "stem": "저금리·고환율 환경에서 보험사가 자산부채관리(ALM)를 수행할 때, 듀레이션 갭(Duration Gap)을 최소화하려는 목적으로 가장 적절한 것은?",
      "options": [
        { "label": "①", "text": "자산과 부채의 만기를 일치시켜 유동성리스크를 제거하기 위함" },
        { "label": "②", "text": "금리 변동 시 자산과 부채의 현재가치 변동폭을 일치시켜 순자산가치를 보호하기 위함" },
        { "label": "③", "text": "주식 포트폴리오의 시장리스크를 헤지하기 위함" },
        { "label": "④", "text": "신용등급 하락으로 인한 손실을 방지하기 위함" },
        { "label": "⑤", "text": "언더라이팅 손실률을 목표 수준 이하로 유지하기 위함" }
      ],
      "related_article_idx": 4,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    }
  ]'::jsonb,

  now(),
  'published'
)
ON CONFLICT (issue_date) DO UPDATE
  SET week_label   = EXCLUDED.week_label,
      articles     = EXCLUDED.articles,
      questions    = EXCLUDED.questions,
      generated_at = EXCLUDED.generated_at,
      status       = EXCLUDED.status;


-- =========================================
-- 2026년 3월 2주차 (issue_date: 2026-03-09)
-- =========================================
INSERT INTO act_weekly_issues (issue_date, week_label, articles, questions, generated_at, status)
VALUES (
  '2026-03-09',
  '2026년 3월 2주차',

  -- articles
  '[
    {
      "title": "ECB, 생물 다양성 손실이 금융 안정 위협…자연 관련 리스크 경고",
      "source": "보험연구원",
      "url": "https://www.kjob.news/news/473777",
      "summary": "유럽중앙은행(ECB)이 2026년 3월 9일 보고서를 통해 생물 다양성 손실과 자연 자원 훼손이 기후변화와 더불어 경제·금융 안정성에 중대한 위험을 초래할 수 있다고 경고했다. 농업 생산성 감소는 은행 부실채권 증가로, 극단적 기상현상 증가는 보험산업의 대규모 손실로 이어질 수 있다. 이는 보험사의 물리적 기후리스크 익스포저 관리와 재보험 전략에 직접적 영향을 미친다.",
      "published_at": "2026-03-09",
      "keywords": ["기후리스크", "물리적위험", "자연재해", "재보험", "ESG리스크"]
    },
    {
      "title": "금감원 2026년 보험감독 방향: '신뢰 회복'과 '선제적 리스크관리' 키워드",
      "source": "금융감독원",
      "url": "https://www.fss.or.kr",
      "summary": "금융감독원이 보험회사 및 GA 관계자 220여 명이 참석한 업무설명회에서 2026년 보험 부문 감독 방향을 공개했다. 핵심 키워드는 '신뢰 회복'과 '선제적 리스크 관리'로, 보장금액 산정 가이드라인 확대, 손해율 가정 가이드라인 적용, 내부통제 강화가 주요 과제로 제시됐다. 예방적 검사체계와 리스크 기반 감독(RBS) 심화를 통해 보험회사의 재무건전성 관리를 강화한다.",
      "published_at": "2026-03-11",
      "keywords": ["보험감독", "내부통제", "리스크기반감독", "지급여력", "손해율"]
    },
    {
      "title": "기준금리 동결 속 K-ICS 비율 하락…보험사 자본 적정성 비상",
      "source": "서울경제",
      "url": "https://www.sedaily.com",
      "summary": "한국은행이 기준금리를 2.5%로 동결했으나, 금리 하락 기대와 장기채권 시가 변동으로 보험사의 K-ICS 비율이 일제히 하락하는 현상이 나타났다. 생명보험사의 경우 부채 듀레이션이 자산 듀레이션을 대폭 상회하는 구조적 금리리스크가 재부각됐다. 일부 중소형 보험사의 K-ICS 비율이 권고 기준선 150% 아래로 근접하면서 자본확충 압박이 커지고 있다.",
      "published_at": "2026-03-10",
      "keywords": ["K-ICS", "금리리스크", "듀레이션미스매치", "지급여력비율", "자본적정성"]
    },
    {
      "title": "보험산업 2026년 수익성 둔화 본격화…성장률 2.3%로 급락 전망",
      "source": "보험연구원",
      "url": "https://www.kiri.or.kr",
      "summary": "보험연구원이 2026년 보험산업 성장률이 전년 대비 2.3%로 급락할 것으로 전망했다. 금리 하락과 손해율 상승이라는 비우호적 환경이 지속되면서 보험사 수익성 저하가 본격화될 것으로 예상된다. 특히 K-ICS 체계에서 금리 하락 시 부채 현재가치가 크게 증가하는 구조로 인해, 자산-부채 간 듀레이션 매칭 전략의 중요성이 더욱 높아졌다.",
      "published_at": "2026-03-09",
      "keywords": ["보험수익성", "손해율", "ALM", "금리위험", "IFRS17"]
    },
    {
      "title": "기후변화 물리적 위험, 보험산업에 대규모 손실 초래 가능성 분석",
      "source": "보험연구원",
      "url": "https://eiec.kdi.re.kr/policy/domesticView.do?ac=0000196111",
      "summary": "보험연구원이 기후변화에 따른 물리적 위험(홍수, 태풍, 가뭄 등 극단적 기상현상)이 보험산업에 미치는 영향을 분석한 보고서를 발표했다. 자연재해 빈도 및 심도 증가로 인한 보험 손실이 연평균 10~15% 증가할 것으로 추정됐다. 보험사는 대재해 모델(Cat Model) 고도화, 재보험 프로그램 재설계, 기후리스크 스트레스 테스트를 강화해야 한다는 권고사항이 제시됐다.",
      "published_at": "2026-03-09",
      "keywords": ["물리적기후위험", "대재해위험", "Cat모델", "재보험", "스트레스테스트"]
    }
  ]'::jsonb,

  -- questions
  '[
    {
      "no": 1,
      "stem": "ECB 보고서와 같이 국제적으로 기후·자연 관련 리스크가 금융 안정에 위협이 된다는 논의가 확대되고 있다. 기후리스크를 물리적 위험(Physical Risk)과 전환 위험(Transition Risk)으로 구분할 때, 물리적 위험에 해당하는 것으로만 묶인 것은?",
      "options": [
        { "label": "①", "text": "탄소세 도입, 저탄소 기술 투자 손실" },
        { "label": "②", "text": "홍수·태풍 피해, 해수면 상승으로 인한 자산 손실" },
        { "label": "③", "text": "화석연료 관련 자산의 좌초자산화, 규제 강화에 따른 비용 증가" },
        { "label": "④", "text": "ESG 공시 의무화, 그린워싱 소송 리스크" },
        { "label": "⑤", "text": "탄소배출권 가격 변동, RE100 이행 비용" }
      ],
      "related_article_idx": 0,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    },
    {
      "no": 2,
      "stem": "금융감독원이 2026년 보험감독 방향으로 강조한 리스크 기반 감독(RBS: Risk-Based Supervision)에 관한 설명으로 가장 적절하지 않은 것은?",
      "options": [
        { "label": "①", "text": "보험회사가 직면한 리스크의 종류와 수준에 따라 감독 자원을 차등 배분한다" },
        { "label": "②", "text": "재무건전성뿐만 아니라 보험사의 리스크 관리 역량과 거버넌스 체계도 평가한다" },
        { "label": "③", "text": "RBS에서는 모든 보험사에 동일한 검사 주기와 강도를 적용하여 형평성을 확보한다" },
        { "label": "④", "text": "전통적 규정 준수 감독(Compliance-based Supervision)에서 발전한 예방적 감독 모델이다" },
        { "label": "⑤", "text": "IAIS(국제보험감독자협의회)의 ICP(보험핵심원칙)에서 RBS 도입을 권고하고 있다" }
      ],
      "related_article_idx": 1,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    },
    {
      "no": 3,
      "stem": "K-ICS(킥스) 체계에서 금리리스크 요구자본은 금리 상승 및 하락 시나리오 중 더 불리한 값을 적용한다. 다음 중 K-ICS 금리리스크 측정 방법에 관한 설명으로 가장 적절한 것은?",
      "options": [
        { "label": "①", "text": "금리리스크 요구자본은 자산의 시가 변동만을 기준으로 산출한다" },
        { "label": "②", "text": "금리 변동 시나리오를 적용하여 보험부채의 현재가치와 자산의 현재가치를 각각 재계산한 후 순자산가치 변동분을 요구자본으로 산출한다" },
        { "label": "③", "text": "금리리스크 요구자본 산출에는 모든 자산과 부채의 회계장부가액이 사용된다" },
        { "label": "④", "text": "K-ICS에서 금리리스크 요구자본은 신용리스크 요구자본과 합산하지 않는다" },
        { "label": "⑤", "text": "금리 스트레스 충격 수준은 단기·중기·장기 구간 관계없이 동일한 절대적 bp를 적용한다" }
      ],
      "related_article_idx": 2,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    },
    {
      "no": 4,
      "stem": "IFRS17 하에서 금리 하락 시 보험사의 재무구조에 미치는 영향으로 가장 적절한 것은?",
      "options": [
        { "label": "①", "text": "보험계약부채의 현재가치가 감소하여 보험사의 순자산가치가 증가한다" },
        { "label": "②", "text": "할인율 하락으로 보험계약부채의 현재가치가 증가하여, 자산 듀레이션이 부채 듀레이션보다 짧은 보험사는 순자산가치가 감소한다" },
        { "label": "③", "text": "금리 하락은 채권 자산 시가를 하락시키므로 항상 보험사에 불리하게 작용한다" },
        { "label": "④", "text": "IFRS17에서는 금리 변동이 보험계약부채에 영향을 미치지 않는다" },
        { "label": "⑤", "text": "금리 하락 시 CSM(계약서비스마진)이 즉각 손익에 반영되어 당기순이익이 증가한다" }
      ],
      "related_article_idx": 3,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    },
    {
      "no": 5,
      "stem": "보험사가 기후변화 물리적 위험에 대비하기 위해 활용하는 대재해 모델(Catastrophe Model)의 구성 요소에 관한 설명으로 가장 적절하지 않은 것은?",
      "options": [
        { "label": "①", "text": "위험원 모듈(Hazard Module): 태풍, 지진, 홍수 등 자연재해의 빈도와 강도를 시뮬레이션한다" },
        { "label": "②", "text": "취약성 모듈(Vulnerability Module): 재해 강도에 따른 건물·자산의 피해율을 추정한다" },
        { "label": "③", "text": "익스포저 모듈(Exposure Module): 보험 포트폴리오의 지리적 분포와 담보 목적물 정보를 입력한다" },
        { "label": "④", "text": "재무 모듈(Financial Module): 보험 계약 조건(공제액, 한도 등)을 적용하여 최종 보험손실을 산출한다" },
        { "label": "⑤", "text": "대재해 모델의 PML(추정최대손실) 산출은 신뢰수준 99.5%, 보유기간 1년을 기준으로 규정에 의해 고정되어 있다" }
      ],
      "related_article_idx": 4,
      "similar_past_question_ids": [],
      "rag_mode": "fallback",
      "has_formula": false
    }
  ]'::jsonb,

  now(),
  'published'
)
ON CONFLICT (issue_date) DO UPDATE
  SET week_label   = EXCLUDED.week_label,
      articles     = EXCLUDED.articles,
      questions    = EXCLUDED.questions,
      generated_at = EXCLUDED.generated_at,
      status       = EXCLUDED.status;
