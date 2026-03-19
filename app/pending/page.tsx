import { redirect } from 'next/navigation';
import { getAuthState } from '@/lib/auth';
import { LogoutButton } from '@/components/ui/LogoutButton';

export default async function PendingPage() {
  const auth = await getAuthState();

  if (!auth.isLoggedIn) redirect('/login');
  if (auth.isApproved) redirect('/');

  const isRejected = auth.status === 'rejected';

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <a href="/" className="text-xl font-bold text-[#0F172A] hover:text-[#2563EB]">
          계리리스크관리 학습 참고
        </a>

        <div className="mt-8 bg-white rounded-xl border border-[#E2E8F0] p-8">
          {isRejected ? (
            <>
              <div className="text-4xl mb-4">❌</div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-2">가입 승인 거절</h2>
              <p className="text-sm text-[#64748B]">
                관리자에 의해 가입 신청이 거절되었습니다.
                <br />문의가 있으시면 관리자에게 연락해 주세요.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">⏳</div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-2">승인 대기 중</h2>
              <p className="text-sm text-[#64748B]">
                회원가입 신청이 완료되었습니다.
                <br />관리자 승인 후 전체 콘텐츠를 이용하실 수 있습니다.
              </p>
              <p className="text-xs text-[#94A3B8] mt-3">
                승인 완료 후 다시 로그인해 주세요.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <a
              href="/"
              className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            >
              제한된 콘텐츠 둘러보기
            </a>
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
