import type { AuthUser } from "../store/auth-store";

export function getDashboardPath(user: AuthUser) {
  if (user.role === "ADMIN") {
    return "/superadmin";
  }

  if (user.employeeSubRole === "MANAGER") {
    return "/manager";
  }

  return "/worker";
}
