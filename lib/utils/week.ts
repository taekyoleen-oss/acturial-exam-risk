/**
 * 주어진 날짜가 속한 주의 월요일 날짜를 반환 (YYYY-MM-DD)
 */
export function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=일, 1=월 ... 6=토
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/**
 * 연도와 ISO 주차 번호로 해당 주의 월요일 날짜 반환
 */
export function getMondayByYearWeek(year: number, week: number): string {
  // ISO 8601: 1월 4일이 항상 1주차에 속함
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // ISO: 월=1, 일=7
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - (jan4Day - 1));
  firstMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
  return firstMonday.toISOString().split('T')[0];
}

/**
 * 날짜로 ISO 주차 번호 반환
 */
export function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

/**
 * 주간 라벨 생성 (예: "2025년 3월 3주차")
 */
export function getWeekLabel(monday: Date): string {
  const year = monday.getFullYear();
  const month = monday.getMonth() + 1;
  const weekOfMonth = Math.ceil(monday.getDate() / 7);
  return `${year}년 ${month}월 ${weekOfMonth}주차`;
}
