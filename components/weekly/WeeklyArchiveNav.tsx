import Link from 'next/link';
import type { WeeklyIssueSummary } from '@/types/weekly';
import { getISOWeek } from '@/lib/utils/week';

interface WeeklyArchiveNavProps {
  archives: WeeklyIssueSummary[];
  currentIssueDate?: string;
}

export function WeeklyArchiveNav({ archives, currentIssueDate }: WeeklyArchiveNavProps) {
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

          return (
            <li key={arc.id}>
              <Link
                href={isCurrent ? '/weekly' : `/weekly/${year}/${week}`}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  isCurrent
                    ? 'bg-[#2563EB]/10 font-medium text-[#2563EB]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                {arc.week_label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
