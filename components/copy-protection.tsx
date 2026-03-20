'use client';

import { useEffect } from 'react';

export function CopyProtection({ isAdmin }: { isAdmin: boolean }) {
  useEffect(() => {
    if (isAdmin) return;

    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();
    const preventCut = (e: ClipboardEvent) => e.preventDefault();
    const preventKeydown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+U(소스보기), Ctrl+S(저장) 차단
      if (e.ctrlKey && ['c', 'a', 'x', 'u', 's'].includes(key)) {
        e.preventDefault();
      }
      // F12 (개발자도구) 차단
      if (key === 'f12') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCut);
    document.addEventListener('keydown', preventKeydown);

    // 텍스트 선택 비활성화
    document.body.classList.add('no-select');

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCut);
      document.removeEventListener('keydown', preventKeydown);
      document.body.classList.remove('no-select');
    };
  }, [isAdmin]);

  return null;
}
