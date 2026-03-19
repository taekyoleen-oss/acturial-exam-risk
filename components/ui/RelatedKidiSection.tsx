'use client';

import { useEffect, useState } from 'react';
import { KidiReportModal } from './KidiReportModal';

interface KidiItem {
  id: string;
  issue_no: number;
  title: string;
  topic_category: string | null;
  exam_relevance: string;
  tags: string[];
}

const RELEVANCE_LABEL: Record<string, string> = {
  high: '상',
  medium: '중',
  low: '하',
};

const RELEVANCE_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

interface RelatedKidiSectionProps {
  tags: string[];
  isApproved: boolean;
  limit?: number;
  wrapperClassName?: string;
}

export function RelatedKidiSection({ tags, isApproved, limit = 3, wrapperClassName }: RelatedKidiSectionProps) {
  const [items, setItems] = useState<KidiItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalId, setModalId] = useState<string | null>(null);

  useEffect(() => {
    if (!isApproved || tags.length === 0) { setLoaded(true); return; }
    const params = new URLSearchParams({ tags: tags.join(','), limit: String(limit) });
    fetch(`/api/past-questions/related-kidi?${params}`)
      .then(r => r.json())
      .then(({ data }) => { setItems(data ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproved, limit]);

  if (!isApproved || !loaded || items.length === 0) return null;

  const card = (
    <>
      <div className="rounded-md border border-[#BAE6FD] bg-[#F0F9FF] px-4 py-3">
        <p className="text-xs font-semibold text-[#0369A1] mb-2">
          📚 연관 전문기관 보고서 <span className="font-normal text-[#7DD3FC]">— 클릭하면 상세 내용을 볼 수 있습니다</span>
        </p>
        <div className="space-y-2">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setModalId(item.id)}
              className="w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#E0F2FE] transition-colors group"
            >
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${RELEVANCE_COLOR[item.exam_relevance] ?? RELEVANCE_COLOR.medium}`}>
                연관 {RELEVANCE_LABEL[item.exam_relevance] ?? item.exam_relevance}
              </span>
              <p className="text-xs text-[#0F172A] leading-relaxed flex-1 group-hover:text-[#0369A1]">
                <span className="text-[#64748B] mr-1">제{item.issue_no}호</span>
                {item.title}
              </p>
              <span className="shrink-0 text-[#7DD3FC] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </button>
          ))}
        </div>
      </div>

      <KidiReportModal reportId={modalId} onClose={() => setModalId(null)} />
    </>
  );

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{card}</div>;
  }
  return <div className="mt-4">{card}</div>;
}
