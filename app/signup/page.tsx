import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthState } from '@/lib/auth';
import { SignupForm } from './SignupForm';

export default async function SignupPage() {
  const auth = await getAuthState();

  if (auth.isApproved) redirect('/');
  if (auth.isLoggedIn) redirect('/pending');

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-bold text-[#0F172A] hover:text-[#2563EB]">
            계리리스크관리 학습 참고
          </Link>
          <p className="text-sm text-[#64748B] mt-1">보험계리사 2차 학습 서비스</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-1">회원가입</h2>
          <p className="text-xs text-[#64748B] mb-6">
            가입 후 관리자 승인이 완료되면 전체 콘텐츠를 이용하실 수 있습니다.
          </p>
          <SignupForm />
          <p className="mt-4 text-center text-sm text-[#64748B]">
            이미 계정이 있으신가요?{' '}
            <a href="/login" className="text-[#2563EB] hover:underline font-medium">
              로그인
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
