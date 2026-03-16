import { getCurrentWeeklyIssue, getWeeklyArchiveList } from '@/lib/supabase/queries/weekly';
import { getPastQuestionsByIds } from '@/lib/supabase/queries/past-questions';
import { WeeklyCard } from '@/components/weekly/WeeklyCard';
import { WeeklyArchiveNav } from '@/components/weekly/WeeklyArchiveNav';
import type { VirtualQuestion } from '@/types/question';
import type { Article } from '@/types/weekly';

export const revalidate = 3600; // 1시간 캐시

export default async function WeeklyPage() {
  const [issue, archives] = await Promise.all([
    getCurrentWeeklyIssue(),
    getWeeklyArchiveList(),
  ]);

  if (!issue) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <PageHeader />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <p className="text-[#64748B]">아직 주간 예상 문제가 준비되지 않았습니다.</p>
          <p className="text-sm text-[#94A3B8] mt-1">매주 월요일 오전 8시에 업데이트됩니다.</p>
        </div>
      </main>
    );
  }

  const articles = (issue.articles ?? []) as unknown as Article[];
  const questions = (issue.questions ?? []) as unknown as VirtualQuestion[];

  // 모든 가상 문제의 유사 기출 ID 수집
  const allPastIds = [...new Set(questions.flatMap((q) => q.similar_past_question_ids ?? []))];
  const pastQuestions = await getPastQuestionsByIds(allPastIds);
  const pastMap = Object.fromEntries(pastQuestions.map((q) => [q.id, q]));

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <PageHeader />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 주차 헤더 */}
        <div className="mb-6">
          <span className="inline-block rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-medium text-[#7C3AED] mb-2">
            {issue.week_label}
          </span>
          <h2 className="text-xl font-bold text-[#0F172A]">이번 주 예상 문제</h2>
          <p className="text-sm text-[#64748B] mt-1">
            기사 {articles.length}건 · 예상 문제 {questions.length}개
          </p>
        </div>

        {/* 면책 고지 */}
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          AI가 생성한 예상 문제는 공식 시험과 다를 수 있으며, 학습 참고 용도로만 사용하시기 바랍니다.
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* 메인 콘텐츠 */}
          <div className="flex-1 space-y-6">
            {articles.map((article, idx) => {
              const relatedPastIds = questions
                .filter((q) => q.related_article_idx === idx)
                .flatMap((q) => q.similar_past_question_ids ?? []);
              const similarPast = [...new Set(relatedPastIds)]
                .map((id) => pastMap[id])
                .filter(Boolean);

              return (
                <WeeklyCard
                  key={idx}
                  article={article}
                  articleIndex={idx}
                  questions={questions}
                  similarPastQuestions={similarPast}
                  issueDate={issue.issue_date}
                />
              );
            })}
          </div>

          {/* 아카이브 사이드바 */}
          <div className="w-full lg:w-56 shrink-0">
            <WeeklyArchiveNav archives={archives} currentIssueDate={issue.issue_date} />
          </div>
        </div>
      </div>
    </main>
  );
}

function PageHeader() {
  return (
    <header className="border-b border-[#E2E8F0] bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <div>
          <a href="/" className="text-lg font-semibold text-[#0F172A] hover:text-[#2563EB]">
            계리리스크관리 학습 참고
          </a>
        </div>
        <nav className="flex gap-4 text-sm">
          <span className="font-medium text-[#2563EB]">이번 주 예상 문제</span>
          <a href="/past-questions" className="text-[#64748B] hover:text-[#0F172A]">기출문제 조회</a>
        </nav>
      </div>
    </header>
  );
}
