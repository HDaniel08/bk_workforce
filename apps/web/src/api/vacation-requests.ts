import { api } from "../lib/api";
import type { ContractHours, EmployeeSubRole, WorkerType } from "../store/auth-store";

export type VacationRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface VacationRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  requesterUserId: string;
  requesterName: string;
  reviewedByUserId: string | null;
  reviewerName: string | null;
  startDate: string;
  endDate: string;
  status: VacationRequestStatus;
  reason: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    workerType: WorkerType | null;
    employeeSubRole: EmployeeSubRole | null;
    contractHours: ContractHours | null;
  };
}

export type VacationRequestPayload = {
  startDate: string;
  endDate: string;
  reason?: string;
};

export async function getMyVacationRequests(params?: Record<string, string>) {
  const response = await api.get<VacationRequest[]>("/vacation-requests/me", {
    params
  });
  return response.data;
}

export async function createVacationRequest(payload: VacationRequestPayload) {
  const response = await api.post<VacationRequest>("/vacation-requests/me", payload);
  return response.data;
}

export async function cancelVacationRequest(id: string) {
  const response = await api.post<VacationRequest>(
    `/vacation-requests/${id}/cancel`
  );
  return response.data;
}

export async function getVacationRequests(params?: Record<string, string>) {
  const response = await api.get<VacationRequest[]>("/vacation-requests", {
    params
  });
  return response.data;
}

export async function approveVacationRequest(
  id: string,
  payload: { reviewerNote?: string }
) {
  const response = await api.post<VacationRequest>(
    `/vacation-requests/${id}/approve`,
    payload
  );
  return response.data;
}

export async function rejectVacationRequest(
  id: string,
  payload: { reviewerNote?: string }
) {
  const response = await api.post<VacationRequest>(
    `/vacation-requests/${id}/reject`,
    payload
  );
  return response.data;
}
