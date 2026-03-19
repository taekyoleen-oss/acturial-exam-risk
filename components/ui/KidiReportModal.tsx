'use client';

import { useEffect, useState, useCallback } from 'react';

interface KidiReportFull {
  id: string;
  issue_no: number;
  published_month: string | null;
  title: string;
  topic_category: string | null;
  exam_relevance: string;
  summary: string | null;
  key_points: string[];
  tags: string[];
  study_notes: string | null;
}

const RELEVANCE_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: '시험 연관성 상', color: 'bg-red-50 text-red-700 border-red-200' },
  medium: { label: '시험 연관성 중', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  low:    { label: '시험 연관성 하', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

interface KidiReportModalProps {
  reportId: string | null;
  onClose: () => void;
}

/** 마크다운을 JSX로 렌더링 (## ### | - 1. > **) */
function StudyNotesRenderer({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // ## 섹션 헤더
        if (/^## /.test(trimmed)) {
          return (
            <h2 key={i} className="text-base font-bold text-[#0F172A] mt-6 mb-2 pb-1 border-b border-[#E2E8F0]">
              {trimmed.replace(/^## /, '')}
            </h2>
          );
        }
        // ### 서브헤더
        if (/^### /.test(trimmed)) {
          return (
            <h3 key={i} className="text-sm font-semibold text-[#1E40AF] mt-4 mb-1.5">
              {trimmed.replace(/^### /, '')}
            </h3>
          );
        }
        // 테이블 헤더 구분선
        if (/^\|[-\s|]+\|$/.test(trimmed)) return null;
        // 테이블 행
        if (/^\|.+\|$/.test(trimmed)) {
          const cells = trimmed.split('|').filter(c => c.trim());
          const isHeader = i > 0 && /^\|[-\s|]+\|$/.test(lines[i + 1]?.trim() ?? '');
          return (
            <div key={i} className={`flex gap-0 text-xs ${isHeader ? 'bg-[#F8FAFC] font-semibold' : 'border-t border-[#F1F5F9]'}`}>
              {cells.map((cell, j) => (
                <div key={j} className={`px-3 py-1.5 ${j === 0 ? 'w-36 shrink-0 font-medium text-[#334155]' : 'flex-1 text-[#475569]'}`}
                  dangerouslySetInnerHTML={{ __html: cell.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
                />
              ))}
            </div>
          );
        }
        // 인용문 (>)
        if (/^> /.test(trimmed)) {
          return (
            <div key={i} className="border-l-4 border-[#2563EB] bg-blue-50 px-3 py-2 my-2 rounded-r-md">
              <p className="text-xs text-[#1D4ED8] font-medium">{trimmed.replace(/^> /, '')}</p>
            </div>
          );
        }
        // 번호 목록 (1. 2. 3.)
        if (/^\d+\. /.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\. /)?.[1];
          const text = trimmed.replace(/^\d+\. /, '');
          return (
            <div key={i} className="flex gap-2 text-sm text-[#334155] py-0.5 ml-1">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-[11px] font-bold flex items-center justify-center mt-0.5">
                {num}
              </span>
              <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          );
        }
        // 불릿 목록 (- •)
        if (/^[-•] /.test(trimmed)) {
          const text = trimmed.replace(/^[-•] /, '');
          return (
            <div key={i} className="flex gap-2 text-sm text-[#334155] py-0.5 ml-2">
              <span className="shrink-0 text-[#0891B2] mt-1">▸</span>
              <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          );
        }
        // 빈 줄
        if (!trimmed) return <div key={i} className="h-1" />;
        // 일반 텍스트
        return (
          <p key={i} className="text-sm text-[#334155] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
          />
        );
      })}
    </div>
  );
}

export function KidiReportModal({ reportId, onClose }: KidiReportModalProps) {
  const [report, setReport] = useState<KidiReportFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'study' | 'summary'>('study');

  const fetchReport = useCallback(async (id: string) => {
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch(`/api/kidi-reports/detail?id=${encodeURIComponent(id)}`);
      const { data } = await res.json();
      setReport(data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (reportId) {
      setTab('study');
      fetchReport(reportId);
    }
  }, [reportId, fetchReport]);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!reportId) return null;

  const rel = report ? (RELEVANCE_CONFIG[report.exam_relevance] ?? RELEVANCE_CONFIG.medium) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div className="flex-1 min-w-0">
            {report && (
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-[#94A3B8]">
                  {report.published_month ?? `제${report.issue_no}호`}
                </span>
                {rel && (
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${rel.color}`}>
                    {rel.label}
                  </span>
                )}
                {report.topic_category && (
                  <span className="rounded-full bg-[#EFF6FF] border border-blue-100 px-2 py-0.5 text-[11px] text-[#1D4ED8]">
                    {report.topic_category}
                  </span>
                )}
              </div>
            )}
            {loading && <div className="h-5 w-48 rounded bg-[#E2E8F0] animate-pulse mb-1" />}
            {report && (
              <h2 className="text-base font-bold text-[#0F172A] leading-snug">{report.title}</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#E2E8F0] hover:text-[#0F172A] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        {report && (
          <div className="flex border-b border-[#E2E8F0] shrink-0 px-6">
            {([
              { key: 'study', label: '📚 시험 학습 노트' },
              { key: 'summary', label: '📋 보고서 요약' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`py-2.5 px-1 mr-4 text-xs font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="space-y-3 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`h-4 rounded bg-[#E2E8F0] ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
              ))}
            </div>
          )}

          {!loading && report && (
            <>
              {/* 시험 학습 노트 탭 */}
              {tab === 'study' && (
                <div>
                  {report.study_notes ? (
                    <StudyNotesRenderer content={report.study_notes} />
                  ) : (
                    <div className="text-center py-10 text-[#94A3B8]">
                      <p className="text-2xl mb-2">⏳</p>
                      <p className="text-sm">학습 노트 생성 중입니다. 잠시 후 다시 확인해 주세요.</p>
                      <p className="text-xs mt-1 text-[#CBD5E1]">요약 탭에서 기본 내용을 확인하실 수 있습니다.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 보고서 요약 탭 */}
              {tab === 'summary' && (
                <div className="space-y-5">
                  {report.summary && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">보고서 요약</h3>
                      <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">{report.summary}</p>
                    </div>
                  )}
                  {report.key_points.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">시험 출제 포인트</h3>
                      <ul className="space-y-2">
                        {report.key_points.map((point, i) => (
                          <li key={i} className="flex gap-2 text-sm text-[#334155]">
                            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.tags.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">태그</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {report.tags.map(tag => (
                          <span key={tag} className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs text-[#475569]">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
