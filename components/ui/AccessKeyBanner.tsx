'use client';

import { useState, useEffect } from 'react';

export function AccessKeyBanner() {
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

  const handleRemove = () => {
    localStorage.removeItem('access_key');
    setHasKey(false);
    setStatus('idle');
    setInput('');
  };

  // Don't render until hydrated to avoid SSR mismatch
  if (hasKey === null) return null;

  return (
    <div
      className={`sticky top-0 z-50 border-b text-xs ${
        hasKey ? 'border-emerald-200 bg-emerald-50' : 'border-[#E2E8F0] bg-white'
      }`}
    >
      <div className="mx-auto max-w-5xl flex flex-wrap items-center gap-2 px-4 py-2">
        {hasKey ? (
          <>
            <span className="text-emerald-600">🔓</span>
            <span className="text-emerald-700 font-medium">전체 접근 가능</span>
            <button
              onClick={handleRemove}
              className="ml-auto rounded px-2 py-0.5 text-xs text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors"
            >
              키 삭제
            </button>
          </>
        ) : (
          <>
            <span className="text-[#94A3B8]">🔒</span>
            <span className="text-[#64748B]">일부 콘텐츠가 제한됩니다. 개발자에게 키를 문의하세요.</span>
            <form onSubmit={handleSubmit} className="ml-auto flex items-center gap-2">
              <input
                type="password"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setStatus('idle');
                }}
                placeholder="접근 키 입력"
                className={`rounded border px-2 py-0.5 text-xs w-32 outline-none focus:ring-1 ${
                  status === 'error'
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-[#CBD5E1] focus:ring-[#0891B2]'
                }`}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded bg-[#0891B2] px-2 py-0.5 text-xs text-white hover:bg-[#0E7490] disabled:opacity-50 transition-colors"
              >
                {status === 'loading' ? '확인 중…' : '확인'}
              </button>
            </form>
            {status === 'error' && (
              <span className="text-red-500">올바르지 않은 키입니다.</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
