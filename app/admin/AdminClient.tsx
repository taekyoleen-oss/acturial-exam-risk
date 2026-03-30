'use client';

import { useState } from 'react';

interface BatchStatus {
  id: string;
  issue_date: string;
  week_label: string;
  status: string;
  generated_at: string | null;
}

interface NewsSource {
  id: string;
  name: string;
  domain: string;
  is_active: boolean;
}

interface PdfImport {
  id: string;
  filename: string;
  year: number;
  status: string;
  question_count: number | null;
  error_msg: string | null;
  uploaded_at: string;
  completed_at: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

interface AdminClientProps {
  initialBatchStatus: BatchStatus[];
  initialNewsSources: NewsSource[];
  initialPdfImports: PdfImport[];
  initialPendingUsers: UserProfile[];
  adminId: string;
}

export function AdminClient({
  initialBatchStatus,
  initialNewsSources,
  initialPdfImports,
  initialPendingUsers,
  adminId,
}: AdminClientProps) {
  const [tab, setTab] = useState<'users' | 'batch' | 'news' | 'pdf'>('users');
  const [pendingUsers, setPendingUsers] = useState(initialPendingUsers);
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [usersTab, setUsersTab] = useState<'pending' | 'approved'>('pending');
  const [userActionMsg, setUserActionMsg] = useState('');
  const [newsSources, setNewsSources] = useState(initialNewsSources);
  const [pdfImports, setPdfImports] = useState(initialPdfImports);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // 회원 승인/거절
  const handleUserAction = async (userId: string, action: 'approve' | 'reject') => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
      body: JSON.stringify({ userId, action }),
    });
    if (res.ok) {
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setUserActionMsg(action === 'approve' ? '✅ 승인되었습니다.' : '❌ 거절되었습니다.');
      setTimeout(() => setUserActionMsg(''), 3000);
    }
  };

  // 승인된 회원 목록 로드
  const loadApprovedUsers = async () => {
    const res = await fetch('/api/admin/users?status=approved', {
      headers: { 'x-admin-id': adminId },
    });
    if (res.ok) {
      const data = await res.json();
      setApprovedUsers(data.data ?? []);
    }
  };

  // 뉴스 소스 활성화 토글
  const toggleNewsSource = async (id: string, current: boolean) => {
    const res = await fetch('/api/admin/news-sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) {
      setNewsSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s))
      );
    }
  };

  // 새 뉴스 소스 추가
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const addNewsSource = async () => {
    if (!newName || !newDomain) return;
    const res = await fetch('/api/admin/news-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
      body: JSON.stringify({ name: newName, domain: newDomain }),
    });
    if (res.ok) {
      const added = await res.json();
      setNewsSources((prev) => [...prev, added]);
      setNewName('');
      setNewDomain('');
    }
  };

  // 뉴스 소스 삭제
  const deleteNewsSource = async (id: string) => {
    const res = await fetch(`/api/admin/news-sources?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-id': adminId },
    });
    if (res.ok) setNewsSources((prev) => prev.filter((s) => s.id !== id));
  };

  // PDF 업로드
  const [pdfYear, setPdfYear] = useState(new Date().getFullYear());
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMsg('');
    const form = new FormData();
    form.append('file', file);
    form.append('year', String(pdfYear));
    const res = await fetch('/api/admin/pdf-import', {
      method: 'POST',
      headers: { 'x-admin-id': adminId },
      body: form,
    });
    const data = await res.json();
    if (res.ok) {
      setUploadMsg(`✅ 처리 시작됨 (importId: ${data.importId})`);
      setPdfImports((prev) => [
        {
          id: data.importId,
          filename: file.name,
          year: pdfYear,
          status: 'processing',
          question_count: null,
          error_msg: null,
          uploaded_at: new Date().toISOString(),
          completed_at: null,
        },
        ...prev,
      ]);
    } else {
      setUploadMsg(`❌ 오류: ${data.error ?? '알 수 없는 오류'}`);
    }
    setIsUploading(false);
    e.target.value = '';
  };

  // 수동 배치 트리거
  const [isTriggeringBatch, setIsTriggeringBatch] = useState(false);
  const [batchMsg, setBatchMsg] = useState('');
  const triggerBatch = async () => {
    if (!confirm('이번 주 예상문제를 지금 생성할까요?')) return;
    setIsTriggeringBatch(true);
    setBatchMsg('');
    try {
      const res = await fetch('/api/admin/trigger-weekly', {
        method: 'POST',
        headers: { 'x-admin-id': adminId },
      });
      const data = await res.json();
      if (!res.ok) {
        setBatchMsg(`❌ 오류: ${data.error ?? '알 수 없는 오류'}`);
      } else if (data.skipped) {
        setBatchMsg(`ℹ️ ${data.message}`);
      } else {
        setBatchMsg(`✅ 생성 완료 — ${data.weekLabel} / 기사 ${data.articles}개 / 문제 ${data.questions}개`);
      }
    } catch {
      setBatchMsg('❌ 네트워크 오류');
    } finally {
      setIsTriggeringBatch(false);
    }
  };

  // 답안 캐시 초기화
  const [clearMsg, setClearMsg] = useState('');
  const clearAnswerCache = async (prefix: 'all' | 'past' | 'virtual' | 'kidi') => {
    const labels: Record<string, string> = { all: '전체', past: '기출문제', virtual: '예상문제', kidi: '전문기관 반영' };
    if (!confirm(`${labels[prefix]} 답안 캐시를 삭제할까요? 삭제 후 다시 생성됩니다.`)) return;
    const res = await fetch(`/api/admin/clear-answers?prefix=${prefix}`, {
      method: 'DELETE',
      headers: { 'x-admin-id': adminId },
    });
    const data = await res.json();
    if (res.ok) {
      setClearMsg(`✅ ${labels[prefix]} 답안 ${data.deleted}개 삭제 완료`);
    } else {
      setClearMsg(`❌ 오류: ${data.error}`);
    }
    setTimeout(() => setClearMsg(''), 5000);
  };

  const statusColor: Record<string, string> = {
    published: 'text-green-600',
    failed: 'text-red-600',
    draft: 'text-yellow-600',
    processing: 'text-blue-600',
    completed: 'text-green-600',
    pending: 'text-gray-500',
  };

  return (
    <div>
      {/* 탭 */}
      <div className="flex gap-1 border-b border-[#E2E8F0] mb-6 overflow-x-auto">
        {([
          { key: 'users', label: `👥 회원 관리${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}` },
          { key: 'batch', label: '🔄 배치 상태' },
          { key: 'news',  label: '📰 뉴스 소스' },
          { key: 'pdf',   label: '📄 기출 PDF' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === key
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 회원 관리 */}
      {tab === 'users' && (
        <div>
          <h3 className="font-semibold text-[#0F172A] mb-4">회원 관리</h3>
          {userActionMsg && (
            <div className="mb-4 rounded-lg bg-[#F0FDF4] border border-green-200 px-4 py-2 text-sm text-green-700">
              {userActionMsg}
            </div>
          )}

          {/* 서브탭 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setUsersTab('pending')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                usersTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              대기 중 ({pendingUsers.length})
            </button>
            <button
              onClick={() => { setUsersTab('approved'); loadApprovedUsers(); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                usersTab === 'approved' ? 'bg-emerald-600 text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              승인 완료
            </button>
          </div>

          {/* 대기 중 */}
          {usersTab === 'pending' && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-4 py-2 text-left font-medium text-[#64748B]">이름</th>
                    <th className="px-4 py-2 text-left font-medium text-[#64748B]">이메일</th>
                    <th className="px-4 py-2 text-left font-medium text-[#64748B]">가입일</th>
                    <th className="px-4 py-2 text-center font-medium text-[#64748B]">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {pendingUsers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">대기 중인 회원이 없습니다.</td></tr>
                  )}
                  {pendingUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-[#0F172A]">{u.name ?? '-'}</td>
                      <td className="px-4 py-3 text-[#64748B]">{u.email}</td>
                      <td className="px-4 py-3 text-[#64748B]">{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-center flex gap-2 justify-center">
                        <button
                          onClick={() => handleUserAction(u.id, 'approve')}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleUserAction(u.id, 'reject')}
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          거절
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 승인 완료 */}
          {usersTab === 'approved' && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-4 py-2 text-left font-medium text-[#64748B]">이름</th>
                    <th className="px-4 py-2 text-left font-medium text-[#64748B]">이메일</th>
                    <th className="px-4 py-2 text-left font-medium text-[#64748B]">가입일</th>
                    <th className="px-4 py-2 text-left font-medium text-[#64748B]">승인일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {approvedUsers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">데이터 로드 중…</td></tr>
                  )}
                  {approvedUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-[#0F172A]">{u.name ?? '-'}</td>
                      <td className="px-4 py-3 text-[#64748B]">{u.email}</td>
                      <td className="px-4 py-3 text-[#64748B]">{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {u.approved_at ? new Date(u.approved_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 배치 상태 */}
      {tab === 'batch' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0F172A]">최근 주간 배치 현황</h3>
            <button
              onClick={triggerBatch}
              disabled={isTriggeringBatch}
              className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTriggeringBatch ? '생성 중…' : '이번 주 예상문제 생성'}
            </button>
          </div>
          {batchMsg && (
            <div className={`mb-4 rounded-lg border px-4 py-2 text-sm ${
              batchMsg.startsWith('✅') ? 'bg-[#F0FDF4] border-green-200 text-green-700' :
              batchMsg.startsWith('ℹ️') ? 'bg-blue-50 border-blue-200 text-blue-700' :
              'bg-red-50 border-red-200 text-red-700'
            }`}>
              {batchMsg}
            </div>
          )}

          {/* 답안 캐시 초기화 */}
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="text-sm font-semibold text-amber-800 mb-1">AI 답안 캐시 초기화</h4>
            <p className="text-xs text-amber-700 mb-3">
              전문기관 자료를 답안에 반영하려면 기존 캐시를 삭제해야 합니다. 삭제 후 사용자가 답안 확인 시 자동으로 재생성됩니다.
            </p>
            {clearMsg && <p className="text-xs text-amber-900 mb-2 font-medium">{clearMsg}</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => clearAnswerCache('past')}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100">
                기출문제 답안 초기화
              </button>
              <button onClick={() => clearAnswerCache('virtual')}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100">
                예상문제 답안 초기화
              </button>
              <button onClick={() => clearAnswerCache('all')}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                전체 초기화
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">주차</th>
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">날짜</th>
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">상태</th>
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">생성 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {initialBatchStatus.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[#64748B]">데이터 없음</td></tr>
                )}
                {initialBatchStatus.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-[#0F172A]">{b.week_label}</td>
                    <td className="px-4 py-3 text-[#64748B]">{b.issue_date}</td>
                    <td className={`px-4 py-3 font-medium ${statusColor[b.status] ?? ''}`}>{b.status}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {b.generated_at ? new Date(b.generated_at).toLocaleString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 뉴스 소스 */}
      {tab === 'news' && (
        <div>
          <h3 className="font-semibold text-[#0F172A] mb-4">뉴스 발행기관 관리</h3>

          {/* 추가 폼 */}
          <div className="flex gap-2 mb-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="기관명 (예: 한국경제)"
              className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]"
            />
            <input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="도메인 (예: hankyung.com)"
              className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]"
            />
            <button
              onClick={addNewsSource}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              추가
            </button>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">기관명</th>
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">도메인</th>
                  <th className="px-4 py-2 text-center font-medium text-[#64748B]">활성</th>
                  <th className="px-4 py-2 text-center font-medium text-[#64748B]">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {newsSources.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-[#0F172A]">{s.name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.domain}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleNewsSource(s.id, s.is_active)}
                        className={`w-10 h-5 rounded-full transition-colors ${s.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteNewsSource(s.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 기출 PDF */}
      {tab === 'pdf' && (
        <div>
          <h3 className="font-semibold text-[#0F172A] mb-4">기출문제 PDF 파싱</h3>

          {/* 업로드 폼 */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 mb-6">
            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">출제 연도</label>
                <input
                  type="number"
                  value={pdfYear}
                  onChange={(e) => setPdfYear(parseInt(e.target.value, 10))}
                  className="w-24 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#64748B] mb-1">OCR PDF 파일</label>
                <input
                  type="file"
                  accept=".pdf"
                  disabled={isUploading}
                  onChange={handlePdfUpload}
                  className="block w-full text-sm text-[#64748B] file:mr-3 file:rounded-lg file:border-0 file:bg-[#2563EB] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-blue-700"
                />
              </div>
            </div>
            {uploadMsg && <p className="mt-2 text-sm text-[#64748B]">{uploadMsg}</p>}
          </div>

          {/* 파싱 이력 */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">파일명</th>
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">연도</th>
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">상태</th>
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">문항 수</th>
                  <th className="px-4 py-2 text-left font-medium text-[#64748B]">업로드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {pdfImports.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[#64748B]">업로드 이력 없음</td></tr>
                )}
                {pdfImports.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-[#0F172A] max-w-[160px] truncate">{p.filename}</td>
                    <td className="px-4 py-3 text-[#64748B]">{p.year}년</td>
                    <td className={`px-4 py-3 font-medium ${statusColor[p.status] ?? ''}`}>
                      {p.status}
                      {p.error_msg && (
                        <span className="ml-1 text-xs text-red-500" title={p.error_msg}>⚠️</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{p.question_count ?? '-'}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {new Date(p.uploaded_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
