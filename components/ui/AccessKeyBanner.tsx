'use client';

import { useState, useEffect } from 'react';

export function AccessKeyBanner() {
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

  const handleRemove = () => {
    localStorage.removeItem('access_key');
    setHasKey(false);
    setStatus('idle');
    setInput('');
    setShowKey(false);
  };

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
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setStatus('idle');
                  }}
                  placeholder="접근 키 입력"
                  className={`rounded border pr-7 pl-2 py-0.5 text-xs w-36 outline-none focus:ring-1 ${
                    status === 'error'
                      ? 'border-red-400 focus:ring-red-300'
                      : 'border-[#CBD5E1] focus:ring-[#0891B2]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-1.5 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  tabIndex={-1}
                  title={showKey ? '숨기기' : '보기'}
                >
                  {showKey ? (
                    // Eye-off icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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
