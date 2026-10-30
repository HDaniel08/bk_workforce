import type { ManagerScheduleDay } from "../api/manager-schedules";

function minutes(value: string | null) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

function addWarning(result: Record<string, string[]>, userId: string, date: string, message: string) {
  const key = `${userId}:${date}`;
  result[key] ??= [];
  if (!result[key].includes(message)) result[key].push(message);
}

export function managerScheduleWarnings(days: ManagerScheduleDay[], month?: string, standInManagerIds: ReadonlySet<string> = new Set(), contractMinutesByUserId: ReadonlyMap<string, number> = new Map()) {
  const result: Record<string, string[]> = {};
  const byUser = new Map<string, ManagerScheduleDay[]>();
  for (const day of days) {
    if (day.kind !== "WORK") continue;
    byUser.set(day.userId, [...(byUser.get(day.userId) ?? []), day]);
  }

  for (const [userId, userDays] of byUser) {
    userDays.sort((left, right) => left.date.localeCompare(right.date));
    if (month && standInManagerIds.has(userId)) {
      const monthDays = userDays.filter((day) => day.date.startsWith(month));
      if (monthDays.length > 4) {
        for (const day of monthDays) addWarning(result, userId, day.date, `${monthDays.length} beugrós manager munkanap ebben a hónapban (maximum 4 ajánlott).`);
      }
    }
    let streak: ManagerScheduleDay[] = [];
    const finishStreak = () => {
      if (streak.length > 5) {
        for (const day of streak) addWarning(result, userId, day.date, `${streak.length} munkanap egyhuzamban (maximum 5 ajánlott).`);
      }
      streak = [];
    };

    for (const day of userDays) {
      const previous = streak.at(-1);
      if (previous) {
        const nextDate = new Date(`${previous.date}T00:00:00Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        if (nextDate.toISOString().slice(0, 10) !== day.date) finishStreak();
      }
      streak.push(day);
    }
    finishStreak();

    let previousEnd: number | null = null;
    for (const day of userDays) {
      const start = minutes(day.startTime);
      const end = minutes(day.endTime);
      if (start === null || end === null) { previousEnd = null; continue; }
      const dateStart = Date.parse(`${day.date}T00:00:00Z`) / 60000;
      const shiftStart = dateStart + start;
      const shiftEnd = dateStart + end + (end <= start ? 1440 : 0);
      const duration = shiftEnd - shiftStart;
      const expectedWorkMinutes = contractMinutesByUserId.get(userId) ?? 480;
      const expectedDuration = expectedWorkMinutes + 60;
      if (duration !== expectedDuration) addWarning(result, userId, day.date, `A műszak ${duration / 60} óra; a profil szerint ${expectedWorkMinutes / 60} óra munka + 1 óra szünet az elvárt.`);
      if (previousEnd !== null && shiftStart - previousEnd < 600) {
        const rest = (shiftStart - previousEnd) / 60;
        addWarning(result, userId, day.date, `Csak ${rest} óra pihenő van az előző műszak után (minimum 10 óra).`);
      }
      previousEnd = shiftEnd;
    }
  }

  return result;
}
