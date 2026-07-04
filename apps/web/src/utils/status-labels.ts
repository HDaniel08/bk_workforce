import type { AvailabilityStatus } from "../api/availability";
import type { ScheduleWeekStatus } from "../api/schedules";
import type { VacationRequestStatus } from "../api/vacation-requests";
import type { EmployeeSubRole, UserRole, WorkerType } from "../store/auth-store";

export function availabilityStatusLabel(status: AvailabilityStatus | string) {
  const labels: Record<AvailabilityStatus, string> = {
    DRAFT: "Piszkozat",
    SUBMITTED: "Leadva",
    LOCKED: "Lezárva"
  };
  return labels[status as AvailabilityStatus] ?? status;
}

export function submissionWeekStatusLabel(status: "OPEN" | "CLOSED" | null) {
  if (status === "OPEN") return "Megnyitva";
  if (status === "CLOSED") return "Lezárva";
  return "Nincs megnyitva";
}

export function vacationRequestStatusLabel(status: VacationRequestStatus) {
  const labels: Record<VacationRequestStatus, string> = {
    PENDING: "Függőben",
    APPROVED: "Elfogadva",
    REJECTED: "Elutasítva",
    CANCELLED: "Visszavonva"
  };
  return labels[status];
}

export function scheduleWeekStatusLabel(status: ScheduleWeekStatus) {
  const labels: Record<ScheduleWeekStatus, string> = {
    DRAFT: "Piszkozat",
    PUBLISHED: "Közzétéve",
    LOCKED: "Lezárva"
  };
  return labels[status];
}

export function employeeSubRoleLabel(role: EmployeeSubRole | UserRole | null) {
  if (role === "MANAGER") return "Manager";
  if (role === "WORKER") return "Dolgozó";
  if (role === "ADMIN") return "Szuperadmin";
  if (role === "EMPLOYEE") return "Munkatárs";
  return "";
}

export function workerTypeLabel(workerType: WorkerType | null) {
  if (workerType === "FULL_TIME") return "Állandós";
  if (workerType === "STUDENT") return "Diák";
  return "";
}
