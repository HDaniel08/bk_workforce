import { api } from "../lib/api";
import type { ContractHours, EmployeeSubRole, WorkerType } from "../store/auth-store";

export type ScheduleWeekStatus = "DRAFT" | "PUBLISHED" | "LOCKED";

export interface ScheduleUser {
  id: string;
  firstName: string;
  lastName: string;
  workerType: WorkerType | null;
  employeeSubRole: EmployeeSubRole | null;
  contractHours: ContractHours | null;
}

export interface ShiftAssignment {
  id: string;
  userId: string;
  user: ScheduleUser;
}

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string | null;
  note: string | null;
  assignments: ShiftAssignment[];
}

export interface ScheduleWeek {
  id: string;
  tenantId: string;
  weekStartDate: string;
  status: ScheduleWeekStatus;
  publishedAt: string | null;
  lockedAt: string | null;
  createdByUserId: string | null;
  shifts: Shift[];
}

export interface MyScheduleResponse {
  weekStartDate: string;
  status: ScheduleWeekStatus | null;
  shifts: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    label: string | null;
    note: string | null;
    scheduleWeekStatus: ScheduleWeekStatus;
  }>;
}

export type ShiftPayload = {
  date: string;
  startTime: string;
  endTime: string;
  label?: string;
  note?: string;
};

export async function getScheduleWeeks(params?: Record<string, string>) {
  const response = await api.get<ScheduleWeek[]>("/schedules/weeks", { params });
  return response.data;
}

export async function createScheduleWeek(payload: { weekStartDate: string }) {
  const response = await api.post<ScheduleWeek>("/schedules/weeks", payload);
  return response.data;
}

export async function getScheduleWeek(id: string) {
  const response = await api.get<ScheduleWeek>(`/schedules/weeks/${id}`);
  return response.data;
}

export async function createShift(weekId: string, payload: ShiftPayload) {
  const response = await api.post<Shift>(`/schedules/weeks/${weekId}/shifts`, payload);
  return response.data;
}

export async function updateShift(shiftId: string, payload: Partial<ShiftPayload>) {
  const response = await api.patch<Shift>(`/schedules/shifts/${shiftId}`, payload);
  return response.data;
}

export async function deleteShift(shiftId: string) {
  const response = await api.delete<{ success: true }>(`/schedules/shifts/${shiftId}`);
  return response.data;
}

export async function assignShift(shiftId: string, payload: { userId: string }) {
  const response = await api.post<ShiftAssignment>(
    `/schedules/shifts/${shiftId}/assign`,
    payload
  );
  return response.data;
}

export async function unassignShift(assignmentId: string) {
  const response = await api.delete<{ success: true }>(
    `/schedules/assignments/${assignmentId}`
  );
  return response.data;
}

export async function publishScheduleWeek(id: string) {
  const response = await api.post<ScheduleWeek>(`/schedules/weeks/${id}/publish`);
  return response.data;
}

export async function lockScheduleWeek(id: string) {
  const response = await api.post<ScheduleWeek>(`/schedules/weeks/${id}/lock`);
  return response.data;
}

export async function getMySchedule(params?: Record<string, string>) {
  const response = await api.get<MyScheduleResponse>("/schedules/me", { params });
  return response.data;
}
