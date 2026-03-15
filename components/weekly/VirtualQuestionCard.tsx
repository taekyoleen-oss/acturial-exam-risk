import type { VirtualQuestion } from '@/types/question';
import { RagSourceBadge } from '@/components/ui/RagSourceBadge';

interface VirtualQuestionCardProps {
  question: VirtualQuestion;
}

export function VirtualQuestionCard({ question }: VirtualQuestionCardProps) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white overflow-hidden">
      {/* 상단 번호 스트라이프 */}
      <div className="flex items-center gap-2 border-l-4 border-[#7C3AED] bg-[#7C3AED]/5 px-4 py-2">
        <span className="text-sm font-semibold text-[#7C3AED]">예상 문제 {question.no}</span>
        {question.rag_mode === 'rag_enhanced' && <RagSourceBadge />}
      </div>

      <div className="p-4">
        {/* 문제 본문 */}
        <p className="text-sm leading-relaxed text-[#0F172A] mb-4 whitespace-pre-wrap">
          {question.stem}
        </p>

        {/* 선택지 */}
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
      </div>
    </div>
  );
}
