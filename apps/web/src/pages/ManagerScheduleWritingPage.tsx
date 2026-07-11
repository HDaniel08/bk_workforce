import { useEffect, useMemo, useState } from "react";
import {
  assignShift,
  createScheduleWeek,
  createShift,
  getScheduleWeek,
  getScheduleWeeks,
  unassignShift,
  updateShift,
  type ScheduleWeek,
  type Shift
} from "../api/schedules";
import { getUsers, type ManagedUser } from "../api/users";
import {
  getClosedAvailabilitySubmissionWeeks,
  getAvailabilitySubmissionWeek,
  type AvailabilitySubmissionWeek
} from "../api/availability";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { getWeekDates } from "../utils/date";
import { scheduleWeekStatusLabel, submissionWeekStatusLabel } from "../utils/status-labels";

const positions = ["Kassza", "Drive", "Konyha", "Hosty", "Árupakoló"];

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

function formatWeekRange(weekStartDate: string) {
  const days = getWeekDates(weekStartDate);
  const firstDay = days[0] ?? weekStartDate;
  const lastDay = days[days.length - 1] ?? weekStartDate;
  return `${formatDate(firstDay)} - ${formatDate(lastDay)}`;
}

function employeeName(employee: Pick<ManagedUser, "firstName" | "lastName">) {
  return `${employee.firstName} ${employee.lastName}`;
}

function sortEmployees(employees: ManagedUser[]) {
  return [...employees].sort((left, right) =>
    `${left.lastName} ${left.firstName}`.localeCompare(
      `${right.lastName} ${right.firstName}`,
      "hu-HU"
    )
  );
}

function getShiftAssignmentLabel(shift: Shift) {
  return `${shift.label || "Műszak"} ${shift.startTime}-${shift.endTime}`;
}

export function ManagerScheduleWritingPage() {
  const [closedWeeks, setClosedWeeks] = useState<AvailabilitySubmissionWeek[]>([]);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [week, setWeek] = useState<ScheduleWeek | null>(null);
  const [employees, setEmployees] = useState<ManagedUser[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [submissionStatus, setSubmissionStatus] =
    useState<AvailabilitySubmissionWeek["status"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = weekStartDate ? getWeekDates(week?.weekStartDate ?? weekStartDate) : [];
  const selectedDate = days[selectedDayIndex] ?? "";
  const sortedEmployees = useMemo(
    () => sortEmployees(employees.filter((employee) => employee.role === "EMPLOYEE")),
    [employees]
  );

  const shiftsForSelectedDate = useMemo(
    () =>
      (week?.shifts ?? [])
        .filter((shift) => shift.date === selectedDate)
        .sort((left, right) => {
          const labelOrder =
            positions.indexOf(left.label ?? "") - positions.indexOf(right.label ?? "");
          return labelOrder || left.startTime.localeCompare(right.startTime);
        }),
    [selectedDate, week]
  );

  async function loadWeek(date = weekStartDate) {
    if (!date) {
      setWeek(null);
      setSubmissionStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [weeks, submissionWeek] = await Promise.all([
        getScheduleWeeks({ weekStartDate: date }),
        getAvailabilitySubmissionWeek({ weekStartDate: date })
      ]);
      setSubmissionStatus(submissionWeek.status);

      if (weeks[0]) {
        setWeek(await getScheduleWeek(weeks[0].id));
      } else {
        setWeek(null);
      }
    } catch {
      setError("Nem sikerült betölteni a beosztás hetet.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      getUsers({ isActive: "true" }),
      getClosedAvailabilitySubmissionWeeks()
    ]).then(([users, weeks]) => {
      setEmployees(users);
      setClosedWeeks(weeks);
      setWeekStartDate((current) => current || weeks[0]?.weekStartDate || "");
    });
  }, []);

  useEffect(() => {
    setSelectedDayIndex(0);
    if (weekStartDate) {
      loadWeek(weekStartDate);
    }
  }, [weekStartDate]);

  async function openOrCreateWeek() {
    if (!weekStartDate) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const created = await createScheduleWeek({ weekStartDate });
      setWeek(await getScheduleWeek(created.id));
    } catch {
      setError("Nem sikerült létrehozni a beosztás hetet.");
    } finally {
      setIsLoading(false);
    }
  }

  async function addPosition(position: string) {
    if (!week || !selectedDate) {
      return;
    }

    setError(null);
    try {
      await createShift(week.id, {
        date: selectedDate,
        startTime: "08:00",
        endTime: "16:00",
        label: position,
        note: ""
      });
      await loadWeek(week.weekStartDate);
    } catch {
      setError("Nem sikerült hozzáadni a pozíciót.");
    }
  }

  async function updateShiftTime(shift: Shift, field: "startTime" | "endTime", value: string) {
    if (!week || shift[field] === value) {
      return;
    }

    setError(null);
    try {
      await updateShift(shift.id, { [field]: value });
      await loadWeek(week.weekStartDate);
    } catch {
      setError("Nem sikerült módosítani az időpontot.");
    }
  }

  async function replaceAssignment(shift: Shift, userId: string) {
    if (!week) {
      return;
    }

    setError(null);
    try {
      for (const assignment of shift.assignments) {
        await unassignShift(assignment.id);
      }

      if (userId) {
        await assignShift(shift.id, { userId });
      }

      await loadWeek(week.weekStartDate);
    } catch {
      setError("Nem sikerült hozzárendelni a dolgozót.");
    }
  }

  function goToPreviousDay() {
    setSelectedDayIndex((current) => Math.max(0, current - 1));
  }

  function goToNextDay() {
    setSelectedDayIndex((current) => Math.min(days.length - 1, current + 1));
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Beosztásírás</h2>
        <p className="mt-1 text-sm text-brown/70">
          Lezárt ráérés hétből készülő heti beosztás első, egyszerű szerkesztője.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Select
            label="Lezárt ráérés hét"
            value={weekStartDate}
            onChange={(event) => setWeekStartDate(event.target.value)}
            options={[
              { value: "", label: "Válassz lezárt hetet" },
              ...closedWeeks.map((closedWeek) => ({
                value: closedWeek.weekStartDate,
                label: `${closedWeek.weekStartDate} (${formatWeekRange(closedWeek.weekStartDate)})`
              }))
            ]}
          />
          <Button
            disabled={isLoading || !weekStartDate || submissionStatus !== "CLOSED"}
            onClick={openOrCreateWeek}
          >
            Beosztás hét megnyitása / létrehozása
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-brown/70">
          <span>Ráérés hét: {submissionWeekStatusLabel(submissionStatus)}</span>
          <span>Beosztás: {week ? scheduleWeekStatusLabel(week.status) : "nincs megnyitva"}</span>
        </div>
        {error ? <p className="text-sm font-semibold text-red">{error}</p> : null}
        {closedWeeks.length === 0 ? (
          <p className="text-sm font-semibold text-red">
            Nincs még lezárt ráérés hét. Zárj le egy hetet a Csapat ráérés oldalon.
          </p>
        ) : null}
        {weekStartDate && submissionStatus !== "CLOSED" ? (
          <p className="text-sm font-semibold text-red">
            Beosztást csak lezárt ráérés hétből lehet indítani.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-brown/10 bg-cream/70 px-4 py-3">
          <h3 className="font-bold">Heti áttekintő</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-brown text-cream">
                <th className="sticky left-0 z-10 w-52 bg-brown px-3 py-2 text-left">
                  Dolgozó
                </th>
                {days.map((day) => (
                  <th key={day} className="min-w-28 border-l border-cream/20 px-2 py-2 text-center">
                    <span className="block capitalize">{formatDayName(day)}</span>
                    <span className="block text-xs font-normal text-cream/80">
                      {formatDate(day)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((employee) => (
                <tr key={employee.id} className="border-t border-brown/10">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left shadow-[8px_0_16px_rgba(80,35,20,0.08)]">
                    {employeeName(employee)}
                  </th>
                  {days.map((day) => {
                    const shifts = (week?.shifts ?? []).filter(
                      (shift) =>
                        shift.date === day &&
                        shift.assignments.some((assignment) => assignment.userId === employee.id)
                    );

                    return (
                      <td key={day} className="border-l border-brown/10 p-1 align-top">
                        <div className="min-h-9 space-y-1">
                          {shifts.map((shift) => (
                            <div
                              key={shift.id}
                              className="rounded bg-green/10 px-1.5 py-1 text-xs font-bold text-green"
                            >
                              {getShiftAssignmentLabel(shift)}
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-4 xl:sticky xl:top-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold">
              {selectedDate
                ? `${formatDayName(selectedDate)}, ${formatDate(selectedDate)}`
                : "Nincs kiválasztott nap"}
            </h3>
            <p className="text-sm font-semibold text-brown/60">
              Pozíciók és dolgozók
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" disabled={selectedDayIndex === 0} onClick={goToPreviousDay}>
              Előző nap
            </Button>
            <Button
              variant="ghost"
              disabled={selectedDayIndex === days.length - 1 || days.length === 0}
              onClick={goToNextDay}
            >
              Következő nap
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
          {days.map((day, index) => (
            <button
              key={day}
              className={[
                "rounded-md px-3 py-2 text-sm font-bold transition",
                index === selectedDayIndex
                  ? "bg-brown text-cream"
                  : "bg-cream text-brown hover:bg-brown/10"
              ].join(" ")}
              type="button"
              onClick={() => setSelectedDayIndex(index)}
            >
              <span className="block capitalize">{formatDayName(day)}</span>
              <span className="block text-xs font-semibold opacity-75">{formatDate(day)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {positions.map((position) => (
            <Button key={position} disabled={!week || week.status !== "DRAFT"} onClick={() => addPosition(position)}>
              {position}
            </Button>
          ))}
        </div>

        {!week ? (
          <p className="rounded-md bg-cream p-3 text-sm font-semibold text-brown/70">
            Nyisd meg vagy hozd létre a beosztás hetet, utána tudsz pozíciókat felvenni.
          </p>
        ) : null}

        <div className="space-y-2">
          {shiftsForSelectedDate.map((shift) => (
            <div
              key={shift.id}
              className="space-y-2 rounded-md border border-brown/10 bg-cream/40 p-3"
            >
              <div className="text-sm font-bold">{shift.label || "Műszak"}</div>
              <Select
                label="Dolgozó"
                value={shift.assignments[0]?.userId ?? ""}
                onChange={(event) => replaceAssignment(shift, event.target.value)}
                options={[
                  { value: "", label: "Nincs kiválasztva" },
                  ...sortedEmployees.map((employee) => ({
                    value: employee.id,
                    label: employeeName(employee)
                  }))
                ]}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Tól"
                  type="time"
                  defaultValue={shift.startTime}
                  onBlur={(event) => updateShiftTime(shift, "startTime", event.target.value)}
                />
                <Input
                  label="Ig"
                  type="time"
                  defaultValue={shift.endTime}
                  onBlur={(event) => updateShiftTime(shift, "endTime", event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
      </div>
    </section>
  );
}
