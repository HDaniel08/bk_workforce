import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getManagerMonth, setManagerMonthStatus, setManagerMonthTargets, setManagerScheduleDay, setManagerWeekStatus, type ManagerDayKind, type ManagerMonth, type ManagerPerson } from "../api/manager-schedules";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { getNextMonthValue } from "../utils/date";
import { managerScheduleWarnings } from "../utils/manager-schedule-warnings";

type Editor = { userId: string; date: string; kind: ManagerDayKind; startTime: string; endTime: string; note: string };

function monthWeeks(month: string) {
  const [year, number] = month.split("-").map(Number);
  if (!year || !number) return [];
  const first = new Date(Date.UTC(year, number - 1, 1));
  const last = new Date(Date.UTC(year, number, 0));
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const weeks: string[][] = [];
  for (const cursor = new Date(start); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const week: string[] = [];
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(cursor);
      date.setUTCDate(date.getUTCDate() + offset);
      week.push(date.toISOString().slice(0, 10));
    }
    weeks.push(week);
  }
  return weeks;
}

function label(kind: ManagerDayKind) { return kind === "WORK" ? "Munka" : kind === "REST" ? "Pihenő" : kind === "VACATION" ? "Szabadság" : "Táppénz"; }
function hours(minutes: number) { return `${(minutes / 60).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} ó`; }
function signedHours(minutes: number) { return `${minutes > 0 ? "+" : ""}${hours(minutes)}`; }

function weekStartForDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function publishError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { code?: string; managerName?: string; date?: string } | undefined;
    if (payload?.code === "INCOMPLETE_MANAGER_SCHEDULE") return `${payload.managerName ?? "Egy manager"} nincs beosztva ezen a napon: ${payload.date ?? "ismeretlen dátum"}.`;
    if (payload?.code === "APPROVED_VACATION_MISSING_FROM_SCHEDULE") return `A jóváhagyott szabadság nincs szabadságként rögzítve ezen a napon: ${payload.date ?? "ismeretlen dátum"}.`;
  }
  return "A közzétételhez minden érintett napon minden aktív managert be kell osztani, és a jóváhagyott szabadságokat rögzíteni kell.";
}

export function ManagerMonthlySchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMonth = searchParams.get("month");
  const month = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : getNextMonthValue();
  const [data, setData] = useState<ManagerMonth | null>(null);
  const [workTarget, setWorkTarget] = useState(0);
  const [restTarget, setRestTarget] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const standInManagerIds = useMemo(() => new Set(data?.managers.filter((person) => person.isStandInManager).map((person) => person.id) ?? []), [data]);
  const contractMinutesByUserId = useMemo(() => new Map(data?.managers.map((person) => [person.id, person.contractHours === "HOURS_4" ? 240 : person.contractHours === "HOURS_6" ? 360 : 480]) ?? []), [data]);
  const warnings = useMemo(() => {
    if (!data?.isOwner || data.status !== "DRAFT") return {};
    const context = data.contextDays.filter((day) => day.userId !== editor?.userId || day.date !== editor.date);
    if (editor) context.push({ ...editor, paidMinutes: 0 });
    return managerScheduleWarnings(context, month, standInManagerIds, contractMinutesByUserId);
  }, [data, editor, month, standInManagerIds, contractMinutesByUserId]);
  const savedWarnings = useMemo(() => data?.isOwner && data.status === "DRAFT" ? managerScheduleWarnings(data.contextDays, month, standInManagerIds, contractMinutesByUserId) : {}, [data, month, standInManagerIds, contractMinutesByUserId]);
  const hasPublishedWeeks = data?.weeks.some((week) => week.status === "PUBLISHED") ?? false;
  const selectedManager = data?.managers.find((manager) => manager.id === editor?.userId);
  const selectedRequest = data?.requests.find((request) => request.userId === editor?.userId && request.date === editor.date);
  const selectedVacation = data?.vacations.find((item) => item.requesterUserId === editor?.userId && editor.date >= item.startDate && editor.date <= item.endDate && item.status === "APPROVED")
    ?? data?.vacations.find((item) => item.requesterUserId === editor?.userId && editor.date >= item.startDate && editor.date <= item.endDate);
  const selectedWarnings = useMemo(() => {
    if (!editor) return [];
    const selectedKey = `${editor.userId}:${editor.date}`;
    const nextDate = new Date(`${editor.date}T00:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextKey = `${editor.userId}:${nextDate.toISOString().slice(0, 10)}`;
    const nextWarnings = (warnings[nextKey] ?? []).filter((warning) => !(savedWarnings[nextKey] ?? []).includes(warning));
    return [...(warnings[selectedKey] ?? []), ...nextWarnings.map((warning) => `Következő nap: ${warning}`)];
  }, [editor, warnings, savedWarnings]);

  useEffect(() => {
    if (!editor) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setEditor(null); setError(""); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor]);

  async function load(selectedMonth = month) {
    const result = await getManagerMonth(selectedMonth);
    setData(result); setWorkTarget(result.expectedWorkDays); setRestTarget(result.expectedRestDays);
  }
  useEffect(() => { setData(null); setEditor(null); load(month).catch(() => setError("A havi beosztás nem tölthető be.")); }, [month]);

  function vacation(userId: string, date: string) {
    return data?.vacations.find((item) => item.requesterUserId === userId && item.startDate <= date && item.endDate >= date && item.status === "APPROVED");
  }

  function openEditor(user: ManagerPerson, date: string) {
    if (!data?.isOwner || data.status !== "DRAFT" || data.weeks.find((week) => week.weekStart === weekStartForDate(date))?.status === "PUBLISHED") return;
    const day = data.days.find((item) => item.userId === user.id && item.date === date);
    const approved = vacation(user.id, date);
    setEditor({ userId: user.id, date, kind: approved ? "VACATION" : day?.kind ?? "REST", startTime: day?.startTime ?? "07:00", endTime: day?.endTime ?? "16:00", note: day?.note ?? "" });
    setError(""); setMessage("");
  }

  function closeEditor() { setEditor(null); setError(""); }

  async function saveDay() {
    if (!editor) return;
    setError("");
    try {
      await setManagerScheduleDay(month, editor);
      setEditor(null); await load(); setMessage("Nap elmentve.");
    } catch { setError("A nap nem menthető. Munka esetén érvényes kezdés és végzés kell; az elfogadott szabadság nem írható felül."); }
  }

  async function saveTargets() {
    setError("");
    try { await setManagerMonthTargets(month, Number(workTarget), Number(restTarget)); await load(); setMessage("Havi célok elmentve."); }
    catch { setError("A havi célok nem menthetők."); }
  }

  async function changeStatus(status: "DRAFT" | "PUBLISHED") {
    setError("");
    try { await setManagerMonthStatus(month, status); await load(); setMessage(status === "PUBLISHED" ? "Beosztás közzétéve." : "Beosztás visszatéve piszkozatba."); }
    catch (caught) { setError(publishError(caught)); }
  }

  async function changeWeekStatus(weekStart: string, status: "DRAFT" | "PUBLISHED") {
    setError(""); setMessage("");
    try {
      await setManagerWeekStatus(month, weekStart, status);
      setEditor(null); await load();
      setMessage(status === "PUBLISHED" ? "A hét elmentve, lezárva és közzétéve." : "A hét újranyitva szerkesztésre.");
    } catch (caught) { setError(publishError(caught)); }
  }

  return <section className="w-full space-y-5">
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-2xl font-bold">Managerbeosztás</h2><p className="text-sm text-brown/70">Havi beosztás heti bontásban · {data?.status === "PUBLISHED" ? "Közzétéve" : hasPublishedWeeks ? "Részben közzétéve" : "Piszkozat"}</p></div>
        <div className="w-52"><Input label="Hónap" type="month" value={month} onChange={(event) => { if (event.target.value) setSearchParams({ month: event.target.value }); }} /></div>
      </div>
      {data?.isOwner && data.status === "DRAFT" ? <div className="flex flex-wrap items-end gap-3">
        <div className="w-40"><Input label="Elvárt munkanap" type="number" min={0} max={31} value={workTarget} disabled={data.status !== "DRAFT"} onChange={(event) => setWorkTarget(Number(event.target.value))} /></div>
        <div className="w-40"><Input label="Elvárt pihenőnap" type="number" min={0} max={31} value={restTarget} disabled={data.status !== "DRAFT"} onChange={(event) => setRestTarget(Number(event.target.value))} /></div>
        <Button onClick={saveTargets}>Célok mentése</Button><Button variant="secondary" onClick={() => changeStatus("PUBLISHED")}>Összes hét mentése és közzététele</Button>
      </div> : data?.isOwner ? <Button onClick={() => changeStatus("DRAFT")}>Vissza piszkozatba</Button> : null}
      {data?.isOwner && data.status === "DRAFT" ? <p className="text-sm text-brown/70">Kéthavi időegyenleg: {data.cycleStart} – {data.cycleEnd}. Munkaóra = műszakhossz mínusz 1 óra szünet; a jóváhagyott szabadság a profil szerinti napi munkaidőt éri.</p> : null}
      {error && !editor ? <p className="text-sm font-semibold text-red">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-green">{message}</p> : null}
    </Card>

    {data && !data.isOwner && data.status !== "PUBLISHED" && !hasPublishedWeeks ? <Card>Erre a hónapra még nincs közzétett beosztás.</Card> : null}
    {data?.managers.length === 0 ? <Card>Nincs aktív manager.</Card> : null}
    {Boolean(data?.managers.length) && data && (data.isOwner || data.status === "PUBLISHED" || hasPublishedWeeks) ? <div className={data.isOwner && data.status === "DRAFT" ? "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start" : "min-w-0"}>
      <div className="min-w-0 space-y-4">
      {weeks.map((week, weekIndex) => {
        const scheduleWeek = data.weeks.find((item) => item.weekStart === week[0]);
        const weekPublished = scheduleWeek?.status === "PUBLISHED" || data.status === "PUBLISHED";
        return <Card key={weekIndex} className="min-w-0 overflow-hidden p-0 sm:p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brown/10 bg-cream px-3 py-2">
          <div><strong>{weekIndex + 1}. hét</strong><span className="ml-2 text-xs font-normal text-brown/65">{weekPublished ? "Lezárva és közzétéve" : "Piszkozat · a napi módosítások automatikusan mentve"}</span></div>
          {data.isOwner && data.status === "DRAFT" ? <Button variant="secondary" onClick={() => changeWeekStatus(week[0]!, weekPublished ? "DRAFT" : "PUBLISHED")}>{weekPublished ? "Hét újranyitása" : "Hét mentése és lezárása"}</Button> : null}
        </div>
        <div className="grid grid-cols-7 divide-x divide-cream/20 bg-brown text-center text-[11px] font-bold text-cream sm:text-sm">
          {week.map((date, index) => <div key={index} className={`min-w-0 px-0.5 py-2 sm:px-2 ${date.startsWith(month) ? "" : "opacity-60"}`}><span className="block">{new Date(`${date}T12:00:00Z`).toLocaleDateString("hu-HU", { weekday: "short" })}</span><span className="block">{Number(date.slice(5, 7))}.{Number(date.slice(-2))}.</span></div>)}
        </div>
        {data.managers.map((manager) => {
          const balance = data.balance.find((item) => item.userId === manager.id);
          return <div key={manager.id} className="border-t border-brown/10">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-cream/60 px-3 py-2">
              <strong className="text-sm">{manager.lastName} {manager.firstName}</strong>
              {data.isOwner && data.status === "DRAFT" && balance ? <div className="flex flex-wrap gap-x-3 text-[11px] text-brown/70">
                <span>{hours(balance.currentMinutes)} / {hours(balance.expectedCurrentMinutes)}</span>
                <span>Havi: {signedHours(balance.monthDifferenceMinutes)}</span>
                <span>2 havi: {signedHours(balance.cycleDifferenceMinutes)}</span>
                <span>Pihenő: {balance.currentRestDays} / {data.expectedRestDays}</span>
              </div> : null}
            </div>
            <div className="grid grid-cols-7 divide-x divide-brown/10">
              {week.map((date, index) => {
                if (!date.startsWith(month)) return <div key={index} className="min-w-0 bg-cream/50" />;
                const day = data.days.find((item) => item.userId === manager.id && item.date === date);
                const request = data.requests.find((item) => item.userId === manager.id && item.date === date);
                const leave = data.vacations.find((item) => item.requesterUserId === manager.id && item.startDate <= date && item.endDate >= date);
                const dayWarnings = savedWarnings[`${manager.id}:${date}`] ?? [];
                const editing = editor?.userId === manager.id && editor.date === date;
                const requestText = request ? `Kérés: ${label(request.kind)}${request.note ? ` · ${request.note}` : ""}` : "";
                return <div key={date} className={`min-w-0 p-0.5 sm:p-1 ${dayWarnings.length ? "bg-red/10" : ""}`}>
                  <button type="button" aria-pressed={editing} title={[requestText, day?.note, leave?.reason, ...dayWarnings].filter(Boolean).join("\n") || undefined} disabled={!data.isOwner || data.status !== "DRAFT" || weekPublished} onClick={() => openEditor(manager, date)} className={`min-h-24 w-full min-w-0 rounded-md p-1 text-left text-[11px] hover:bg-cream disabled:cursor-default sm:p-2 sm:text-xs ${dayWarnings.length ? "ring-2 ring-red/60" : editing ? "ring-2 ring-brown" : ""}`}>
                    <span className="block break-words font-bold">{leave?.status === "APPROVED" ? "Szabadság" : day ? label(day.kind) : "—"}</span>
                    {day?.kind === "WORK" ? <span className="block break-all leading-tight"><span className="block xl:inline">{day.startTime}</span><span className="hidden xl:inline">–</span><span className="block xl:inline">{day.endTime}</span></span> : null}
                    {day?.note ? <span className="hidden truncate text-brown/70 sm:block">{day.note}</span> : null}
                    {request ? <span className="mt-1 block truncate border-t border-brown/10 pt-1 text-[10px] text-brown/70">K: {label(request.kind)}</span> : null}
                    {leave && leave.status !== "APPROVED" ? <span className="block text-[10px] text-red">Függő szabi</span> : null}
                    {dayWarnings.length ? <span className="block text-[10px] font-bold text-red" aria-label={dayWarnings.join(" ")}>⚠ {dayWarnings.length}</span> : null}
                  </button>
                </div>;
              })}
            </div>
          </div>;
        })}
      </Card>;
      })}
      </div>
      {!editor && data.isOwner && data.status === "DRAFT" ? <aside className="hidden rounded-lg bg-white p-5 text-sm text-brown/70 shadow-soft lg:sticky lg:top-4 lg:block">
        <h3 className="mb-2 text-base font-bold text-brown">Nap szerkesztése</h3>
        Válassz ki egy napot a heti beosztásban. A szerkesztés itt jelenik meg.
      </aside> : null}
      {editor && selectedManager && data.isOwner && data.status === "DRAFT" ? <>
        <button type="button" aria-label="Szerkesztő bezárása" className="fixed inset-0 z-40 bg-brown/40 lg:hidden" onClick={closeEditor} />
        <aside role="dialog" aria-label="Nap szerkesztése" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-xl bg-white p-4 shadow-soft lg:sticky lg:top-4 lg:z-20 lg:max-h-[calc(100vh-2rem)] lg:rounded-lg lg:p-5">
          <div className="flex items-start justify-between gap-3 border-b border-brown/10 pb-3">
            <div><p className="text-xs font-bold uppercase tracking-wide text-brown/60">Nap szerkesztése</p><h3 className="text-lg font-bold">{selectedManager.lastName} {selectedManager.firstName}</h3><p className="text-sm text-brown/70">{new Date(`${editor.date}T12:00:00Z`).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</p></div>
            <button type="button" onClick={closeEditor} aria-label="Szerkesztő bezárása" className="rounded-md px-2 py-1 text-2xl leading-none text-brown/70 hover:bg-cream">×</button>
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto py-4">
            {selectedRequest ? <div className="rounded-md bg-cream p-3 text-sm"><strong>Leadott kérelem: {label(selectedRequest.kind)}</strong>{selectedRequest.note ? <p className="mt-1">{selectedRequest.note}</p> : null}</div> : null}
            {selectedVacation ? <div className="rounded-md bg-cream p-3 text-sm"><strong>{selectedVacation.status === "APPROVED" ? "Jóváhagyott" : "Függőben lévő"} szabadságkérelem</strong>{selectedVacation.reason ? <p className="mt-1">{selectedVacation.reason}</p> : null}</div> : null}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-brown">Nap típusa</legend>
              {selectedVacation?.status === "APPROVED" ? <div className="rounded-md border border-red/30 bg-red/10 p-3 text-sm font-bold text-red">Szabadság · jóváhagyott kérelem</div> : <div className="grid grid-cols-2 gap-2">{(["WORK", "REST", "VACATION", "SICK_LEAVE"] as const).map((kind) => <button key={kind} type="button" aria-pressed={editor.kind === kind} onClick={() => setEditor({ ...editor, kind })} className={`rounded-md border px-3 py-3 text-sm font-bold transition ${editor.kind === kind ? "border-red bg-red text-white" : "border-brown/20 bg-cream/40 text-brown hover:bg-cream"}`}>{label(kind)}</button>)}</div>}
            </fieldset>
            {editor.kind === "WORK" ? <div className="grid grid-cols-2 gap-2">
              <Input label="Kezdés" type="time" value={editor.startTime} onChange={(event) => setEditor({ ...editor, startTime: event.target.value })} />
              <Input label="Végzés" type="time" value={editor.endTime} onChange={(event) => setEditor({ ...editor, endTime: event.target.value })} />
            </div> : null}
            <Input label="Megjegyzés" maxLength={200} value={editor.note} onChange={(event) => setEditor({ ...editor, note: event.target.value })} />
            {selectedWarnings.map((warning) => <p key={warning} role="alert" className="rounded-md bg-red/10 p-3 text-sm font-semibold text-red">⚠ {warning}</p>)}
            {error ? <p role="alert" className="text-sm font-semibold text-red">{error}</p> : null}
          </div>
          <div className="flex gap-2 border-t border-brown/10 pt-3"><Button onClick={saveDay}>Mentés</Button><Button variant="ghost" onClick={closeEditor}>Mégse</Button></div>
        </aside>
      </> : null}
    </div> : null}
  </section>;
}
