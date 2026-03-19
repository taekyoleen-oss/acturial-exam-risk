import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthState } from '@/lib/auth';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { KidiClient } from './KidiClient';

export const dynamic = 'force-dynamic';

export default async function KidiPage() {
  const [auth, reportsRes, metaRes] = await Promise.all([
    getAuthState(),
    supabaseAdmin
      .from('act_kidi_reports')
      .select('id, issue_no, file_no, title, summary, key_points, tags, topic_category, exam_relevance, published_month, processed_at')
      .eq('status', 'processed')
      .order('issue_no', { ascending: false })
      .order('file_no', { ascending: true })
      .limit(200),
    supabaseAdmin
      .from('act_kidi_reports')
      .select('issue_no, topic_category')
      .eq('status', 'processed'),
  ]);

  const reports = (reportsRes.data ?? []).map((r) => ({
    ...r,
    key_points: Array.isArray(r.key_points) ? (r.key_points as string[]) : [],
  }));

  const allMeta = metaRes.data ?? [];
  const issueNos = [...new Set(allMeta.map((r) => r.issue_no))].sort((a, b) => b - a);
  const categories = [...new Set(allMeta.map((r) => r.topic_category).filter(Boolean))].sort() as string[];

  // issue_no → published_month 맵 (reports에서 구성)
  const issueMonths: Record<number, string> = {};
  (reportsRes.data ?? []).forEach((r) => {
    if (r.published_month) issueMonths[r.issue_no] = r.published_month;
  });

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <SiteHeader auth={auth} currentPath="/kidi" />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block rounded-full bg-[#0891B2]/10 px-3 py-1 text-xs font-medium text-[#0891B2]">
              전문기관 보고서
            </span>
            {!auth.isApproved && (
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                승인 회원: 요약 전문 열람
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">전문기관 보고서 요약</h1>
          <p className="text-[#64748B] text-sm">
            전문기관 보고서({issueNos.length > 0
              ? `${issueMonths[issueNos[issueNos.length - 1]] ?? `제${issueNos[issueNos.length - 1]}호`} ~ ${issueMonths[issueNos[0]] ?? `제${issueNos[0]}호`}`
              : ''})의
            핵심 내용을 AI로 요약했습니다.
            {auth.isApproved
              ? ' 계리리스크관리 시험 관련 주제를 중심으로 학습에 활용하세요.'
              : ' 요약·핵심포인트는 승인 회원에게 공개됩니다.'}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">총 {reports.length}개 보고서</p>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-20 text-[#94A3B8]">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-medium">아직 처리된 보고서가 없습니다.</p>
          </div>
        ) : (
          <KidiClient
            initialReports={reports}
            issueNos={issueNos}
            issueMonths={issueMonths}
            categories={categories}
            isApproved={auth.isApproved}
          />
        )}
      </div>
    </main>
  );
}
