import { useEffect, useState } from "react";
import { getMySchedule, type MyScheduleResponse } from "../api/schedules";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { getCurrentWeekStartDate } from "../utils/date";
import { scheduleWeekStatusLabel } from "../utils/status-labels";

export function MySchedulePage() {
  const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekStartDate());
  const [schedule, setSchedule] = useState<MyScheduleResponse | null>(null);

  useEffect(() => {
    getMySchedule({ weekStartDate }).then(setSchedule);
  }, [weekStartDate]);

  return (
    <section className="space-y-5">
      <Card>
        <h2 className="text-2xl font-bold">Beosztásom</h2>
        <div className="mt-4 max-w-sm">
          <Input
            label="Hét kezdete"
            type="date"
            value={weekStartDate}
            onChange={(event) => setWeekStartDate(event.target.value)}
          />
        </div>
      </Card>

      {schedule?.status ? (
        <Badge tone={schedule.status === "PUBLISHED" ? "green" : "brown"}>
          {scheduleWeekStatusLabel(schedule.status)}
        </Badge>
      ) : null}

      {schedule && schedule.shifts.length === 0 ? (
        <Card>
          <p className="font-semibold">Erre a hétre még nincs közzétett beosztásod.</p>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {schedule?.shifts.map((shift) => (
          <Card key={shift.id}>
            <p className="text-sm font-semibold text-brown/60">{shift.date}</p>
            <h3 className="mt-1 text-xl font-bold">{shift.startTime}-{shift.endTime}</h3>
            <p className="mt-2 text-sm text-brown/70">{shift.label ?? "Műszak"}</p>
            {shift.note ? <p className="mt-1 text-sm text-brown/60">{shift.note}</p> : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

