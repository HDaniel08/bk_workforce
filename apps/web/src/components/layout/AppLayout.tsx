import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { authStore } from "../../store/auth-store";

const adminItems = [
  { to: "/superadmin", label: "Dashboard" },
  { to: "/superadmin/tenants", label: "Tenantok" },
  { to: "/superadmin/audit-logs", label: "Audit" }
];

const managerItems = [
  { to: "/manager", label: "Dashboard" },
  { to: "/manager/users", label: "Dolgozók" },
  { to: "/manager/availability", label: "Csapat ráérés" },
  { to: "/manager/schedule-writing", label: "Beosztásírás" },
  { to: "/manager/manager-availability", label: "Manager ráérés" },
  { to: "/manager/my-availability", label: "Saját ráérés" },
  { to: "/manager/vacation-requests", label: "Szabadságkérelmek" },
  { to: "/manager/my-vacation-requests", label: "Saját szabadság" },
  { to: "/manager/test-email", label: "Teszt email" }
];

const workerItems = [
  { to: "/worker", label: "Dashboard" },
  { to: "/worker/availability", label: "Ráérésem" },
  { to: "/worker/vacation-requests", label: "Szabadság" }
];

export function AppLayout() {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const items =
    user?.role === "ADMIN"
      ? adminItems
      : user?.employeeSubRole === "MANAGER"
        ? managerItems
        : workerItems;
  const userName = user ? `${user.firstName} ${user.lastName}` : "BK Workforce";

  function handleLogout() {
    authStore.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-cream text-brown md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-brown/10 bg-white/70 p-5 md:block">
        <p className="text-xs font-bold uppercase tracking-wide text-red">BK Workforce</p>
        <h1 className="mt-1 text-xl font-bold">{userName}</h1>
        <nav className="mt-8 space-y-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/superadmin" || item.to === "/manager"}
              className={({ isActive }) =>
                [
                  "block rounded-md px-3 py-2 text-sm font-bold transition",
                  isActive ? "bg-brown text-cream" : "hover:bg-cream"
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Button className="mt-8 w-full" variant="ghost" onClick={handleLogout}>
          Kijelentkezés
        </Button>
      </aside>

      <div className="pb-20 md:pb-0">
        <main className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid auto-cols-fr grid-flow-col gap-1 overflow-x-auto border-t border-brown/10 bg-white p-2 md:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/superadmin" || item.to === "/manager"}
            className={({ isActive }) =>
              [
                "rounded-md px-2 py-2 text-center text-xs font-bold",
                isActive ? "bg-brown text-cream" : "text-brown"
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

