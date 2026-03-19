import type { VirtualQuestion } from '@/types/question';
import type { Article } from '@/types/weekly';
import { ArticlePreview } from './ArticlePreview';
import { VirtualQuestionCard } from './VirtualQuestionCard';
import { SimilarPastQuestionPanel } from './SimilarPastQuestionPanel';
import type { PastQuestion } from '@/types/question';

interface WeeklyCardProps {
  article: Article;
  articleIndex: number;
  questions: VirtualQuestion[];
  similarPastQuestions: PastQuestion[];
  issueDate: string;
  isApproved?: boolean;
}

export function WeeklyCard({
  article,
  articleIndex,
  questions,
  similarPastQuestions,
  issueDate,
  isApproved = false,
}: WeeklyCardProps) {
  const relatedQuestions = questions.filter(
    (q) => q.related_article_idx === articleIndex
  );

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
      {/* 기사 섹션 */}
      <div className="p-5">
        <ArticlePreview article={article} index={articleIndex} />
      </div>

      {/* 예상 문제 섹션 */}
      {relatedQuestions.length > 0 && (
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4">
          <p className="text-xs font-semibold text-[#7C3AED] mb-3 uppercase tracking-wide">
            🤖 이 기사와 관련된 예상 문제
          </p>
          <div className="space-y-3">
            {relatedQuestions.map((q) => (
              <VirtualQuestionCard
                key={q.no}
                question={q}
                issueDate={issueDate}
                tags={article.keywords ?? []}
                isApproved={isApproved}
              />
            ))}
          </div>
        </div>
      )}

      {/* 관련 기출 패널 */}
      <SimilarPastQuestionPanel questions={similarPastQuestions} />
    </div>
  );
}
