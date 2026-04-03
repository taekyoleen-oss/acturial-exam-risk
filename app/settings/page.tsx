import { getAuthState } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsForm } from './SettingsForm';

export const metadata = {
  title: '내 정보 - 계리리스크관리',
  description: '계정 설정 및 정보 수정',
};

export default async function SettingsPage() {
  const auth = await getAuthState();
  
  if (!auth.isLoggedIn) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-[#0F172A]">계정 보안</h1>
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <SettingsForm email={auth.email ?? ''} />
      </div>
    </main>
  );
}
