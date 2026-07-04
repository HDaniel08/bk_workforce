import { api } from "../lib/api";
import type { ContractHours, EmployeeSubRole, WorkerType } from "../store/auth-store";

export interface ManagedUser {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: "ADMIN" | "EMPLOYEE";
  employeeSubRole: EmployeeSubRole | null;
  workerType: WorkerType | null;
  contractHours: ContractHours | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export type UserInput = {
  tenantId?: string;
  email?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  employeeSubRole: EmployeeSubRole;
  workerType?: WorkerType;
  contractHours: ContractHours;
  isActive?: boolean;
};

export async function getUsers(params?: Record<string, string>) {
  const response = await api.get<ManagedUser[]>("/users", { params });
  return response.data;
}

export async function createUser(input: UserInput) {
  const response = await api.post<ManagedUser>("/users", input);
  return response.data;
}

export async function updateUser(id: string, input: Partial<UserInput>) {
  const response = await api.patch<ManagedUser>(`/users/${id}`, input);
  return response.data;
}
