export type UserRole = "ADMIN" | "EMPLOYEE";
export type EmployeeSubRole = "MANAGER" | "WORKER";
export type WorkerType = "STUDENT" | "FULL_TIME";

export interface HealthResponse {
  status: "ok";
}
