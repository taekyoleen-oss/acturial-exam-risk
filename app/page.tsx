import { getAuthState } from '@/lib/auth';
import { SiteHeader } from '@/components/ui/SiteHeader';

export default async function Home() {
  const auth = await getAuthState();

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <SiteHeader auth={auth} currentPath="/" />

      {/* 히어로 섹션 */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <span className="inline-block rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-medium text-[#7C3AED] mb-4">
          계리리스크관리 (2차) 단일 과목
        </span>
        <h2 className="text-3xl font-bold text-[#0F172A] mb-4">
          이번 주 리스크 뉴스로<br />시험을 대비하세요
        </h2>
        <p className="text-[#64748B] mb-8 max-w-xl mx-auto">
          매주 월요일 리스크 관련 뉴스 기사와 AI 가상 예상 문제, 관련 기출문제를 함께 제공합니다.
          {auth.isApproved
            ? ' 승인 회원으로 모든 콘텐츠를 이용하실 수 있습니다.'
            : ' 회원가입 후 관리자 승인을 받으면 전체 콘텐츠를 이용하실 수 있습니다.'}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="/weekly"
            className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            이번 주 예상 문제 보기
          </a>
          <a
            href="/past-questions"
            className="rounded-lg border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            기출문제 조회
          </a>
          {!auth.isLoggedIn && (
            <a
              href="/signup"
              className="rounded-lg border border-[#2563EB] px-5 py-2.5 text-sm font-medium text-[#2563EB] hover:bg-blue-50 transition-colors"
            >
              회원가입 신청
            </a>
          )}
        </div>
      </section>

      {/* 기능 카드 */}
      <section className="mx-auto max-w-5xl px-4 pb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
          <div className="text-2xl mb-3">📰</div>
          <h3 className="font-semibold text-[#0F172A] mb-1">주간 뉴스 기반</h3>
          <p className="text-sm text-[#64748B]">리스크 관련 기사를 매주 자동 수집하여 시험 트렌드를 파악합니다.</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
          <div className="text-2xl mb-3">🤖</div>
          <h3 className="font-semibold text-[#0F172A] mb-1">AI 예상 문제</h3>
          <p className="text-sm text-[#64748B]">기사 내용과 기출 패턴을 바탕으로 5지선다 가상 문제를 생성합니다.</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
          <div className="text-2xl mb-3">📚</div>
          <h3 className="font-semibold text-[#0F172A] mb-1">기출문제 연계</h3>
          <p className="text-sm text-[#64748B]">뉴스와 관련된 기출문제를 함께 제시하여 시험 유형을 익힙니다.</p>
        </div>
      </section>

      {/* KIDI 보고서 섹션 */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📋</span>
              <h3 className="font-semibold text-[#0F172A]">전문기관 보고서 요약</h3>
              <span className="rounded-full bg-[#0891B2]/10 px-2 py-0.5 text-xs font-medium text-[#0891B2]">NEW</span>
              {!auth.isApproved && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  승인 회원 전체 공개
                </span>
              )}
            </div>
            <p className="text-sm text-[#64748B]">
              보험연구원 주간지의 핵심 내용을 AI로 요약·정리했습니다. 최신 리스크 트렌드와 시험 출제 포인트를 확인하세요.
            </p>
          </div>
          <a
            href="/kidi"
            className="shrink-0 ml-4 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            보러 가기 →
          </a>
        </div>
      </section>

      {/* 미가입 안내 배너 */}
      {!auth.isLoggedIn && (
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="rounded-xl border border-[#2563EB]/20 bg-blue-50 p-6 text-center">
            <h3 className="font-semibold text-[#1D4ED8] mb-2">전체 콘텐츠를 이용하려면 회원가입이 필요합니다</h3>
            <p className="text-sm text-[#3B82F6] mb-4">
              기출문제 전체 조회 · 주간 아카이브 · 전문기관 보고서 요약 전문 · AI 정답 해설
            </p>
            <a
              href="/signup"
              className="inline-block rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              무료 회원가입 신청
            </a>
          </div>
        </section>
      )}

      {/* 면책 고지 */}
      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-[#64748B]">
          AI가 생성한 예상 문제는 공식 시험과 다를 수 있으며, 학습 참고 용도로만 사용하시기 바랍니다.
        </div>
      </footer>
    </main>
  );
}
