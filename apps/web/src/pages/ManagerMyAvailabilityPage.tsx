import { useEffect, useState } from "react";
import {
  getMyAvailability,
  saveMyAvailabilityDraft,
  submitMyAvailability,
  type AvailabilityDay
} from "../api/availability";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { getCurrentMonthValue, getMonthWeeks } from "../utils/date";
import { availabilityStatusLabel } from "../utils/status-labels";

function formatDayName(date: string) {
  return new Intl.DateTimeFormat("hu-HU", { weekday: "short" }).format(
    new Date(`${date}T00:00:00`)
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(`${date}T00:00:00`));
}

function getCellStyle(day?: AvailabilityDay) {
  if (!day) {
    return {
      label: "--",
      className: "bg-brown/5 text-brown/55"
    };
  }

  if (day.type === "VACATION") {
    return {
      label: "Szabadság",
      className: "bg-red/10 text-red"
    };
  }

  if (day.type === "OFF") {
    return {
      label: "Pihenő",
      className: "bg-red/10 text-red"
    };
  }

  if (day.workPreference === "TIME_RANGE") {
    return {
      label: `${day.startTime ?? ""}-${day.endTime ?? ""}`,
      className: "bg-green/15 text-green"
    };
  }

  return {
    label: "Bárhogy",
    className: "bg-green/10 text-green"
  };
}

export function ManagerMyAvailabilityPage() {
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [status, setStatus] = useState("DRAFT");
  const [message, setMessage] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<AvailabilityDay | null>(null);

  const monthStartDate = `${month}-01`;
  const weeks = getMonthWeeks(monthStartDate);

  async function load() {
    const data = await getMyAvailability({ monthStartDate });
    setDays(data.availability.days);
    setStatus(data.availability.status);
  }

  useEffect(() => {
    load();
  }, [month]);

  function updateDay(day: AvailabilityDay) {
    setDays((currentDays) =>
      currentDays.map((item) => (item.date === day.date ? day : item))
    );
    setEditingDay(day);
  }

  async function save(submit: boolean) {
    setMessage(null);
    const payload = {
      periodType: "MONTHLY" as const,
      weekStartDate: null,
      monthStartDate,
      days
    };
    const data = submit
      ? await submitMyAvailability(payload)
      : await saveMyAvailabilityDraft(payload);
    setDays(data.availability.days);
    setStatus(data.availability.status);
    setMessage(submit ? "Havi ráérés leadva" : "Piszkozat mentve");
  }

  return (
    <section className="space-y-5">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Saját havi ráérésem</h2>
            <p className="mt-1 text-sm text-brown/70">Manager havi leadási felület.</p>
          </div>
          <Badge tone={status === "SUBMITTED" ? "green" : "brown"}>
            {availabilityStatusLabel(status)}
          </Badge>
        </div>
        <Input
          label="Hónap"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </Card>

      <div className="space-y-4">
        {weeks.map((week, weekIndex) => (
          <Card key={weekIndex} className="overflow-hidden p-0">
            <div className="border-b border-brown/10 bg-cream/80 px-3 py-2">
              <h3 className="text-sm font-bold">{weekIndex + 1}. hét</h3>
            </div>
            <div className="divide-y divide-brown/10 sm:hidden">
              {week.map((date, dayIndex) => {
                if (!date) {
                  return null;
                }

                const day = days.find((item) => item.date === date);
                const style = getCellStyle(day);
                return (
                  <div key={`${date}-${dayIndex}`} className="flex items-center gap-3 p-3">
                    <div className="w-20 shrink-0">
                      <span className="block text-sm font-bold capitalize">
                        {formatDayName(date)}
                      </span>
                      <span className="block text-xs text-brown/65">{formatDate(date)}</span>
                    </div>
                    <button
                      className={`min-h-11 flex-1 rounded-md px-3 py-2 text-center text-xs font-bold leading-tight transition hover:ring-2 hover:ring-red/30 ${style.className}`}
                      type="button"
                      onClick={() =>
                        day &&
                        setEditingDay({
                          ...day,
                          type: day.type === "VACATION" ? "OFF" : day.type
                        })
                      }
                    >
                      <span>{style.label}</span>
                      {day?.note ? (
                        <span className="mt-1 block text-xs font-normal opacity-75">
                          {day.note}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="bg-brown text-cream">
                    {week.map((date, dayIndex) => (
                      <th
                        key={`${weekIndex}-${dayIndex}`}
                        className="min-w-24 border-l border-cream/20 px-2 py-2 text-center first:border-l-0"
                      >
                        {date ? (
                          <>
                            <span className="block capitalize">{formatDayName(date)}</span>
                            <span className="mt-1 block text-xs font-normal text-cream/80">
                              {formatDate(date)}
                            </span>
                          </>
                        ) : (
                          <span className="block text-cream/40">--</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {week.map((date, dayIndex) => {
                      if (!date) {
                        return (
                          <td
                            key={dayIndex}
                            className="border-l border-brown/10 bg-brown/5 p-1 first:border-l-0"
                          />
                        );
                      }

                      const day = days.find((item) => item.date === date);
                      const style = getCellStyle(day);
                      return (
                        <td key={date} className="border-l border-brown/10 p-1 align-top first:border-l-0">
                          <button
                            className={`min-h-10 w-full rounded-md px-1.5 py-1 text-center text-xs font-bold leading-tight transition hover:ring-2 hover:ring-red/30 ${style.className}`}
                            type="button"
                            onClick={() => day && setEditingDay({
                              ...day,
                              type: day.type === "VACATION" ? "OFF" : day.type
                            })}
                          >
                            <span>{style.label}</span>
                            {day?.note ? (
                              <span className="mt-1 block text-xs font-normal opacity-75">
                                {day.note}
                              </span>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      {message ? <p className="font-semibold text-green">{message}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => save(false)}>Mentés piszkozatként</Button>
        <Button variant="secondary" onClick={() => save(true)}>
          Leadás
        </Button>
      </div>

      {editingDay ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-brown/40 p-4">
          <Card className="w-full max-w-md space-y-4 bg-white">
            <div>
              <h3 className="text-xl font-bold">
                {formatDate(editingDay.date)} · {formatDayName(editingDay.date)}
              </h3>
            </div>
            <Select
              label="Nap típusa"
              value={editingDay.type}
              onChange={(event) => {
                const type = event.target.value as AvailabilityDay["type"];
                updateDay({
                  ...editingDay,
                  type,
                  workPreference: type === "WORK" ? editingDay.workPreference ?? "ANYTIME" : null,
                  startTime: null,
                  endTime: null
                });
              }}
              options={[
                { value: "OFF", label: "Pihenőnap" },
                { value: "WORK", label: "Munka" }
              ]}
            />
            {editingDay.type === "WORK" ? (
              <Select
                label="Munka preferencia"
                value={editingDay.workPreference ?? "ANYTIME"}
                onChange={(event) => {
                  const workPreference = event.target
                    .value as AvailabilityDay["workPreference"];
                  updateDay({
                    ...editingDay,
                    workPreference,
                    startTime: workPreference === "TIME_RANGE" ? editingDay.startTime : null,
                    endTime: workPreference === "TIME_RANGE" ? editingDay.endTime : null
                  });
                }}
                options={[
                  { value: "ANYTIME", label: "Bárhogy" },
                  { value: "TIME_RANGE", label: "Időponttal" }
                ]}
              />
            ) : null}
            {editingDay.type === "WORK" && editingDay.workPreference === "TIME_RANGE" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Kezdés"
                  type="time"
                  value={editingDay.startTime ?? ""}
                  onChange={(event) =>
                    updateDay({ ...editingDay, startTime: event.target.value })
                  }
                />
                <Input
                  label="Végzés"
                  type="time"
                  value={editingDay.endTime ?? ""}
                  onChange={(event) =>
                    updateDay({ ...editingDay, endTime: event.target.value })
                  }
                />
              </div>
            ) : null}
            <Input
              label="Megjegyzés"
              value={editingDay.note}
              onChange={(event) => updateDay({ ...editingDay, note: event.target.value })}
            />
            <Button variant="ghost" onClick={() => setEditingDay(null)}>
              Bezárás
            </Button>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
