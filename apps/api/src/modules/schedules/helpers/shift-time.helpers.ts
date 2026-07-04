import { BadRequestException } from "@nestjs/common";

const dayMs = 24 * 60 * 60 * 1000;

export function parseShiftDateTime(date: Date, time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  const result = new Date(date);
  result.setUTCHours(Number(hours), Number(minutes), 0, 0);
  return result;
}

export function getShiftStartEndDateTime(
  date: Date,
  startTime: string,
  endTime: string
) {
  const start = parseShiftDateTime(date, startTime);
  let end = parseShiftDateTime(date, endTime);

  if (end <= start) {
    end = new Date(end.getTime() + dayMs);
  }

  return { start, end };
}

export function getShiftDurationHours(
  date: Date,
  startTime: string,
  endTime: string
) {
  const { start, end } = getShiftStartEndDateTime(date, startTime, endTime);
  return (end.getTime() - start.getTime()) / (60 * 60 * 1000);
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  return aStart < bEnd && bStart < aEnd;
}

export function hoursBetween(aEnd: Date, bStart: Date) {
  return Math.abs(bStart.getTime() - aEnd.getTime()) / (60 * 60 * 1000);
}

export function validateShiftTimeWindow(
  date: Date,
  startTime: string,
  endTime: string
) {
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
    throw new BadRequestException("INVALID_TIME_FORMAT");
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes < 7 * 60) {
    throw new BadRequestException("SHIFT_START_OUTSIDE_ALLOWED_WINDOW");
  }

  if (endMinutes > 60 && endMinutes < 7 * 60) {
    throw new BadRequestException("SHIFT_END_OUTSIDE_ALLOWED_WINDOW");
  }

  const duration = getShiftDurationHours(date, startTime, endTime);
  if (duration < 2) {
    throw new BadRequestException("SHIFT_TOO_SHORT");
  }
  if (duration > 12) {
    throw new BadRequestException("SHIFT_TOO_LONG");
  }
}

function timeToMinutes(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}
