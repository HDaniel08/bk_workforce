import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { ManagerDashboardPage } from "./pages/ManagerDashboardPage";
import { ManagerManagersAvailabilityPage } from "./pages/ManagerManagersAvailabilityPage";
import { ManagerMyAvailabilityPage } from "./pages/ManagerMyAvailabilityPage";
import { ManagerScheduleWritingPage } from "./pages/ManagerScheduleWritingPage";
import { ManagerSchedulesPage } from "./pages/ManagerSchedulesPage";
import { ManagerTeamAvailabilityPage } from "./pages/ManagerTeamAvailabilityPage";
import { ManagerTestEmailPage } from "./pages/ManagerTestEmailPage";
import { ManagerUsersPage } from "./pages/ManagerUsersPage";
import { ManagerVacationRequestsPage } from "./pages/ManagerVacationRequestsPage";
import { MyVacationRequestsPage } from "./pages/MyVacationRequestsPage";
import { MySchedulePage } from "./pages/MySchedulePage";
import { SuperadminAuditLogsPage } from "./pages/SuperadminAuditLogsPage";
import { SuperadminDashboardPage } from "./pages/SuperadminDashboardPage";
import { SuperadminDeletedUsersPage } from "./pages/SuperadminDeletedUsersPage";
import { SuperAdminLoginPage } from "./pages/SuperAdminLoginPage";
import { SuperadminTenantsPage } from "./pages/SuperadminTenantsPage";
import { SuperadminVacationRequestsPage } from "./pages/SuperadminVacationRequestsPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { WorkerAvailabilityPage } from "./pages/WorkerAvailabilityPage";
import { ChangePasswordRoute } from "./routes/ChangePasswordRoute";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { authStore } from "./store/auth-store";
import { getDashboardPath } from "./utils/auth-redirect";
import "./styles.css";

function RootRedirect() {
  const user = authStore.getUser();

  if (!authStore.isAuthenticated() || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Navigate to={getDashboardPath(user)} replace />;
}

const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/superadmin/login", element: <SuperAdminLoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    element: <ChangePasswordRoute />,
    children: [{ path: "/change-password", element: <ChangePasswordPage /> }]
  },
  {
    element: <AppLayout />,
    children: [
      {
        element: <ProtectedRoute area="ADMIN" />,
        children: [
          {
            path: "/superadmin",
            element: <SuperadminDashboardPage />
          },
          {
            path: "/superadmin/tenants",
            element: <SuperadminTenantsPage />
          },
          {
            path: "/superadmin/deleted-users",
            element: <SuperadminDeletedUsersPage />
          },
          {
            path: "/superadmin/audit-logs",
            element: <SuperadminAuditLogsPage />
          },
          {
            path: "/superadmin/vacation-requests",
            element: <SuperadminVacationRequestsPage />
          }
        ]
      },
      {
        element: <ProtectedRoute area="MANAGER" />,
        children: [
          {
            path: "/manager",
            element: <ManagerDashboardPage />
          },
          {
            path: "/manager/users",
            element: <ManagerUsersPage />
          },
          {
            path: "/manager/schedules",
            element: <ManagerSchedulesPage />
          },
          {
            path: "/manager/schedule-writing",
            element: <ManagerScheduleWritingPage />
          },
          {
            path: "/manager/schedule",
            element: <MySchedulePage />
          },
          {
            path: "/manager/availability",
            element: <ManagerTeamAvailabilityPage />
          },
          {
            path: "/manager/manager-availability",
            element: <ManagerManagersAvailabilityPage />
          },
          {
            path: "/manager/my-availability",
            element: <ManagerMyAvailabilityPage />
          },
          {
            path: "/manager/vacation-requests",
            element: <ManagerVacationRequestsPage />
          },
          {
            path: "/manager/my-vacation-requests",
            element: <MyVacationRequestsPage />
          },
          {
            path: "/manager/test-email",
            element: <ManagerTestEmailPage />
          }
        ]
      },
      {
        element: <ProtectedRoute area="WORKER" />,
        children: [
          {
            path: "/worker",
            element: <DashboardPage role="Worker" title="Worker dashboard" />
          },
          {
            path: "/worker/schedule",
            element: <MySchedulePage />
          },
          {
            path: "/worker/availability",
            element: <WorkerAvailabilityPage />
          },
          {
            path: "/worker/vacation-requests",
            element: <MyVacationRequestsPage />
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
