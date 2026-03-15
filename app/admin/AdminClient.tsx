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

interface AdminClientProps {
  initialBatchStatus: BatchStatus[];
  initialNewsSources: NewsSource[];
  initialPdfImports: PdfImport[];
}

export function AdminClient({
  initialBatchStatus,
  initialNewsSources,
  initialPdfImports,
}: AdminClientProps) {
  const [tab, setTab] = useState<'batch' | 'news' | 'pdf'>('batch');
  const [newsSources, setNewsSources] = useState(initialNewsSources);
  const [pdfImports, setPdfImports] = useState(initialPdfImports);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // 뉴스 소스 활성화 토글
  const toggleNewsSource = async (id: string, current: boolean) => {
    const res = await fetch('/api/admin/news-sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-id': '' },
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
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/admin/news-sources?id=${id}`, { method: 'DELETE' });
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
    const res = await fetch('/api/admin/pdf-import', { method: 'POST', body: form });
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
  const triggerBatch = async () => {
    const res = await fetch('/api/cron/weekly', {
      headers: { Authorization: `Bearer ${prompt('CRON_SECRET 입력:') ?? ''}` },
    });
    alert(res.ok ? '배치 트리거 완료' : '배치 트리거 실패');
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
      <div className="flex gap-1 border-b border-[#E2E8F0] mb-6">
        {(['batch', 'news', 'pdf'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {t === 'batch' ? '🔄 배치 상태' : t === 'news' ? '📰 뉴스 소스' : '📄 기출 PDF'}
          </button>
        ))}
      </div>

      {/* 배치 상태 */}
      {tab === 'batch' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0F172A]">최근 주간 배치 현황</h3>
            <button
              onClick={triggerBatch}
              className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              수동 트리거
            </button>
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
