export interface QuestionOption {
  label: '①' | '②' | '③' | '④' | '⑤';
  text: string;
}

/** 기출문제 (주관식 논술형, 공개 표시용 — 정답·해설 제외) */
export interface PastQuestion {
  id: string;
  year: number;
  session: string;
  subject: string;
  question_no: number;
  question_text: string;
  tags: string[] | null;
  has_formula: boolean;
}

/** 가상 문제 (주관식, 주간 배치 생성, 정답 없음) */
export interface VirtualQuestion {
  no: number;
  stem: string;
  /** 주제 태그 (런타임 jsonb에 존재, 주간 배치 주제 중복 회피에 사용) */
  topic_tag?: string;
  related_article_idx: number;
  similar_past_question_ids: string[];
  rag_mode: 'rag_enhanced' | 'fallback';
  has_formula: boolean;
}
