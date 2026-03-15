interface SubjectBadgeProps {
  year: number;
  session: string;
  questionNo?: number;
}

export function SubjectBadge({ year, session, questionNo }: SubjectBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#0891B2]/10 px-2.5 py-0.5 text-xs font-medium text-[#0891B2]">
      {year}년 {session}{questionNo !== undefined ? ` ${questionNo}번` : ''}
    </span>
  );
}
