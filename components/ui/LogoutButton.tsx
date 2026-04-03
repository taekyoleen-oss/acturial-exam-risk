'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
      />
    </svg>
  );
}

interface LogoutButtonProps {
  className?: string;
  /** true면 텍스트 대신 아이콘만 표시 (모바일 등) */
  iconOnly?: boolean;
}

export function LogoutButton({ className, iconOnly }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const defaultClass =
    'rounded-lg px-4 py-2 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors';

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        aria-label="로그아웃"
        title="로그아웃"
        className={
          className ??
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F172A] transition-colors'
        }
      >
        <LogoutIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button onClick={handleLogout} className={className ?? defaultClass}>
      로그아웃
    </button>
  );
}
