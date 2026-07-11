import { api } from "../lib/api";
import type {
  ContractHours,
  EmployeeSubRole,
  WorkerType
} from "../store/auth-store";

export type AvailabilityPeriodType = "WEEKLY" | "MONTHLY";
export type AvailabilityStatus = "DRAFT" | "SUBMITTED" | "LOCKED";
export type AvailabilityDayType = "OFF" | "VACATION" | "WORK";
export type WorkPreference = "ANYTIME" | "TIME_RANGE";

export interface AvailabilityDay {
  date: string;
  type: AvailabilityDayType;
  workPreference: WorkPreference | null;
  startTime: string | null;
  endTime: string | null;
  note: string;
}

export interface AvailabilityPayload {
  periodType: AvailabilityPeriodType;
  weekStartDate: string | null;
  monthStartDate: string | null;
  days: AvailabilityDay[];
}

export interface MyAvailabilityResponse {
  period: {
    type: AvailabilityPeriodType;
    startDate: string;
    endDate: string;
  };
  availability: {
    status: AvailabilityStatus;
    submittedAt: string | null;
    days: AvailabilityDay[];
  };
}

export interface TeamAvailabilityResponse {
  period: MyAvailabilityResponse["period"];
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeSubRole: EmployeeSubRole | null;
    workerType: WorkerType | null;
    contractHours: ContractHours | null;
    availability: MyAvailabilityResponse["availability"];
  }>;
}

export interface MissingAvailabilityUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AvailabilitySubmissionWeek {
  weekStartDate: string;
  status: "OPEN" | "CLOSED" | null;
  openedAt: string | null;
  closedAt: string | null;
}

export async function getMyAvailability(params: Record<string, string>) {
  const response = await api.get<MyAvailabilityResponse>("/availability/me", {
    params
  });
  return response.data;
}

export async function getOpenAvailabilitySubmissionWeeks() {
  const response = await api.get<AvailabilitySubmissionWeek[]>(
    "/availability/open-submission-weeks"
  );
  return response.data;
}

export async function getClosedAvailabilitySubmissionWeeks() {
  const response = await api.get<AvailabilitySubmissionWeek[]>(
    "/availability/closed-submission-weeks"
  );
  return response.data;
}

export async function saveMyAvailabilityDraft(payload: AvailabilityPayload) {
  const response = await api.post<MyAvailabilityResponse>(
    "/availability/me/save-draft",
    payload
  );
  return response.data;
}

export async function submitMyAvailability(payload: AvailabilityPayload) {
  const response = await api.post<MyAvailabilityResponse>(
    "/availability/me/submit",
    payload
  );
  return response.data;
}

export async function getTeamAvailability(params: Record<string, string>) {
  const response = await api.get<TeamAvailabilityResponse>("/availability/team", {
    params
  });
  return response.data;
}

export async function updateTeamAvailabilityDay(
  userId: string,
  payload: {
    periodType?: AvailabilityPeriodType;
    weekStartDate?: string | null;
    monthStartDate?: string | null;
    day: AvailabilityDay;
  }
) {
  const response = await api.post<MyAvailabilityResponse>(
    `/availability/team/${userId}/day`,
    payload
  );
  return response.data;
}

export async function getRequiredMissingAvailability(params: {
  weekStartDate: string;
}) {
  const response = await api.get<MissingAvailabilityUser[]>(
    "/availability/required-missing",
    { params }
  );
  return response.data;
}

export async function getAvailabilitySubmissionWeek(params: {
  weekStartDate: string;
}) {
  const response = await api.get<AvailabilitySubmissionWeek>(
    "/availability/submission-week",
    { params }
  );
  return response.data;
}

export async function openAvailabilitySubmissionWeek(payload: {
  weekStartDate: string;
}) {
  const response = await api.post<AvailabilitySubmissionWeek>(
    "/availability/submission-week/open",
    payload
  );
  return response.data;
}

export async function closeAvailabilitySubmissionWeek(payload: {
  weekStartDate: string;
}) {
  const response = await api.post<AvailabilitySubmissionWeek>(
    "/availability/submission-week/close",
    payload
  );
  return response.data;
}
