'use client';

import { useState, useMemo } from 'react';
import { KidiReportModal } from '@/components/ui/KidiReportModal';

interface KidiReport {
  id: string;
  issue_no: number;
  file_no: number | null;
  title: string;
  summary: string | null;
  key_points: string[];
  tags: string[];
  topic_category: string | null;
  exam_relevance: string | null;
  published_month: string | null;
  processed_at: string | null;
}

interface Props {
  initialReports: KidiReport[];
  issueNos: number[];
  issueMonths: Record<number, string>;
  categories: string[];
  isApproved: boolean;
}

const RELEVANCE_CONFIG = {
  high:   { label: '상', color: 'bg-red-50 text-red-700 border-red-200',    dot: 'bg-red-500' },
  medium: { label: '중', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  low:    { label: '하', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
};

const CATEGORY_COLORS: Record<string, string> = {
  '연금/퇴직연금':       'bg-blue-50 text-blue-700 border-blue-100',
  '기후/재해위험':       'bg-green-50 text-green-700 border-green-100',
  '사이버보험/정보보호':  'bg-purple-50 text-purple-700 border-purple-100',
  'AI/디지털기술':       'bg-violet-50 text-violet-700 border-violet-100',
  '자동차보험':          'bg-orange-50 text-orange-700 border-orange-100',
  '지급여력/자본관리':   'bg-red-50 text-red-700 border-red-100',
  '의료/건강보험':       'bg-pink-50 text-pink-700 border-pink-100',
  '생명보험/재보험':     'bg-cyan-50 text-cyan-700 border-cyan-100',
  '투자/자산운용':       'bg-amber-50 text-amber-700 border-amber-100',
  '규제/제도':           'bg-slate-100 text-slate-700 border-slate-200',
  '장기요양/고령화':     'bg-teal-50 text-teal-700 border-teal-100',
  '기타':                'bg-gray-100 text-gray-600 border-gray-200',
};

function getCategoryColor(cat: string | null) {
  return cat ? (CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600 border-gray-200') : 'bg-gray-100 text-gray-600 border-gray-200';
}

export function KidiClient({ initialReports, issueNos, issueMonths, categories, isApproved }: Props) {
  // 기본값: 가장 최신 권호
  const [selectedIssue, setSelectedIssue] = useState<number | null>(issueNos[0] ?? null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRelevance, setSelectedRelevance] = useState<string | null>(null);
  const [modalReportId, setModalReportId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return initialReports.filter((r) => {
      if (selectedIssue && r.issue_no !== selectedIssue) return false;
      if (selectedCategory && r.topic_category !== selectedCategory) return false;
      if (selectedRelevance && r.exam_relevance !== selectedRelevance) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          (r.summary ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialReports, selectedIssue, selectedCategory, selectedRelevance, searchQuery]);

  const counts = useMemo(() => ({
    high: initialReports.filter(r => selectedIssue ? r.issue_no === selectedIssue : true).filter(r => r.exam_relevance === 'high').length,
    medium: initialReports.filter(r => selectedIssue ? r.issue_no === selectedIssue : true).filter(r => r.exam_relevance === 'medium').length,
    low: initialReports.filter(r => selectedIssue ? r.issue_no === selectedIssue : true).filter(r => r.exam_relevance === 'low').length,
  }), [initialReports, selectedIssue]);

  return (
    <div>
      {/* 필터 영역 */}
      <div className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="제목, 태그, 내용으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
        />

        {/* 권호 필터 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedIssue(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedIssue === null ? 'bg-[#0F172A] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8]'
            }`}
          >
            전체 기간
          </button>
          {issueNos.map((no) => (
            <button key={no}
              onClick={() => setSelectedIssue(selectedIssue === no ? null : no)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedIssue === no ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8]'
              }`}
            >
              {issueMonths[no] ?? `제${no}호`}
            </button>
          ))}
        </div>

        {/* 시험 연관성 필터 */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-[#94A3B8] font-medium">시험 연관성:</span>
          <button
            onClick={() => setSelectedRelevance(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedRelevance === null ? 'bg-[#0F172A] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8]'
            }`}
          >
            전체
          </button>
          {(['high','medium','low'] as const).map((rel) => {
            const cfg = RELEVANCE_CONFIG[rel];
            const count = counts[rel];
            return (
              <button key={rel}
                onClick={() => setSelectedRelevance(selectedRelevance === rel ? null : rel)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedRelevance === rel ? `${cfg.color} font-bold` : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8]'
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === null ? 'bg-[#0F172A] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8]'
            }`}
          >
            전체 주제
          </button>
          {categories.map((cat) => (
            <button key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat ? 'bg-[#0891B2] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 개수 */}
      <p className="text-sm text-[#64748B] mb-4">
        {filtered.length}개 보고서
        {(selectedIssue || selectedCategory || selectedRelevance || searchQuery) && (
          <button
            onClick={() => { setSelectedIssue(issueNos[0] ?? null); setSelectedCategory(null); setSelectedRelevance(null); setSearchQuery(''); }}
            className="ml-2 text-[#2563EB] hover:underline text-xs"
          >
            필터 초기화
          </button>
        )}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#94A3B8]"><p>검색 결과가 없습니다.</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpenModal={() => setModalReportId(report.id)}
              isApproved={isApproved}
              monthLabel={issueMonths[report.issue_no] ?? `제${report.issue_no}호`}
            />
          ))}
        </div>
      )}

      <KidiReportModal reportId={modalReportId} onClose={() => setModalReportId(null)} />
    </div>
  );
}

function ReportCard({ report, onOpenModal, isApproved, monthLabel }: {
  report: KidiReport; onOpenModal: () => void; isApproved: boolean; monthLabel: string;
}) {
  const rel = (report.exam_relevance ?? 'medium') as 'high' | 'medium' | 'low';
  const relCfg = RELEVANCE_CONFIG[rel] ?? RELEVANCE_CONFIG.medium;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white flex flex-col transition-shadow hover:shadow-sm">
      {/* 카드 상단 */}
      <div className="p-5 flex-1">
        {/* 권호 + 카테고리 + 연관성 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-medium text-[#94A3B8]">{monthLabel}</span>

          {/* 시험 연관성 배지 */}
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold flex items-center gap-1 ${relCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${relCfg.dot}`} />
            시험 연관성 {relCfg.label}
          </span>

          {report.topic_category && (
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getCategoryColor(report.topic_category)}`}>
              {report.topic_category}
            </span>
          )}
        </div>

        {/* 제목 */}
        <h3 className="font-semibold text-[#0F172A] text-sm leading-snug mb-3">{report.title}</h3>

        {/* 요약 */}
        {isApproved ? (
          report.summary ? (
            <p className="text-xs text-[#64748B] leading-relaxed line-clamp-4">
              {report.summary}
            </p>
          ) : null
        ) : (
          <div className="relative">
            <p className="text-xs text-[#64748B] leading-relaxed line-clamp-3 blur-sm select-none">
              이 보고서의 요약 내용은 승인 회원에게 공개됩니다. 가입 후 관리자 승인을 받으면 전체 내용을 열람하실 수 있습니다.
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-1.5 rounded-full bg-white/90 border border-[#E2E8F0] px-3 py-1.5 shadow-sm">
                <span className="text-xs">🔒</span>
                <span className="text-xs font-medium text-[#475569]">승인 회원 공개</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 카드 하단 */}
      <div className="px-5 py-3 border-t border-[#F8FAFC] flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          {report.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] text-[#64748B]">#{tag}</span>
          ))}
        </div>
        {isApproved ? (
          <button
            onClick={onOpenModal}
            className="shrink-0 rounded-lg border border-[#0891B2] bg-[#F0F9FF] px-2.5 py-1 text-xs font-medium text-[#0369A1] hover:bg-[#0891B2] hover:text-white transition-colors"
          >
            학습 노트 열기 →
          </button>
        ) : (
          <a href="/signup" className="shrink-0 rounded-lg bg-[#2563EB] px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
            가입하기
          </a>
        )}
      </div>
    </div>
  );
}
