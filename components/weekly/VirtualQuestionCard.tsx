import type { VirtualQuestion } from '@/types/question';
import { RagSourceBadge } from '@/components/ui/RagSourceBadge';
import { AnswerButton } from '@/components/ui/AnswerButton';

interface VirtualQuestionCardProps {
  question: VirtualQuestion;
  issueDate: string; // e.g. "2026-03-16"
}

export function VirtualQuestionCard({ question, issueDate }: VirtualQuestionCardProps) {
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

        {/* 주관식 답안 작성 안내 */}
        <div className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
          <p className="text-xs text-[#94A3B8]">답안을 직접 작성해 보세요 (학습 참고용)</p>
        </div>

        <AnswerButton
          questionText={question.stem}
          questionMeta={`예상 문제 ${question.no} (${issueDate} AI 생성)`}
          questionKey={`virtual:${issueDate}:${question.no}`}
        />
      </div>
    </div>
  );
}
