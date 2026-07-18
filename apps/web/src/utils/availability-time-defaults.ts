import type { AvailabilityDay } from "../api/availability";

export type MissingTimeBoundary = "start" | "end";

export const DEFAULT_AVAILABILITY_START_TIME = "07:00";
export const DEFAULT_AVAILABILITY_END_TIME = "01:00";

export function getMissingTimeBoundary(days: AvailabilityDay[]) {
  const timeRangeDays = days.filter(
    (day) => day.type === "WORK" && day.workPreference === "TIME_RANGE"
  );

  if (timeRangeDays.some((day) => !day.startTime)) {
    return "start" as const;
  }

  if (timeRangeDays.some((day) => !day.endTime)) {
    return "end" as const;
  }

  return null;
}

export function fillMissingTimeBoundary(
  days: AvailabilityDay[],
  boundary: MissingTimeBoundary
) {
  return days.map((day) => {
    if (day.type !== "WORK" || day.workPreference !== "TIME_RANGE") {
      return day;
    }

    if (boundary === "start" && !day.startTime) {
      return { ...day, startTime: DEFAULT_AVAILABILITY_START_TIME };
    }

    if (boundary === "end" && !day.endTime) {
      return { ...day, endTime: DEFAULT_AVAILABILITY_END_TIME };
    }

    return day;
  });
}
