export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getWeekStart(date: Date) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  return result;
}

export function getWeekEnd(date: Date) {
  const result = new Date(getWeekStart(date));
  result.setUTCDate(result.getUTCDate() + 6);
  return result;
}

export function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function getMonthEnd(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function generateWeekDays(weekStartDate: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStartDate);
    date.setUTCDate(weekStartDate.getUTCDate() + index);
    return date;
  });
}

export function generateMonthDays(monthStartDate: Date) {
  const end = getMonthEnd(monthStartDate);
  const dayCount = end.getUTCDate();
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(monthStartDate);
    date.setUTCDate(index + 1);
    return date;
  });
}
