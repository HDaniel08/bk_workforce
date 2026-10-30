import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { authStore } from "../../store/auth-store";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationsResponse
} from "../../api/notifications";

type NavigationLink = {
  to: string;
  label: string;
};

type NavigationItem =
  | NavigationLink
  | {
      label: string;
      children: NavigationLink[];
    };

const adminItems = [
  { to: "/superadmin", label: "Dashboard" },
  { to: "/superadmin/tenants", label: "Tenantok" },
  { to: "/superadmin/deleted-users", label: "Törölt dolgozók" },
  { to: "/superadmin/audit-logs", label: "Audit" }
];

const managerItems: NavigationItem[] = [
  { to: "/manager", label: "Dashboard" },
  { to: "/manager/handovers", label: "Átadó" },
  { to: "/manager/users", label: "Dolgozók" },
  { to: "/manager/profile", label: "Profil" },
  { to: "/manager/monthly-schedule", label: "Managerbeosztás" },
  {
    label: "Ráérések",
    children: [
      { to: "/manager/availability", label: "Csapat ráérés" },
      { to: "/manager/requests", label: "Managerkérelmeim" },
      { to: "/manager/vacation-requests", label: "Szabadságkérelmek" },
      { to: "/manager/my-vacation-requests", label: "Saját szabadság" }
    ]
  },
  {
    label: "Kimutatások",
    children: [
      {
        to: "/manager/reports/student-availability",
        label: "Diákráérés report"
      },
      {
        to: "/manager/reports/full-time-requests",
        label: "Állandós kérelem report"
      }
    ]
  }
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
  const isManagerMonthlySchedule = location.pathname === "/manager/monthly-schedule";
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<NavigationItem | null>(null);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(!isManagerMonthlySchedule);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationsResponse>({
    unreadCount: 0,
    items: []
  });
  const user = authStore.getUser();
  const items =
    user?.role === "ADMIN"
      ? adminItems
      : user?.employeeSubRole === "MANAGER"
        ? managerItems
        : user?.isStandInManager
          ? [...workerItems, { to: "/manager/monthly-schedule", label: "Managerbeosztás" }, { to: "/manager/handovers", label: "Átadó" }]
          : workerItems;
  const userName = user ? `${user.lastName} ${user.firstName}` : "BK Workforce";
  const hasMoreMenu = items.length > 5;
  const bottomItems = hasMoreMenu ? items.slice(0, 4) : items;
  const moreItems = hasMoreMenu ? items.slice(4) : [];
  const isMoreItemActive = moreItems.some(
    (item) => isNavigationItemActive(item, location.pathname)
  );

  useEffect(() => { setIsDesktopSidebarOpen(!isManagerMonthlySchedule); }, [isManagerMonthlySchedule]);

  useEffect(() => {
    const activeGroup = items.find(
      (item) => "children" in item && isNavigationItemActive(item, location.pathname)
    );

    if (activeGroup) {
      setOpenDesktopGroup(activeGroup.label);
    }
  }, [items, location.pathname]);

  const refreshNotifications = useCallback(async () => {
    try {
      setNotifications(await getNotifications());
    } catch {
      // A globális API interceptor kezeli a lejárt munkamenetet.
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();
    const intervalId = window.setInterval(() => void refreshNotifications(), 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshNotifications]);

  function handleLogout() {
    authStore.logout();
    navigate("/login", { replace: true });
  }

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) {
      await markNotificationRead(notification.id).catch(() => undefined);
    }
    setIsNotificationPanelOpen(false);
    await refreshNotifications();
    if (notification.handoverDate && notification.handoverPostId) {
      const params = new URLSearchParams({
        date: notification.handoverDate,
        post: notification.handoverPostId
      });
      if (notification.handoverReplyId) params.set("reply", notification.handoverReplyId);
      navigate(`/manager/handovers?${params.toString()}`);
    } else if (notification.scheduleMonth) {
      navigate(`/manager/monthly-schedule?month=${notification.scheduleMonth}`);
    }
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    await refreshNotifications();
  }

  function notificationButton() {
    return (
      <button
        type="button"
        className="fixed right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-cream/30 bg-brown text-cream shadow-xl transition hover:scale-105 hover:bg-red focus:outline-none focus:ring-2 focus:ring-red/30 md:right-6 md:top-5"
        aria-label={`Értesítések${notifications.unreadCount ? `, ${notifications.unreadCount} olvasatlan` : ""}`}
        title="Értesítések"
        onClick={() => setIsNotificationPanelOpen(true)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {notifications.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-cream bg-red px-1 text-[10px] font-black text-white">
            {notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      className={[
        "min-h-screen bg-cream text-brown",
        isManagerMonthlySchedule
          ? "md:block"
          : `md:grid md:transition-[grid-template-columns] md:duration-200 ${isDesktopSidebarOpen ? "md:grid-cols-[240px_1fr]" : "md:grid-cols-[0_1fr]"}`
      ].join(" ")}
    >
      {notificationButton()}
      {isManagerMonthlySchedule && isDesktopSidebarOpen ? <button type="button" aria-label="Oldalsó navigáció becsukása" className="fixed inset-0 z-30 hidden bg-brown/25 md:block" onClick={() => setIsDesktopSidebarOpen(false)} /> : null}

      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-brown/10 bg-white/95 px-4 py-3 pr-16 backdrop-blur md:hidden">
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
          isManagerMonthlySchedule
            ? `md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-60 md:overflow-y-auto md:bg-white md:p-5 md:shadow-xl md:transition-transform md:duration-200 ${isDesktopSidebarOpen ? "md:translate-x-0" : "md:pointer-events-none md:-translate-x-full"}`
            : isDesktopSidebarOpen
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
            <div className="flex items-center gap-1">
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
          </div>
          <nav className="mt-8 space-y-2">
            {items.map((item) => {
              if (!("children" in item)) {
                return (
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
                );
              }

              const isOpen = openDesktopGroup === item.label;
              const isActive = isNavigationItemActive(item, location.pathname);

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className={[
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-bold transition",
                      isActive ? "bg-brown text-cream" : "hover:bg-cream"
                    ].join(" ")}
                    onClick={() => setOpenDesktopGroup(isOpen ? null : item.label)}
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen ? (
                    <div className="mt-1 space-y-1 border-l-2 border-brown/10 pl-3">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive: isChildActive }) =>
                            [
                              "block rounded-md px-3 py-2 text-sm font-semibold transition",
                              isChildActive
                                ? "bg-brown/10 text-red"
                                : "hover:bg-cream"
                            ].join(" ")
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
          <Button className="mt-8 w-full" variant="ghost" onClick={handleLogout}>
            Kijelentkezés
          </Button>
        </div>
      </aside>

      <div className="min-w-0 pb-20 md:pb-0">
        {!isDesktopSidebarOpen ? (
          <div className={isManagerMonthlySchedule ? "fixed left-3 top-3 z-30 hidden items-center gap-2 md:flex" : "hidden items-center gap-2 px-4 pt-4 md:flex"}>
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
        <main className={isManagerMonthlySchedule ? "mx-auto w-full min-w-0 max-w-none px-3 py-5 md:px-6 md:pb-8 md:pt-16" : "mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8"}>
          <Outlet />
        </main>
      </div>

      {isNotificationPanelOpen ? (
        <>
          <button
            type="button"
            aria-label="Értesítések bezárása"
            className="fixed inset-0 z-40 bg-brown/30"
            onClick={() => setIsNotificationPanelOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl" aria-label="Értesítések">
            <div className="flex items-center justify-between gap-3 border-b border-brown/10 px-4 py-4">
              <div>
                <h2 className="text-xl font-black">Értesítések</h2>
                <p className="text-xs text-brown/55">{notifications.unreadCount} olvasatlan</p>
              </div>
              <button type="button" className="rounded-md px-3 py-2 text-sm font-bold hover:bg-cream" onClick={() => setIsNotificationPanelOpen(false)}>Bezárás</button>
            </div>
            {notifications.unreadCount > 0 ? (
              <div className="border-b border-brown/10 px-4 py-2 text-right">
                <button type="button" className="text-xs font-bold text-red hover:underline" onClick={() => void markAllRead()}>Mind olvasott</button>
              </div>
            ) : null}
            <div className="flex-1 overflow-y-auto">
              {notifications.items.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="font-bold">Nincs értesítésed.</p>
                  <p className="mt-1 text-sm text-brown/55">Az új megjelölések, válaszok és managerbeosztások itt jelennek meg.</p>
                </div>
              ) : (
                <>
                  {notifications.items.some((item) => !item.readAt) ? <p className="px-4 pb-1 pt-4 text-xs font-black uppercase tracking-wide text-brown/45">Olvasatlan</p> : null}
                  {notifications.items.filter((item) => !item.readAt).map((notification) => renderNotification(notification, openNotification))}
                  {notifications.items.some((item) => item.readAt) ? <p className="px-4 pb-1 pt-5 text-xs font-black uppercase tracking-wide text-brown/45">Ma olvasott</p> : null}
                  {notifications.items.filter((item) => item.readAt).map((notification) => renderNotification(notification, openNotification))}
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}

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
              {moreItems.map((item) =>
                "children" in item ? (
                  <div key={item.label} className="grid gap-1">
                    <p className="px-3 py-2 text-sm font-bold">{item.label}</p>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          [
                            "rounded-md px-3 py-3 text-sm font-bold transition",
                            isActive ? "bg-brown text-cream" : "hover:bg-cream"
                          ].join(" ")
                        }
                        onClick={() => setIsMoreMenuOpen(false)}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                ) : (
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
                )
              )}
            </nav>
          </div>
        </>
      ) : null}

      {openMobileGroup && "children" in openMobileGroup ? (
        <>
          <button
            type="button"
            aria-label={`${openMobileGroup.label} menü bezárása`}
            className="fixed inset-0 z-30 bg-brown/30 md:hidden"
            onClick={() => setOpenMobileGroup(null)}
          />
          <div className="fixed inset-x-3 bottom-20 z-40 rounded-xl border border-brown/10 bg-white p-3 shadow-xl md:hidden">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="font-bold">{openMobileGroup.label}</p>
              <button
                type="button"
                className="rounded-md px-3 py-1 text-sm font-bold hover:bg-cream"
                onClick={() => setOpenMobileGroup(null)}
              >
                Bezárás
              </button>
            </div>
            <nav className="grid gap-1 sm:grid-cols-2">
              {openMobileGroup.children.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-3 text-sm font-bold transition",
                      isActive ? "bg-brown text-cream" : "hover:bg-cream"
                    ].join(" ")
                  }
                  onClick={() => setOpenMobileGroup(null)}
                >
                  {child.label}
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
        {bottomItems.map((item) =>
          "children" in item ? (
            <button
              key={item.label}
              type="button"
              aria-expanded={openMobileGroup?.label === item.label}
              className={[
                "rounded-md px-2 py-2 text-center text-xs font-bold",
                openMobileGroup?.label === item.label ||
                isNavigationItemActive(item, location.pathname)
                  ? "bg-brown text-cream"
                  : "text-brown"
              ].join(" ")}
              onClick={() =>
                setOpenMobileGroup((openGroup) =>
                  openGroup?.label === item.label ? null : item
                )
              }
            >
              {item.label}
            </button>
          ) : (
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
          )
        )}
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

function renderNotification(
  notification: AppNotification,
  onOpen: (notification: AppNotification) => Promise<void>
) {
  const actorName = `${notification.actor.lastName} ${notification.actor.firstName}`;
  const action =
    notification.type === "MANAGER_SCHEDULE_PUBLISHED"
      ? `közzétette a ${notification.scheduleMonth} havi managerbeosztást`
      : notification.type === "MANAGER_SCHEDULE_UPDATED"
        ? `módosította a ${notification.scheduleMonth} havi managerbeosztást`
        : notification.type === "HANDOVER_REPLY"
      ? "válaszolt az átadóposztodra"
      : notification.handoverReplyId
        ? "megjelölt egy válaszban"
        : "megjelölt egy átadóposztban";
  const snippet = notification.snippet
    .replace(/(^|\s)#[\p{L}\p{N}_-]{1,50}/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <button
      key={notification.id}
      type="button"
      className={`flex w-full gap-3 border-b border-brown/10 px-4 py-3 text-left transition hover:bg-cream ${notification.readAt ? "bg-white" : "bg-red/5"}`}
      onClick={() => void onOpen(notification)}
    >
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.readAt ? "bg-brown/15" : "bg-red"}`} />
      <span className="min-w-0">
        <span className="block text-sm"><strong>{actorName}</strong> {action}.</span>
        {snippet ? <span className="mt-1 block truncate text-xs text-brown/60">„{snippet}”</span> : null}
        <span className="mt-1 block text-[11px] text-brown/45">{formatNotificationTime(notification.createdAt)}</span>
      </span>
    </button>
  );
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isNavigationItemActive(item: NavigationItem, pathname: string) {
  if ("children" in item) {
    return item.children.some((child) => isNavigationLinkActive(child, pathname));
  }

  return isNavigationLinkActive(item, pathname);
}

function isNavigationLinkActive(item: NavigationLink, pathname: string) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

