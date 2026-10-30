import { api } from "../lib/api";

export type ManagerDayKind = "WORK" | "REST" | "VACATION" | "SICK_LEAVE";
export type ManagerMonthStatus = "DRAFT" | "PUBLISHED";
export type ManagerContractHours = "HOURS_4" | "HOURS_6" | "HOURS_8";
export type ManagerPerson = { id: string; firstName: string; lastName: string; isStandInManager?: boolean; contractHours?: ManagerContractHours | null };
export type ManagerScheduleWeek = { weekStart: string; status: ManagerMonthStatus };
export type ManagerDayRequest = { userId: string; date: string; kind: ManagerDayKind; note: string | null };
export type ManagerScheduleDay = ManagerDayRequest & { startTime: string | null; endTime: string | null; paidMinutes: number };
export type ManagerVacation = { id: string; requesterUserId: string; startDate: string; endDate: string; status: "PENDING" | "APPROVED"; reason: string | null };
export type ManagerBalance = { userId: string; currentMinutes: number; expectedCurrentMinutes: number; currentRestDays: number; monthDifferenceMinutes: number; cycleDifferenceMinutes: number };
export type ManagerMonth = {
  month: string;
  status: ManagerMonthStatus;
  isOwner: boolean;
  ownerId: string | null;
  expectedWorkDays: number;
  expectedRestDays: number;
  cycleStart: string;
  cycleEnd: string;
  weeks: ManagerScheduleWeek[];
  managers: ManagerPerson[];
  days: ManagerScheduleDay[];
  contextDays: ManagerScheduleDay[];
  requests: ManagerDayRequest[];
  vacations: ManagerVacation[];
  balance: ManagerBalance[];
};
export type ManagerWeek = { weekStart: string; managers: ManagerPerson[]; days: Array<Pick<ManagerScheduleDay, "userId" | "date" | "kind" | "startTime" | "endTime" | "note">> };

export type ManagerProfile = { ownerId: string | null; isOwner: boolean; managers: ManagerPerson[] };

export async function getManagerProfile() {
  return (await api.get<ManagerProfile>("/manager-schedules/profile")).data;
}

export async function transferManagerScheduleOwner(userId: string) {
  return (await api.patch<{ ownerId: string }>("/manager-schedules/owner", { userId })).data;
}

export async function assignManagerScheduleOwner(tenantId: string, userId: string) {
  return (await api.patch<{ ownerId: string }>(`/manager-schedules/tenants/${tenantId}/owner`, { userId })).data;
}

export async function hasManagerRequestCollision(date: string) {
  return (await api.get<{ exists: boolean }>("/manager-schedules/collision", { params: { date } })).data.exists;
}

export async function hasManagerRequestCollisionInRange(from: string, to: string) {
  return (await api.get<{ exists: boolean }>("/manager-schedules/collision-range", { params: { from, to } })).data.exists;
}

export async function getMyManagerRequests(month: string) {
  return (await api.get<ManagerDayRequest[]>("/manager-schedules/requests/me", { params: { month } })).data;
}

export async function saveMyManagerRequest(input: { date: string; kind: "WORK" | "REST"; note: string }) {
  return (await api.post<ManagerDayRequest>("/manager-schedules/requests/me", input)).data;
}

export async function removeMyManagerRequest(date: string) {
  return (await api.delete(`/manager-schedules/requests/me/${date}`)).data;
}

export async function getManagerMonth(month: string) {
  return (await api.get<ManagerMonth>(`/manager-schedules/months/${month}`)).data;
}

export async function getManagerWeek(weekStart: string) {
  return (await api.get<ManagerWeek>(`/manager-schedules/weeks/${weekStart}`)).data;
}

export async function setManagerMonthTargets(month: string, expectedWorkDays: number, expectedRestDays: number) {
  return (await api.patch(`/manager-schedules/months/${month}/targets`, { expectedWorkDays, expectedRestDays })).data;
}

export async function setManagerScheduleDay(month: string, input: { userId: string; date: string; kind: ManagerDayKind; startTime?: string; endTime?: string; note?: string }) {
  return (await api.patch(`/manager-schedules/months/${month}/day`, input)).data;
}

export async function setManagerMonthStatus(month: string, status: ManagerMonthStatus) {
  return (await api.post(`/manager-schedules/months/${month}/${status === "PUBLISHED" ? "publish" : "reopen"}`)).data;
}

export async function setManagerWeekStatus(month: string, weekStart: string, status: ManagerMonthStatus) {
  return (await api.post(`/manager-schedules/months/${month}/weeks/${weekStart}/${status === "PUBLISHED" ? "publish" : "reopen"}`)).data;
}
