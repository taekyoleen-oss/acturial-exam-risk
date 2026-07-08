'use client';

import Link from 'next/link';
import type { WeeklyIssueSummary } from '@/types/weekly';
import { getISOWeek, getISOWeekYear } from '@/lib/utils/week';

interface WeeklyArchiveNavProps {
  archives: WeeklyIssueSummary[];
  currentIssueDate?: string;
}

export function WeeklyArchiveNav({ archives, currentIssueDate }: WeeklyArchiveNavProps) {
  if (!archives.length) return null;

  return (
    <>
      <aside className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-3">📅 지난 주차 아카이브</h3>
        <ul className="space-y-1">
          {archives.map((arc) => {
            const d = new Date(arc.issue_date);
            // ISO week-year를 사용해야 [year]/[week] 라운드트립이 연말·연초 경계에서 일치한다.
            // (달력 연도 getUTCFullYear()는 ISO 주차와 어긋날 수 있음)
            const year = getISOWeekYear(d);
            const week = getISOWeek(d);
            const isCurrent = arc.issue_date === currentIssueDate;
            const href = isCurrent ? '/weekly' : `/weekly/${year}/${week}`;
            return (
              <li key={arc.id}>
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
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
