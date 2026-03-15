'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface PastQuestionFilterProps {
  years: number[];
  selectedYear: number;
}

export function PastQuestionFilter({ years, selectedYear }: PastQuestionFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleYearChange = (year: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(year));
    router.push(`/past-questions?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {years.map((year) => (
        <button
          key={year}
          onClick={() => handleYearChange(year)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            year === selectedYear
              ? 'border-[#0891B2] bg-[#0891B2] text-white'
              : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#0891B2] hover:text-[#0891B2]'
          }`}
        >
          {year}년
        </button>
      ))}
    </div>
  );
}
