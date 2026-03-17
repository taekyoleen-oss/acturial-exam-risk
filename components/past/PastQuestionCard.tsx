import type { PastQuestion } from '@/types/question';
import { SubjectBadge } from '@/components/ui/SubjectBadge';
import { PastAnswerSection } from '@/components/ui/PastAnswerSection';
import { MathText } from '@/components/ui/MathText';

interface PastQuestionCardProps {
  question: PastQuestion;
}

export function PastQuestionCard({ question }: PastQuestionCardProps) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-l-4 border-[#0891B2] bg-[#0891B2]/5 px-4 py-2 flex-wrap">
        <SubjectBadge
          year={question.year}
          session={question.session}
          questionNo={question.question_no}
        />
        {question.has_formula && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            수식 포함
          </span>
        )}
        {question.tags && question.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs text-[#1D4ED8]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="p-4">
        {question.has_formula ? (
          <MathText
            text={question.question_text}
            block
            className="text-sm leading-relaxed text-[#0F172A] whitespace-pre-wrap"
          />
        ) : (
          <p className="text-sm leading-relaxed text-[#0F172A] whitespace-pre-wrap">
            {question.question_text}
          </p>
        )}

        <div className="mt-4 rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
          <p className="text-xs text-[#94A3B8]">논술형 — 직접 답안을 작성해 보세요</p>
        </div>

        <PastAnswerSection question={question} />
      </div>
    </div>
  );
}
