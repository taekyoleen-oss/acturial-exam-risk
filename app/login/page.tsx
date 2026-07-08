import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthState } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
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
          <h2 className="text-lg font-semibold text-[#0F172A] mb-6">로그인</h2>
          <LoginForm />
          <p className="mt-4 text-center text-sm text-[#64748B]">
            계정이 없으신가요?{' '}
            <a href="/signup" className="text-[#2563EB] hover:underline font-medium">
              회원가입
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
