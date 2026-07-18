import { useEffect, useState } from "react";
import {
  getMyAvailability,
  getOpenAvailabilitySubmissionWeeks,
  saveMyAvailabilityDraft,
  submitMyAvailability,
  type AvailabilityDay,
  type AvailabilitySubmissionWeek
} from "../api/availability";
import { MissingTimeConfirmationDialog } from "../components/availability/MissingTimeConfirmationDialog";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import {
  fillMissingTimeBoundary,
  getMissingTimeBoundary,
  type MissingTimeBoundary
} from "../utils/availability-time-defaults";
import { availabilityStatusLabel } from "../utils/status-labels";

interface PendingSave {
  days: AvailabilityDay[];
  submit: boolean;
  boundary: MissingTimeBoundary;
}

function formatWeekLabel(weekStartDate: string) {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.toLocaleDateString("hu-HU")} - ${end.toLocaleDateString("hu-HU")}`;
}

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

function getCellStyle(day: AvailabilityDay) {
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

export function WorkerAvailabilityPage() {
  const [openWeeks, setOpenWeeks] = useState<AvailabilitySubmissionWeek[]>([]);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [status, setStatus] = useState("DRAFT");
  const [message, setMessage] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<AvailabilityDay | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  async function loadOpenWeeks() {
    const weeks = await getOpenAvailabilitySubmissionWeeks();
    setOpenWeeks(weeks);
    setWeekStartDate((current) => {
      if (current && weeks.some((week) => week.weekStartDate === current)) {
        return current;
      }

      return weeks[0]?.weekStartDate ?? "";
    });
  }

  async function load(date: string) {
    const data = await getMyAvailability({ weekStartDate: date });
    setDays(data.availability.days);
    setStatus(data.availability.status);
  }

  useEffect(() => {
    loadOpenWeeks();
  }, []);

  useEffect(() => {
    if (!weekStartDate) {
      setDays([]);
      setStatus("DRAFT");
      return;
    }

    load(weekStartDate);
  }, [weekStartDate]);

  function updateDay(day: AvailabilityDay) {
    setDays((currentDays) =>
      currentDays.map((item) => (item.date === day.date ? day : item))
    );
    setEditingDay(day);
  }

  async function persist(daysToSave: AvailabilityDay[], submit: boolean) {
    if (!weekStartDate) {
      return;
    }

    const payload = {
      periodType: "WEEKLY" as const,
      weekStartDate,
      monthStartDate: null,
      days: daysToSave
    };
    const data = submit
      ? await submitMyAvailability(payload)
      : await saveMyAvailabilityDraft(payload);
    setDays(data.availability.days);
    setStatus(data.availability.status);
    setMessage(submit ? "Ráérés leadva" : "Piszkozat mentve");
  }

  function continueSave(daysToSave: AvailabilityDay[], submit: boolean) {
    const boundary = getMissingTimeBoundary(daysToSave);

    if (boundary) {
      setPendingSave({ days: daysToSave, submit, boundary });
      return;
    }

    setDays(daysToSave);
    void persist(daysToSave, submit);
  }

  function save(submit: boolean) {
    setMessage(null);
    continueSave(days, submit);
  }

  function confirmMissingTime() {
    if (!pendingSave) {
      return;
    }

    const normalizedDays = fillMissingTimeBoundary(
      pendingSave.days,
      pendingSave.boundary
    );
    const submit = pendingSave.submit;

    setPendingSave(null);
    continueSave(normalizedDays, submit);
  }

  const canEdit = openWeeks.length > 0 && Boolean(weekStartDate);

  return (
    <section className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Heti ráérésem</h2>
            <p className="mt-1 text-sm text-brown/70">Dolgozói heti leadási felület.</p>
          </div>
          <Badge tone={status === "SUBMITTED" ? "green" : "brown"}>
            {availabilityStatusLabel(status)}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Select
            label="Hét kezdete"
            value={weekStartDate}
            onChange={(event) => setWeekStartDate(event.target.value)}
            disabled={openWeeks.length === 0}
            options={
              openWeeks.length > 0
                ? openWeeks.map((week) => ({
                    value: week.weekStartDate,
                    label: formatWeekLabel(week.weekStartDate)
                  }))
                : [{ value: "", label: "Nincs megnyitott hét" }]
            }
          />
          <Button variant="ghost" onClick={loadOpenWeeks}>
            Frissítés
          </Button>
        </div>
      </Card>

      {canEdit ? (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-brown/10 sm:hidden">
            {days.map((day) => {
              const style = getCellStyle(day);
              return (
                <div key={day.date} className="flex items-center gap-3 p-3">
                  <div className="w-20 shrink-0">
                    <span className="block text-sm font-bold capitalize">
                      {formatDayName(day.date)}
                    </span>
                    <span className="block text-xs text-brown/65">{formatDate(day.date)}</span>
                  </div>
                  <button
                    className={`min-h-11 flex-1 rounded-md px-3 py-2 text-center text-xs font-bold leading-tight transition hover:ring-2 hover:ring-red/30 ${style.className}`}
                    type="button"
                    onClick={() =>
                      setEditingDay({
                        ...day,
                        type: day.type === "VACATION" ? "OFF" : day.type
                      })
                    }
                  >
                    <span>{style.label}</span>
                    {day.note ? (
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
                  {days.map((day) => (
                    <th
                      key={day.date}
                      className="min-w-24 border-l border-cream/20 px-2 py-2 text-center first:border-l-0"
                    >
                      <span className="block capitalize">{formatDayName(day.date)}</span>
                      <span className="mt-1 block text-xs font-normal text-cream/80">
                        {formatDate(day.date)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {days.map((day) => {
                    const style = getCellStyle(day);
                    return (
                      <td key={day.date} className="border-l border-brown/10 p-1 align-top first:border-l-0">
                        <button
                          className={`min-h-10 w-full rounded-md px-1.5 py-1 text-center text-xs font-bold leading-tight transition hover:ring-2 hover:ring-red/30 ${style.className}`}
                          type="button"
                          onClick={() =>
                            setEditingDay({
                              ...day,
                              type: day.type === "VACATION" ? "OFF" : day.type
                            })
                          }
                        >
                          <span>{style.label}</span>
                          {day.note ? (
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
      ) : (
        <Card>
          <p className="font-semibold">Jelenleg nincs megnyitott hét ráérés leadására.</p>
        </Card>
      )}

      {message ? <p className="font-semibold text-green">{message}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={!canEdit} onClick={() => save(false)}>
          Mentés piszkozatként
        </Button>
        <Button disabled={!canEdit} variant="secondary" onClick={() => save(true)}>
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

      {pendingSave ? (
        <MissingTimeConfirmationDialog
          boundary={pendingSave.boundary}
          onConfirm={confirmMissingTime}
          onCancel={() => setPendingSave(null)}
        />
      ) : null}
    </section>
  );
}
