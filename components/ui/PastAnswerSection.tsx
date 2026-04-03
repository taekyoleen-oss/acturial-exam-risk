'use client';

import { AnswerButton } from './AnswerButton';
import type { PastQuestion } from '@/types/question';

interface Props {
  question: PastQuestion;
  isApproved?: boolean;
}

export function PastAnswerSection({ question, isApproved = false }: Props) {
  return (
    <AnswerButton
      questionText={question.question_text}
      questionMeta={`${question.year}년 ${question.session} Q${question.question_no} (기출문제)`}
      questionKey={`past:${question.id}`}
      tags={question.tags ?? []}
      isApproved={isApproved}
    />
  );
}
