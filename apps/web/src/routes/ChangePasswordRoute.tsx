import { Navigate, Outlet } from "react-router-dom";
import { authStore } from "../store/auth-store";

export function ChangePasswordRoute() {
  if (!authStore.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
