'use client';

import { useState, useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ArchiveAccessGuard({ children }: Props) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showKey, setShowKey] = useState(false);

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
        setShowKey(false);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (hasKey === null) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-sm text-[#64748B]">로딩 중…</div>
      </div>
    );
  }

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
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setStatus('idle');
                }}
                placeholder="접근 키 입력"
                className={`rounded-lg border pr-10 pl-3 py-2 text-sm w-full outline-none focus:ring-2 ${
                  status === 'error'
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#0891B2]/20 focus:border-[#0891B2]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                tabIndex={-1}
                title={showKey ? '숨기기' : '보기'}
              >
                {showKey ? (
                  // Eye-off icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  // Eye icon
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
