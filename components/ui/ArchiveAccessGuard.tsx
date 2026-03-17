'use client';

import { useState, useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ArchiveAccessGuard({ children }: Props) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    setHasKey(!!localStorage.getItem('access_key'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
        setStatus('idle');
        setInput('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  // Loading state
  if (hasKey === null) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-sm text-[#64748B]">로딩 중…</div>
      </div>
    );
  }

  // Access denied
  if (!hasKey) {
    return (
      <div className="min-h-[400px] flex items-center justify-center px-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-[#0F172A] mb-2">접근 제한</h2>
          <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
            지난 주차 예상문제 아카이브는 접근 키가 필요합니다.
            <br />
            상단 배너 또는 아래에서 키를 입력하세요.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setStatus('idle');
              }}
              placeholder="접근 키 입력"
              className={`rounded-lg border px-3 py-2 text-sm w-full outline-none focus:ring-2 ${
                status === 'error'
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-[#CBD5E1] focus:ring-[#0891B2]/20 focus:border-[#0891B2]'
              }`}
            />
            {status === 'error' && (
              <p className="text-xs text-red-500">올바르지 않은 키입니다.</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-lg bg-[#0891B2] px-4 py-2 text-sm font-medium text-white hover:bg-[#0E7490] disabled:opacity-50 transition-colors"
            >
              {status === 'loading' ? '확인 중…' : '접근 키 확인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
