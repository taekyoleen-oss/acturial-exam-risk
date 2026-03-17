'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { WeeklyIssueSummary } from '@/types/weekly';
import { getISOWeek } from '@/lib/utils/week';

interface WeeklyArchiveNavProps {
  archives: WeeklyIssueSummary[];
  currentIssueDate?: string;
}

export function WeeklyArchiveNav({ archives, currentIssueDate }: WeeklyArchiveNavProps) {
  // Default true to avoid flash of lock icons before hydration
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    setHasKey(!!localStorage.getItem('access_key'));
  }, []);

  if (!archives.length) return null;

  return (
    <aside className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#0F172A] mb-3">📅 지난 주차 아카이브</h3>
      <ul className="space-y-1">
        {archives.map((arc) => {
          const d = new Date(arc.issue_date);
          const year = d.getFullYear();
          const week = getISOWeek(d);
          const isCurrent = arc.issue_date === currentIssueDate;
          const showLock = !hasKey && !isCurrent;

          return (
            <li key={arc.id}>
              <Link
                href={isCurrent ? '/weekly' : `/weekly/${year}/${week}`}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  isCurrent
                    ? 'bg-[#2563EB]/10 font-medium text-[#2563EB]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <span>{arc.week_label}</span>
                {showLock && <span className="text-[#CBD5E1] text-xs">🔒</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
