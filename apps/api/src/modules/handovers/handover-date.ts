const HANDOVER_TIME_ZONE = "Europe/Budapest";

function datePartsInBudapest(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HANDOVER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour"))
  };
}

export function addDateOnlyDays(value: string, days: number) {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

export function getCurrentHandoverDate(now = new Date()) {
  const local = datePartsInBudapest(now);
  return local.hour < 6 ? addDateOnlyDays(local.date, -1) : local.date;
}

export function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateOnly(date) !== value) {
    throw new Error("INVALID_DATE");
  }
  return date;
}

export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

