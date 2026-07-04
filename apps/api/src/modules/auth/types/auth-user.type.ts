import type { EmployeeSubRole, UserRole, WorkerType } from "@prisma/client";

export interface AuthUser {
  id: string;
  tenantId: string | null;
  role: UserRole;
  employeeSubRole: EmployeeSubRole | null;
  workerType: WorkerType | null;
}
