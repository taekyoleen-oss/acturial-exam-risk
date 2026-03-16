import { Suspense } from 'react';
import {
  getPastQuestions,
  getAvailableYears,
  getAvailableSessionsByYear,
  getAvailableTags,
} from '@/lib/supabase/queries/past-questions';
import { PastQuestionCard } from '@/components/past/PastQuestionCard';
import { PastQuestionFilter } from '@/components/past/PastQuestionFilter';
import type { PastQuestion } from '@/types/question';

export const revalidate = 3600;

interface SearchParams {
  searchParams: Promise<{ year?: string; session?: string; tag?: string }>;
}

export default async function PastQuestionsPage({ searchParams }: SearchParams) {
  const { year, session, tag } = await searchParams;

  const selectedYear = year ? parseInt(year, 10) : null;
  const selectedSession = session ?? null;
  const selectedTag = tag ?? null;

  const [years, tags, questions, sessions] = await Promise.all([
    getAvailableYears(),
    getAvailableTags(),
    getPastQuestions({ year: selectedYear ?? undefined, session: selectedSession ?? undefined, tag: selectedTag ?? undefined }),
    selectedYear ? getAvailableSessionsByYear(selectedYear) : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-lg font-semibold text-[#0F172A] hover:text-[#2563EB]">
            계리리스크관리론 학습 참고
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
            보험계리사 2차 계리리스크관리론 기출 논술형 문제 — 연도·회차·주제별 필터링 가능
          </p>
        </div>

        {years.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center">
            <p className="text-[#64748B]">아직 등록된 기출문제가 없습니다.</p>
            <p className="text-sm text-[#94A3B8] mt-1">관리자가 PDF를 업로드하면 문제가 등록됩니다.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
              <Suspense fallback={null}>
                <PastQuestionFilter
                  years={years}
                  sessions={sessions}
                  tags={tags}
                  selectedYear={selectedYear}
                  selectedSession={selectedSession}
                  selectedTag={selectedTag}
                />
              </Suspense>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-[#64748B]">
                {selectedYear ? `${selectedYear}년` : '전체'}
                {selectedSession ? ` ${selectedSession}` : ''}
                {selectedTag ? ` · ${selectedTag}` : ''}
                {' '}{questions.length}문항
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center">
                <p className="text-[#64748B]">해당 조건의 기출문제가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <PastQuestionCard key={q.id} question={q as unknown as PastQuestion} />
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
