import { LogoutButton } from './LogoutButton';
import type { AuthState } from '@/lib/auth';

interface Props {
  auth: AuthState;
  currentPath?: string;
}

export function SiteHeader({ auth, currentPath = '' }: Props) {
  const navItems = [
    { href: '/weekly', label: '이번 주 예상 문제' },
    { href: '/kidi', label: '전문기관 보고서' },
    { href: '/past-questions', label: '기출문제 조회' },
  ];

  return (
    <header className="border-b border-[#E2E8F0] bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="shrink-0">
          <a href="/" className="text-base font-semibold text-[#0F172A] hover:text-[#2563EB]">
            계리리스크관리 학습 참고
          </a>
          {auth.isApproved && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {auth.isAdmin ? '관리자' : '승인 회원'}
            </span>
          )}
        </div>

        <nav className="flex items-center gap-3 text-sm">
          {navItems.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={`hidden sm:block transition-colors ${
                currentPath === href
                  ? 'font-medium text-[#2563EB]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {label}
            </a>
          ))}

          {auth.isAdmin && (
            <a href="/admin" className="text-[#64748B] hover:text-[#0F172A] hidden sm:block">
              관리자
            </a>
          )}

          <div className="h-4 w-px bg-[#E2E8F0] hidden sm:block" />

          {auth.isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B] hidden md:block truncate max-w-[120px]">
                {auth.email}
              </span>
              <LogoutButton className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] transition-colors" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="rounded-lg px-2.5 py-1 text-xs text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                로그인
              </a>
              <a
                href="/signup"
                className="rounded-lg bg-[#2563EB] px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                회원가입
              </a>
            </div>
          )}
        </nav>
      </div>

      {/* 미승인 로그인 사용자 배너 */}
      {auth.isLoggedIn && !auth.isApproved && (
        <div className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-700">
          ⏳ 관리자 승인 대기 중입니다. 승인 후 전체 콘텐츠를 이용하실 수 있습니다.
          <a href="/pending" className="ml-2 underline">자세히 보기</a>
        </div>
      )}
    </header>
  );
}
