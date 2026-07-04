import { SetMetadata } from "@nestjs/common";
import type { EmployeeSubRole, UserRole } from "@prisma/client";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Array<UserRole | EmployeeSubRole>) =>
  SetMetadata(ROLES_KEY, roles);
