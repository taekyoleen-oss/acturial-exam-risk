'use client';

import { useState, useEffect } from 'react';
import { MathText } from './MathText';

interface AnswerButtonProps {
  questionText: string;
  questionMeta?: string;
  questionKey: string; // e.g. "past:{uuid}" | "virtual:{issue_date}:{no}"
  restrictedYear?: boolean; // true → enforce year restriction if no access key
  truncateFirstParagraph?: boolean; // true → show only first paragraph if no access key
}

export function AnswerButton({
  questionText,
  questionMeta,
  questionKey,
  restrictedYear,
  truncateFirstParagraph,
}: AnswerButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error' | 'restricted'>('idle');
  const [answer, setAnswer] = useState<string>('');
  const [cached, setCached] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(!!localStorage.getItem('access_key'));
  }, []);

  const handleClick = async () => {
    if (state === 'done') {
      setOpen((v) => !v);
      return;
    }

    // Year restriction: block entirely if no key
    if (restrictedYear && !hasKey) {
      setState('restricted');
      setOpen(true);
      return;
    }

    setState('loading');
    setOpen(true);
    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText, questionMeta, questionKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '오류');
      setAnswer(data.answer);
      setCached(data.cached ?? false);
      setState('done');
    } catch (e) {
      setAnswer((e as Error).message);
      setState('error');
    }
  };

  // Compute display answer — truncate to 10 lines if no access key
  const lines = answer ? answer.split('\n') : [];
  const VISIBLE_LINES = 20;
  const displayAnswer =
    truncateFirstParagraph && !hasKey && lines.length > VISIBLE_LINES
      ? lines.slice(0, VISIBLE_LINES).join('\n')
      : answer;
  const isTruncated =
    truncateFirstParagraph && !hasKey && lines.length > VISIBLE_LINES;

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
          state === 'loading'
            ? 'border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed'
            : state === 'done' && open
            ? 'border-[#0891B2] bg-[#0891B2] text-white hover:bg-[#0E7490]'
            : 'border-[#0891B2] bg-white text-[#0891B2] hover:bg-[#0891B2] hover:text-white'
        }`}
      >
        {state === 'loading'
          ? '답안 생성 중...'
          : state === 'done' && open
          ? '답안 닫기'
          : '답안 확인'}
      </button>

      {/* Year-restricted access message */}
      {open && state === 'restricted' && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2">
          <span className="text-amber-600 mt-0.5 shrink-0">🔒</span>
          <p className="text-sm text-amber-800">
            허용되지 않은 사용자입니다. 상단에서 접근 키를 입력하시기 바랍니다.
          </p>
        </div>
      )}

      {open && state === 'loading' && (
        <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-[#64748B]">
            <svg className="h-4 w-4 animate-spin text-[#0891B2]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            전문적인 정보를 기반으로 답안을 작성중입니다.
          </div>
        </div>
      )}

      {open && (state === 'done' || state === 'error') && (
        <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          {/* 경고 문구 */}
          <div className="bg-red-50 border-b border-red-300 px-4 py-3 flex items-start gap-2">
            <svg className="h-4 w-4 text-red-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-bold text-red-700 mb-0.5">⚠ 주의 — 이 답안은 AI가 생성한 참고용 예시입니다.</p>
              <p className="text-xs text-red-600 leading-relaxed">
                공식 정답이 아니며 완벽하지 않습니다. 실제 시험 채점 기준과 다를 수 있으므로,
                반드시 공식 교재 및 기출해설을 병행하여 학습하시기 바랍니다.
              </p>
              {cached && (
                <p className="text-xs text-red-400 mt-0.5">저장된 답안을 불러왔습니다.</p>
              )}
            </div>
          </div>

          {/* 답안 본문 */}
          <div className="px-5 py-4">
            {state === 'error' ? (
              <p className="text-sm text-red-500">{answer}</p>
            ) : (
              <>
                <div className="prose prose-sm max-w-none text-[#0F172A]">
                  {displayAnswer.split('\n').map((line, i) => {
                    if (!line.trim()) return <div key={i} className="h-2" />;
                    if (/^#{1,3}\s/.test(line)) {
                      const text = line.replace(/^#{1,3}\s/, '');
                      return <h3 key={i} className="text-sm font-bold text-[#0F172A] mt-4 mb-1"><MathText text={text} /></h3>;
                    }
                    if (/^\d+\.\s/.test(line) && line.length < 60) {
                      return <h3 key={i} className="text-sm font-bold text-[#0F172A] mt-4 mb-1"><MathText text={line} /></h3>;
                    }
                    if (/^\*\*.*\*\*$/.test(line.trim())) {
                      const text = line.trim().replace(/\*\*/g, '');
                      return <p key={i} className="text-sm font-semibold text-[#1E40AF] mt-3 mb-0.5"><MathText text={text} /></p>;
                    }
                    if (/^[-•·]\s/.test(line)) {
                      return (
                        <div key={i} className="flex gap-1.5 text-sm leading-relaxed text-[#334155] ml-2">
                          <span className="shrink-0 mt-1">•</span>
                          <MathText text={line.replace(/^[-•·]\s/, '')} />
                        </div>
                      );
                    }
                    return <p key={i} className="text-sm leading-relaxed text-[#334155] mb-1"><MathText text={line} /></p>;
                  })}
                </div>

                {/* Truncation notice */}
                {isTruncated && (
                  <div className="mt-4 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 flex items-center gap-2">
                    <span className="text-[#94A3B8] shrink-0">🔒</span>
                    <p className="text-sm text-[#64748B]">
                      전체 답안은 접근 키를 입력하신 후 이용 가능합니다.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
