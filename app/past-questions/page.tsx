import { Suspense } from 'react';
import {
  getPastQuestions,
  getAvailableYears,
  getAvailableSessionsByYear,
  getAvailableTags,
} from '@/lib/supabase/queries/past-questions';
import { PastQuestionCard } from '@/components/past/PastQuestionCard';
import { PastQuestionFilter } from '@/components/past/PastQuestionFilter';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { getAuthState } from '@/lib/auth';
import type { PastQuestion } from '@/types/question';

export const dynamic = 'force-dynamic';

const GUEST_LIMIT = 3; // 비승인 사용자에게 보여줄 문제 수

interface SearchParams {
  searchParams: Promise<{ year?: string; session?: string; tag?: string }>;
}

export default async function PastQuestionsPage({ searchParams }: SearchParams) {
  const { year, session, tag } = await searchParams;
  const auth = await getAuthState();

  const selectedYear = year ? parseInt(year, 10) : null;
  const selectedSession = session ?? null;
  const selectedTag = tag ?? null;

  const [years, tags, questions, sessions] = await Promise.all([
    getAvailableYears(),
    getAvailableTags(),
    getPastQuestions({
      year: selectedYear ?? undefined,
      session: selectedSession ?? undefined,
      tag: selectedTag ?? undefined,
    }),
    selectedYear ? getAvailableSessionsByYear(selectedYear) : Promise.resolve([]),
  ]);

  // 비승인 사용자는 최대 GUEST_LIMIT개만 표시
  const visibleQuestions = auth.isApproved ? questions : questions.slice(0, GUEST_LIMIT);
  const hiddenCount = questions.length - visibleQuestions.length;

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <SiteHeader auth={auth} currentPath="/past-questions" />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#0F172A] mb-1">기출문제 조회</h2>
          <p className="text-sm text-[#64748B]">
            보험계리사 2차 계리리스크관리론 기출 논술형 문제 — 연도·회차·주제별 필터링 가능
          </p>
          {!auth.isApproved && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ 비승인 상태에서는 최대 {GUEST_LIMIT}개 문제만 열람할 수 있습니다.
            </p>
          )}
        </div>

        {years.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center">
            <p className="text-[#64748B]">아직 등록된 기출문제가 없습니다.</p>
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

            <div className="mb-4 text-sm text-[#64748B]">
              {auth.isApproved
                ? `${questions.length}문항`
                : `${questions.length}문항 중 ${visibleQuestions.length}개 표시 (승인 회원: 전체 열람)`}
            </div>

            {visibleQuestions.length === 0 ? (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center">
                <p className="text-[#64748B]">해당 조건의 기출문제가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleQuestions.map((q) => (
                  <PastQuestionCard key={q.id} question={q as unknown as PastQuestion} isApproved={auth.isApproved} />
                ))}

                {/* 잠긴 문제 수 안내 */}
                {hiddenCount > 0 && (
                  <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center">
                    <div className="text-3xl mb-3">🔒</div>
                    <p className="font-medium text-[#0F172A] mb-1">
                      {hiddenCount}개 문항이 더 있습니다
                    </p>
                    <p className="text-sm text-[#64748B] mb-4">
                      전체 기출문제는 승인 회원만 이용할 수 있습니다.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <a
                        href="/signup"
                        className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        회원가입 신청
                      </a>
                      <a
                        href="/login"
                        className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                      >
                        로그인
                      </a>
                    </div>
                  </div>
                )}
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
