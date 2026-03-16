'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface PastQuestionFilterProps {
  years: number[];
  sessions: string[];
  tags: string[];
  selectedYear: number | null;
  selectedSession: string | null;
  selectedTag: string | null;
}

export function PastQuestionFilter({
  years, sessions, tags,
  selectedYear, selectedSession, selectedTag,
}: PastQuestionFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // 다른 필터 초기화
    if (key === 'year') params.delete('session');
    router.push(`/past-questions?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* 연도 필터 */}
      <div>
        <p className="text-xs font-medium text-[#64748B] mb-2">연도별</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('year', null)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              !selectedYear
                ? 'border-[#0891B2] bg-[#0891B2] text-white'
                : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#0891B2] hover:text-[#0891B2]'
            }`}
          >
            전체
          </button>
          {years.map((year) => (
            <button
              key={year}
              onClick={() => navigate('year', String(year))}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                year === selectedYear
                  ? 'border-[#0891B2] bg-[#0891B2] text-white'
                  : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#0891B2] hover:text-[#0891B2]'
              }`}
            >
              {year}년
            </button>
          ))}
        </div>
      </div>

      {/* 회차 필터 (연도 선택 시) */}
      {selectedYear && sessions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[#64748B] mb-2">회차별</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('session', null)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                !selectedSession
                  ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                  : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#7C3AED] hover:text-[#7C3AED]'
              }`}
            >
              전체
            </button>
            {sessions.map((s) => (
              <button
                key={s}
                onClick={() => navigate('session', s)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  s === selectedSession
                    ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#7C3AED] hover:text-[#7C3AED]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 주제 태그 필터 */}
      {tags.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[#64748B] mb-2">주제별</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('tag', null)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                !selectedTag
                  ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white'
                  : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
              }`}
            >
              전체
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => navigate('tag', tag)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  tag === selectedTag
                    ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
