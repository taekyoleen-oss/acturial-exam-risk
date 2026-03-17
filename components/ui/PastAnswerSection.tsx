'use client';

import { AnswerButton } from './AnswerButton';
import type { PastQuestion } from '@/types/question';

interface Props {
  question: PastQuestion;
}

export function PastAnswerSection({ question }: Props) {
  const currentYear = new Date().getFullYear();
  const isOldYear = question.year <= currentYear - 2;

  return (
    <AnswerButton
      questionText={question.question_text}
      questionMeta={`${question.year}년 ${question.session} Q${question.question_no} (기출문제)`}
      questionKey={`past:${question.id}`}
      restrictedYear={isOldYear}
    />
  );
}
