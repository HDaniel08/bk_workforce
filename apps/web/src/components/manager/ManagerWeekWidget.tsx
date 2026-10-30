import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getManagerWeek, type ManagerWeek } from "../../api/manager-schedules";
import { formatDateOnly, getCurrentWeekStartDate, getWeekDates } from "../../utils/date";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

function moveWeek(value: string, weeks: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + weeks * 7);
  return formatDateOnly(date);
}

function kindLabel(kind: "WORK" | "REST" | "VACATION") {
  return kind === "WORK" ? "Munka" : kind === "REST" ? "Pihenő" : "Szabi";
}

export function ManagerWeekWidget() {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStartDate);
  const [week, setWeek] = useState<ManagerWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dates = getWeekDates(weekStart);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getManagerWeek(weekStart).then((result) => { if (active) setWeek(result); })
      .catch(() => { if (active) { setWeek(null); setError("A heti managerbeosztás nem tölthető be."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [weekStart]);

  return <Card className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-lg font-bold">Managerbeosztás · heti nézet</h3><p className="text-xs text-brown/65">Csak a közzétett beosztás látható.</p></div>
      <Link to={`/manager/monthly-schedule?month=${weekStart.slice(0, 7)}`} className="text-sm font-bold text-red hover:underline">Teljes havi beosztás</Link>
    </div>
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" onClick={() => setWeekStart(moveWeek(weekStart, -1))} aria-label="Előző hét">←</Button>
      <strong className="text-center text-sm">{dates[0]} – {dates[6]}</strong>
      <Button variant="ghost" onClick={() => setWeekStart(moveWeek(weekStart, 1))} aria-label="Következő hét">→</Button>
    </div>
    {error ? <p className="text-sm text-red">{error}</p> : loading ? <p className="text-sm text-brown/65">Heti beosztás betöltése…</p> : week && week.days.length > 0 ? <div className="overflow-hidden rounded-md border border-brown/10">
      <div className="grid grid-cols-7 divide-x divide-cream/20 bg-brown text-center text-[10px] font-bold text-cream sm:text-xs">
        {dates.map((date) => <div key={date} className="min-w-0 py-2"><span className="block">{new Date(`${date}T12:00:00Z`).toLocaleDateString("hu-HU", { weekday: "short" })}</span><span className="block">{Number(date.slice(-2))}.</span></div>)}
      </div>
      {week.managers.map((manager) => <div key={manager.id} className="border-t border-brown/10">
        <p className="bg-cream/60 px-2 py-1 text-xs font-bold">{manager.lastName} {manager.firstName}</p>
        <div className="grid grid-cols-7 divide-x divide-brown/10">{dates.map((date) => {
          const day = week.days.find((item) => item.userId === manager.id && item.date === date);
          return <div key={date} className="min-h-16 min-w-0 p-1 text-[10px] sm:p-2 sm:text-xs">
            {day ? <><span className="block break-words font-bold">{kindLabel(day.kind)}</span>{day.kind === "WORK" ? <span className="block break-all leading-tight">{day.startTime}<span className="hidden sm:inline">–</span><span className="block sm:inline">{day.endTime}</span></span> : null}</> : <span className="text-brown/35">—</span>}
          </div>;
        })}</div>
      </div>)}
    </div> : <p className="text-sm text-brown/65">Erre a hétre még nincs közzétett managerbeosztás.</p>}
  </Card>;
}
