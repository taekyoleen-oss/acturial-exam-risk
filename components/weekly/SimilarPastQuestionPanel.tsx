'use client';

import { useState } from 'react';
import type { PastQuestion } from '@/types/question';
import { SubjectBadge } from '@/components/ui/SubjectBadge';

interface SimilarPastQuestionPanelProps {
  questions: PastQuestion[];
}

export function SimilarPastQuestionPanel({ questions }: SimilarPastQuestionPanelProps) {
  const [open, setOpen] = useState(false);

  if (!questions.length) return null;

  return (
    <div className="border-t border-[#E2E8F0]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span>📎</span>
          <span>관련 기출문제 {questions.length}개</span>
        </span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-[#E2E8F0] divide-y divide-[#F1F5F9]">
          {questions.map((q) => (
            <div key={q.id} className="px-4 py-4">
              <div className="mb-2">
                <SubjectBadge year={q.year} session={q.session} questionNo={q.question_no} />
              </div>
              <p className="text-sm leading-relaxed text-[#374151] mb-3 whitespace-pre-wrap">
                {q.question_text}
              </p>
              <ol className="space-y-1">
                {q.options.map((opt) => (
                  <li key={opt.label} className="flex items-start gap-2 text-sm text-[#64748B]">
                    <span className="shrink-0 font-medium">{opt.label}</span>
                    <span>{opt.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
