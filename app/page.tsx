export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* 헤더 */}
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#0F172A]">계리리스크관리 학습 참고</h1>
            <p className="text-xs text-[#64748B]">보험계리사 2차 — 주간 뉴스 기반 예상 문제</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/weekly" className="text-[#2563EB] hover:underline">이번 주 예상 문제</a>
            <a href="/past-questions" className="text-[#64748B] hover:text-[#0F172A]">기출문제 조회</a>
          </nav>
        </div>
      </header>

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
          시험 보기·채점 없이 학습 참고 자료로만 활용하세요.
        </p>
        <div className="flex gap-3 justify-center">
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
        </div>
      </section>

      {/* 기능 카드 */}
      <section className="mx-auto max-w-5xl px-4 pb-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {/* 면책 고지 */}
      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-[#64748B]">
          AI가 생성한 예상 문제는 공식 시험과 다를 수 있으며, 학습 참고 용도로만 사용하시기 바랍니다.
        </div>
      </footer>
    </main>
  );
}
