import type { Article } from '@/types/weekly';

interface ArticlePreviewProps {
  article: Article;
  index: number;
}

export function ArticlePreview({ article, index }: ArticlePreviewProps) {
  return (
    <div className="border-l-4 border-[#2563EB] pl-4">
      <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
        <span className="font-medium text-[#2563EB]">기사 {index + 1}</span>
        <span>·</span>
        <span>{article.source}</span>
        <span>·</span>
        <span>{article.published_at}</span>
      </div>
      <h3 className="font-semibold text-[#0F172A] mb-1 leading-snug">
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#2563EB] transition-colors"
          >
            {article.title}
          </a>
        ) : (
          article.title
        )}
      </h3>
      <p className="text-sm text-[#64748B] leading-relaxed mb-2">{article.summary}</p>
      <div className="flex flex-wrap gap-1">
        {article.keywords.map((kw) => (
          <span
            key={kw}
            className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]"
          >
            #{kw}
          </span>
        ))}
      </div>
    </div>
  );
}
