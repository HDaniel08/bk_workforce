import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { authStore } from "../store/auth-store";

const navigationItems = [
  { to: "/superadmin", label: "Superadmin" },
  { to: "/manager", label: "Manager" },
  { to: "/worker", label: "Worker" }
];

export function AppShell() {
  const navigate = useNavigate();

  function handleLogout() {
    authStore.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-cream text-brown">
      <header className="sticky top-0 z-10 border-b border-brown/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red">
              BK Workforce
            </p>
            <h1 className="text-xl font-bold">Munkaerő kezelő</h1>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <nav className="flex gap-2">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition",
                      isActive
                        ? "bg-brown text-cream"
                        : "bg-white/70 text-brown hover:bg-white"
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              className="whitespace-nowrap rounded-md bg-red px-3 py-2 text-sm font-bold text-cream transition hover:bg-brown"
              type="button"
              onClick={handleLogout}
            >
              Kijelentkezés
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}

