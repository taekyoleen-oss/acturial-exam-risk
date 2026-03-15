import type { PastQuestion } from '@/types/question';
import { SubjectBadge } from '@/components/ui/SubjectBadge';

interface PastQuestionCardProps {
  question: PastQuestion;
}

export function PastQuestionCard({ question }: PastQuestionCardProps) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-l-4 border-[#0891B2] bg-[#0891B2]/5 px-4 py-2">
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
      </div>

      <div className="p-4">
        <p className="text-sm leading-relaxed text-[#0F172A] mb-4 whitespace-pre-wrap">
          {question.question_text}
        </p>

        <ol className="space-y-2">
          {question.options.map((opt) => (
            <li
              key={opt.label}
              className="flex items-start gap-2 rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#374151]"
            >
              <span className="shrink-0 font-medium text-[#64748B]">{opt.label}</span>
              <span className="leading-relaxed">{opt.text}</span>
            </li>
          ))}
        </ol>

        {question.tags && question.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
