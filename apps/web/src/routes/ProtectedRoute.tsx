import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authStore } from "../store/auth-store";

type ProtectedArea = "ADMIN" | "MANAGER" | "WORKER";

interface ProtectedRouteProps {
  area: ProtectedArea;
}

export function ProtectedRoute({ area }: ProtectedRouteProps) {
  const location = useLocation();
  const user = authStore.getUser();

  if (!authStore.isAuthenticated() || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (area === "ADMIN" && user.role !== "ADMIN") {
    return <Navigate to="/login" replace />;
  }

  if (
    area === "MANAGER" &&
    (user.role !== "EMPLOYEE" || user.employeeSubRole !== "MANAGER")
  ) {
    return <Navigate to="/login" replace />;
  }

  if (
    area === "WORKER" &&
    (user.role !== "EMPLOYEE" || user.employeeSubRole !== "WORKER")
  ) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
