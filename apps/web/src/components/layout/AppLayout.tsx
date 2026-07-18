import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { authStore } from "../../store/auth-store";
import { useState } from "react";
import { useLocation } from "react-router-dom";

const adminItems = [
  { to: "/superadmin", label: "Dashboard" },
  { to: "/superadmin/tenants", label: "Tenantok" },
  { to: "/superadmin/deleted-users", label: "Törölt dolgozók" },
  { to: "/superadmin/audit-logs", label: "Audit" }
];

const managerItems = [
  { to: "/manager", label: "Dashboard" },
  { to: "/manager/users", label: "Dolgozók" },
  { to: "/manager/availability", label: "Csapat ráérés" },
  // { to: "/manager/schedule-writing", label: "Beosztásírás" },
  { to: "/manager/manager-availability", label: "Manager ráérés" },
  { to: "/manager/my-availability", label: "Saját ráérés" },
  { to: "/manager/vacation-requests", label: "Szabadságkérelmek" },
  { to: "/manager/my-vacation-requests", label: "Saját szabadság" },
  // { to: "/manager/test-email", label: "Teszt email" }
];

const workerItems = [
  { to: "/worker", label: "Dashboard" },
  { to: "/worker/availability", label: "Ráérésem" },
  { to: "/worker/vacation-requests", label: "Szabadság" }
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const user = authStore.getUser();
  const items =
    user?.role === "ADMIN"
      ? adminItems
      : user?.employeeSubRole === "MANAGER"
        ? managerItems
        : workerItems;
  const userName = user ? `${user.lastName} ${user.firstName}` : "BK Workforce";
  const hasMoreMenu = items.length > 5;
  const bottomItems = hasMoreMenu ? items.slice(0, 4) : items;
  const moreItems = hasMoreMenu ? items.slice(4) : [];
  const isMoreItemActive = moreItems.some(
    (item) =>
      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
  );

  function handleLogout() {
    authStore.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className={[
        "min-h-screen bg-cream text-brown md:grid md:transition-[grid-template-columns] md:duration-200",
        isDesktopSidebarOpen
          ? "md:grid-cols-[240px_1fr]"
          : "md:grid-cols-[0_1fr]"
      ].join(" ")}
    >
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-brown/10 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-red">BK Workforce</p>
          <p className="truncate text-sm font-bold">{userName}</p>
        </div>
        <Button className="shrink-0" variant="ghost" onClick={handleLogout}>
          Kijelentkezés
        </Button>
      </header>

      <aside
        className={[
          "hidden overflow-hidden bg-white/70 md:block",
          isDesktopSidebarOpen
            ? "border-r border-brown/10 p-5"
            : "border-r-0 p-0"
        ].join(" ")}
      >
        <div className="min-w-[199px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-red">
                BK Workforce
              </p>
              <h1 className="mt-1 truncate text-xl font-bold">{userName}</h1>
            </div>
            <button
              type="button"
              aria-label="Oldalsó navigáció becsukása"
              aria-expanded={isDesktopSidebarOpen}
              title="Oldalsáv becsukása"
              className="shrink-0 rounded-md px-2 py-1 text-lg font-bold transition hover:bg-cream"
              onClick={() => setIsDesktopSidebarOpen(false)}
            >
              ←
            </button>
          </div>
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
        </div>
      </aside>

      <div className="pb-20 md:pb-0">
        {!isDesktopSidebarOpen ? (
          <div className="hidden px-4 pt-4 md:block">
            <button
              type="button"
              aria-label="Oldalsó navigáció kinyitása"
              aria-expanded={isDesktopSidebarOpen}
              className="rounded-md bg-white px-3 py-2 text-sm font-bold shadow-soft transition hover:bg-brown hover:text-cream"
              onClick={() => setIsDesktopSidebarOpen(true)}
            >
              ☰ Menü megnyitása
            </button>
          </div>
        ) : null}
        <main className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      {isMoreMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="További menü bezárása"
            className="fixed inset-0 z-30 bg-brown/30 md:hidden"
            onClick={() => setIsMoreMenuOpen(false)}
          />
          <div className="fixed inset-x-3 bottom-20 z-40 max-h-[60vh] overflow-y-auto rounded-xl border border-brown/10 bg-white p-3 shadow-xl md:hidden">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="font-bold">További menüpontok</p>
              <button
                type="button"
                className="rounded-md px-3 py-1 text-sm font-bold hover:bg-cream"
                onClick={() => setIsMoreMenuOpen(false)}
              >
                Bezárás
              </button>
            </div>
            <nav className="grid gap-1 sm:grid-cols-2">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-3 text-sm font-bold transition",
                      isActive ? "bg-brown text-cream" : "hover:bg-cream"
                    ].join(" ")
                  }
                  onClick={() => setIsMoreMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      ) : null}

      <nav
        className={`fixed inset-x-0 bottom-0 z-20 grid gap-1 border-t border-brown/10 bg-white p-2 md:hidden ${
          hasMoreMenu ? "grid-cols-5" : "auto-cols-fr grid-flow-col"
        }`}
      >
        {bottomItems.map((item) => (
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
        {hasMoreMenu ? (
          <button
            type="button"
            aria-expanded={isMoreMenuOpen}
            className={[
              "rounded-md px-1 py-2 text-center text-xs font-bold",
              isMoreMenuOpen || isMoreItemActive ? "bg-brown text-cream" : "text-brown"
            ].join(" ")}
            onClick={() => setIsMoreMenuOpen((isOpen) => !isOpen)}
          >
            Továbbiak
          </button>
        ) : null}
      </nav>
    </div>
  );
}

