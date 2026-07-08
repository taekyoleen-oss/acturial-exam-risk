import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getRecentBatchStatus } from '@/lib/supabase/queries/weekly';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminClient } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const headersList = await headers();
  const adminId = headersList.get('x-admin-id');

  if (!adminId || adminId !== process.env.ADMIN_USER_ID) {
    notFound();
  }

  const [batchStatus, newsSources, pdfImports, pendingUsers] = await Promise.all([
    getRecentBatchStatus(8),
    supabaseAdmin.from('act_news_sources').select('*').order('name'),
    supabaseAdmin
      .from('act_pdf_imports')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('act_user_profiles')
      .select('id, email, name, status, created_at, approved_at, rejected_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-lg font-semibold text-[#0F172A] hover:text-[#2563EB]">
              계리리스크관리 학습 참고
            </Link>
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              관리자
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="text-xl font-bold text-[#0F172A] mb-8">관리자 대시보드</h2>

        <AdminClient
          initialBatchStatus={batchStatus}
          initialNewsSources={newsSources.data ?? []}
          initialPdfImports={pdfImports.data ?? []}
          initialPendingUsers={pendingUsers.data ?? []}
          adminId={adminId}
        />
      </div>
    </main>
  );
}
