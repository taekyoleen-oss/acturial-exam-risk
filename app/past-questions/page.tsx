import { Suspense } from 'react';
import { getPastQuestionsByYear, getAvailableYears } from '@/lib/supabase/queries/past-questions';
import { PastQuestionCard } from '@/components/past/PastQuestionCard';
import { PastQuestionFilter } from '@/components/past/PastQuestionFilter';

export const revalidate = 3600;

interface SearchParams {
  searchParams: Promise<{ year?: string }>;
}

export default async function PastQuestionsPage({ searchParams }: SearchParams) {
  const { year } = await searchParams;
  const years = await getAvailableYears();

  const selectedYear = year ? parseInt(year, 10) : (years[0] ?? new Date().getFullYear());
  const questions = years.length > 0 ? await getPastQuestionsByYear(selectedYear) : [];

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-lg font-semibold text-[#0F172A] hover:text-[#2563EB]">
            계리리스크관리 학습 참고
          </a>
          <nav className="flex gap-4 text-sm">
            <a href="/weekly" className="text-[#64748B] hover:text-[#0F172A]">이번 주 예상 문제</a>
            <span className="font-medium text-[#2563EB]">기출문제 조회</span>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#0F172A] mb-1">기출문제 조회</h2>
          <p className="text-sm text-[#64748B]">
            계리리스크관리 2차 기출문제 — 문제와 선택지만 표시됩니다.
          </p>
        </div>

        {years.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center">
            <p className="text-[#64748B]">아직 등록된 기출문제가 없습니다.</p>
            <p className="text-sm text-[#94A3B8] mt-1">관리자가 PDF를 업로드하면 문제가 등록됩니다.</p>
          </div>
        ) : (
          <>
            {/* 연도 필터 */}
            <div className="mb-6">
              <Suspense fallback={null}>
                <PastQuestionFilter years={years} selectedYear={selectedYear} />
              </Suspense>
            </div>

            {/* 문제 목록 */}
            <div className="mb-4">
              <span className="text-sm text-[#64748B]">
                {selectedYear}년 기출문제 {questions.length}문항
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center">
                <p className="text-[#64748B]">{selectedYear}년 기출문제가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <PastQuestionCard key={q.id} question={q as unknown as import('@/types/question').PastQuestion} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-[#E2E8F0] bg-white mt-12">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-[#64748B]">
          정답·해설은 공식 시험 자료를 참고하시기 바랍니다.
        </div>
      </footer>
    </main>
  );
}
