'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { WeeklyIssueSummary } from '@/types/weekly';
import { getISOWeek } from '@/lib/utils/week';

interface WeeklyArchiveNavProps {
  archives: WeeklyIssueSummary[];
  currentIssueDate?: string;
}

export function WeeklyArchiveNav({ archives, currentIssueDate }: WeeklyArchiveNavProps) {
  const router = useRouter();
  const [hasKey, setHasKey] = useState(true); // true to avoid hydration flash
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState('');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showPw, setShowPw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasKey(!!localStorage.getItem('access_key'));
  }, []);

  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInput('');
      setStatus('idle');
      setShowPw(false);
    }
  }, [modalOpen]);

  function handleLockedClick(href: string) {
    setPendingHref(href);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: input.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem('access_key', input.trim());
        setHasKey(true);
        setModalOpen(false);
        router.push(pendingHref);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (!archives.length) return null;

  return (
    <>
      <aside className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-3">📅 지난 주차 아카이브</h3>
        <ul className="space-y-1">
          {archives.map((arc) => {
            const d = new Date(arc.issue_date);
            const year = d.getUTCFullYear();
            const week = getISOWeek(d);
            const isCurrent = arc.issue_date === currentIssueDate;
            const isLocked = !hasKey && !isCurrent;
            const href = isCurrent ? '/weekly' : `/weekly/${year}/${week}`;

            return (
              <li key={arc.id}>
                {isLocked ? (
                  <button
                    type="button"
                    onClick={() => handleLockedClick(href)}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
                  >
                    <span>{arc.week_label}</span>
                    <span className="text-[#CBD5E1] text-xs">🔒</span>
                  </button>
                ) : (
                  <Link
                    href={href}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                      isCurrent
                        ? 'bg-[#2563EB]/10 font-medium text-[#2563EB]'
                        : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                    }`}
                  >
                    <span>{arc.week_label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* 접근 키 모달 */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🔒</div>
              <h2 className="text-base font-semibold text-[#0F172A]">접근 키가 필요합니다</h2>
              <p className="text-sm text-[#64748B] mt-1 leading-relaxed">
                지난 주차 아카이브는 접근 키 입력 후 이용할 수 있습니다.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type={showPw ? 'text' : 'password'}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setStatus('idle'); }}
                  placeholder="접근 키 입력"
                  className={`w-full rounded-lg border pl-3 pr-10 py-2 text-sm outline-none focus:ring-2 ${
                    status === 'error'
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:ring-[#0891B2]/20 focus:border-[#0891B2]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {status === 'error' && (
                <p className="text-xs text-red-500">올바르지 않은 키입니다.</p>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="flex-1 rounded-lg bg-[#0891B2] px-4 py-2 text-sm font-medium text-white hover:bg-[#0E7490] disabled:opacity-50 transition-colors"
                >
                  {status === 'loading' ? '확인 중…' : '확인'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
