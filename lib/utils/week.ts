/**
 * 주어진 날짜가 속한 주의 월요일 날짜를 반환 (YYYY-MM-DD)
 * UTC 기준으로 계산하여 타임존 영향을 방지한다.
 */
export function getMondayOfWeek(date: Date = new Date()): string {
  // UTC 날짜 기준으로 처리
  const utcMs =
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const d = new Date(utcMs);
  const day = d.getUTCDay(); // 0=일, 1=월 ... 6=토
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

/**
 * 연도와 ISO 주차 번호로 해당 주의 월요일 날짜 반환
 * UTC 기준으로 계산하여 타임존 영향을 방지한다.
 */
export function getMondayByYearWeek(year: number, week: number): string {
  // ISO 8601: 1월 4일이 항상 1주차에 속함 — UTC 사용
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // ISO: 월=1, 일=7
  const firstMonday = new Date(jan4);
  firstMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  firstMonday.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
  return firstMonday.toISOString().split('T')[0];
}

/**
 * 날짜로 ISO 주차 번호 반환
 * UTC 기준으로 계산하여 타임존 영향을 방지한다.
 */
export function getISOWeek(date: Date): number {
  // UTC 날짜만 사용하여 계산
  const utcMs =
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const d = new Date(utcMs);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getUTCDay() + 6) % 7)) /
        7
    )
  );
}

/**
 * 주간 라벨 생성 (예: "2025년 3월 3주차")
 * UTC 기준으로 계산하여 타임존 영향을 방지한다.
 */
export function getWeekLabel(monday: Date): string {
  const year = monday.getUTCFullYear();
  const month = monday.getUTCMonth() + 1;
  const weekOfMonth = Math.ceil(monday.getUTCDate() / 7);
  return `${year}년 ${month}월 ${weekOfMonth}주차`;
}
