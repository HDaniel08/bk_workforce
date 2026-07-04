export function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekStartDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  return formatDateOnly(now);
}

export function getWeekDates(startDate: string) {
  const parts = startDate.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const start = new Date(year, month - 1, day);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatDateOnly(date);
  });
}

export function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthWeeks(monthStartDate: string) {
  const parts = monthStartDate.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const firstWeekStart = new Date(monthStart);
  const firstDay = firstWeekStart.getDay();
  const diff = firstDay === 0 ? -6 : 1 - firstDay;
  firstWeekStart.setDate(firstWeekStart.getDate() + diff);

  const weeks: Array<Array<string | null>> = [];
  const current = new Date(firstWeekStart);
  while (current <= monthEnd || weeks.length === 0) {
    const week = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(current);
      date.setDate(current.getDate() + index);
      return date.getMonth() === monthStart.getMonth() ? formatDateOnly(date) : null;
    });
    weeks.push(week);
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}
