import { Fragment, useEffect, useState } from "react";
import {
  closeAvailabilitySubmissionWeek,
  getAvailabilitySubmissionWeek,
  getTeamAvailability,
  openAvailabilitySubmissionWeek,
  updateTeamAvailabilityDay,
  type AvailabilityDay,
  type AvailabilitySubmissionWeek,
  type TeamAvailabilityResponse
} from "../api/availability";
import type { ContractHours, WorkerType } from "../store/auth-store";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { getCurrentWeekStartDate, getWeekDates } from "../utils/date";
import { submissionWeekStatusLabel } from "../utils/status-labels";

function formatDayName(date: string) {
  return new Intl.DateTimeFormat("hu-HU", { weekday: "long" }).format(
    new Date(`${date}T00:00:00`)
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(`${date}T00:00:00`));
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
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

type TeamUser = TeamAvailabilityResponse["users"][number];

type EditingDay = {
  user: TeamUser;
  day: AvailabilityDay;
};

type WorkerGroup = {
  key: string;
  title: string;
  workerType: WorkerType;
  contractHours?: ContractHours;
};

const workerGroups: WorkerGroup[] = [
  {
    key: "full-time-8",
    title: "Állandós 8 órások",
    workerType: "FULL_TIME",
    contractHours: "HOURS_8"
  },
  {
    key: "full-time-6",
    title: "Állandós 6 órások",
    workerType: "FULL_TIME",
    contractHours: "HOURS_6"
  },
  {
    key: "full-time-4",
    title: "Állandós 4 órások",
    workerType: "FULL_TIME",
    contractHours: "HOURS_4"
  },
  {
    key: "students",
    title: "Diákok",
    workerType: "STUDENT"
  }
];

const printInfoColumns = [
  "Vasárnapi pihenőnap",
  "Időegyenleg",
  "Előző heti beo"
];

function sortByName(users: TeamUser[]) {
  return [...users].sort((left, right) => {
    const leftName = `${left.lastName} ${left.firstName}`;
    const rightName = `${right.lastName} ${right.firstName}`;
    return leftName.localeCompare(rightName, "hu-HU");
  });
}

function getGroupedUsers(users: TeamUser[]) {
  return workerGroups.map((group) => ({
    ...group,
    users: sortByName(
      users.filter((user) => {
        if (user.workerType !== group.workerType) {
          return false;
        }

        return group.contractHours ? user.contractHours === group.contractHours : true;
      })
    )
  }));
}

export function ManagerTeamAvailabilityPage() {
  const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekStartDate());
  const [team, setTeam] = useState<TeamAvailabilityResponse | null>(null);
  const [submissionWeek, setSubmissionWeek] =
    useState<AvailabilitySubmissionWeek | null>(null);
  const [editingDay, setEditingDay] = useState<EditingDay | null>(null);
  const [isSavingDay, setIsSavingDay] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  async function load() {
    const [teamData, submissionData] = await Promise.all([
      getTeamAvailability({ weekStartDate, employeeSubRole: "WORKER" }),
      getAvailabilitySubmissionWeek({ weekStartDate })
    ]);
    setTeam(teamData);
    setSubmissionWeek(submissionData);
  }

  useEffect(() => {
    load();
  }, [weekStartDate]);

  const days = getWeekDates(team?.period.startDate ?? weekStartDate);
  const groupedUsers = getGroupedUsers(team?.users ?? []);
  const isSubmissionClosed = submissionWeek?.status === "CLOSED";
  const printColumnCount = days.length + printInfoColumns.length + 1;

  function openDayEditor(user: TeamUser, date: string) {
    const existingDay = user.availability.days.find((item) => item.date === date);
    const editableDay: AvailabilityDay = existingDay
      ? {
          ...existingDay,
          type: existingDay.type === "VACATION" ? "OFF" : existingDay.type,
          workPreference:
            existingDay.type === "WORK" ? existingDay.workPreference ?? "ANYTIME" : null,
          startTime: existingDay.type === "WORK" ? existingDay.startTime : null,
          endTime: existingDay.type === "WORK" ? existingDay.endTime : null
        }
      : {
          date,
          type: "OFF",
          workPreference: null,
          startTime: null,
          endTime: null,
          note: ""
        };

    setDayError(null);
    setEditingDay({ user, day: editableDay });
  }

  function updateEditingDay(day: AvailabilityDay) {
    setEditingDay((current) => (current ? { ...current, day } : current));
  }

  async function saveEditingDay() {
    if (!editingDay) {
      return;
    }

    setIsSavingDay(true);
    setDayError(null);
    try {
      await updateTeamAvailabilityDay(editingDay.user.id, {
        weekStartDate,
        day: editingDay.day
      });
      setEditingDay(null);
      await load();
    } catch {
      setDayError("Nem sikerült menteni a módosítást.");
    } finally {
      setIsSavingDay(false);
    }
  }

  function printClosedAvailability() {
    if (!isSubmissionClosed) {
      return;
    }

    window.print();
  }

  return (
    <section className="space-y-5">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold">Csapat ráérések</h2>
        <p className="mt-1 text-sm text-brown/70">
          Heti, táblázatos áttekintés a dolgozók ráéréséről.
        </p>
      </div>

      <Card className="space-y-4 print:hidden">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <Input
            label="Hét kezdete"
            type="date"
            value={weekStartDate}
            onChange={(event) => setWeekStartDate(event.target.value)}
          />
          <Button
            disabled={submissionWeek?.status === "OPEN"}
            onClick={() =>
              openAvailabilitySubmissionWeek({ weekStartDate }).then(load)
            }
          >
            Hét megnyitása
          </Button>
          <Button
            variant="secondary"
            disabled={submissionWeek?.status !== "OPEN"}
            onClick={() =>
              closeAvailabilitySubmissionWeek({ weekStartDate }).then(load)
            }
          >
            Hét lezárása
          </Button>
          <Button
            variant="ghost"
            disabled={!isSubmissionClosed}
            onClick={printClosedAvailability}
          >
            Nyomtatás / PDF
          </Button>
        </div>
        <p className="text-sm font-semibold text-brown/70">
          Állapot: {submissionWeekStatusLabel(submissionWeek?.status ?? null)}
        </p>
      </Card>

      <Card className="availability-print-area overflow-hidden p-0 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className="availability-print-heading hidden">
          <h1>Csapat ráérések</h1>
          <p>
            {formatFullDate(days[0] ?? weekStartDate)} -{" "}
            {formatFullDate(days[days.length - 1] ?? weekStartDate)}
          </p>
          <p>
            Állapot: {submissionWeekStatusLabel(submissionWeek?.status ?? null)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="availability-print-table mx-auto min-w-[820px] border-collapse text-sm print:w-full print:min-w-0 print:text-xs">
            <thead>
              <tr className="bg-brown text-cream">
                <th className="sticky left-0 z-10 w-56 bg-brown px-3 py-3 text-left">
                  Dolgozó
                </th>
                {printInfoColumns.map((column) => (
                  <th
                    key={column}
                    className="availability-print-info-column hidden border-l border-cream/20 px-1 py-2 text-center"
                  >
                    {column}
                  </th>
                ))}
                {days.map((day) => (
                  <th key={day} className="min-w-24 border-l border-cream/20 px-2 py-2 text-center">
                    <span className="block capitalize">{formatDayName(day)}</span>
                    <span className="mt-1 block text-xs font-normal text-cream/80">
                      {formatDate(day)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedUsers.map((group, groupIndex) => (
                <Fragment key={group.key}>
                  {groupIndex > 0 ? (
                    <tr key={`${group.key}-spacer`} aria-hidden="true">
                      <td className="h-4 bg-cream/60" colSpan={printColumnCount} />
                    </tr>
                  ) : null}
                  <tr key={`${group.key}-heading`} className="border-t border-brown/10 bg-cream/80">
                    <th className="sticky left-0 z-10 bg-cream px-3 py-2 text-left text-xs uppercase text-brown/70">
                      {group.title}
                    </th>
                    {printInfoColumns.map((column) => (
                      <td
                        key={`${group.key}-${column}`}
                        className="availability-print-info-column hidden px-1 py-2"
                      />
                    ))}
                    <td className="px-3 py-2 text-xs font-semibold text-brown/60" colSpan={days.length}>
                      {group.users.length} dolgozó
                    </td>
                  </tr>
                  {group.users.map((user) => (
                    <tr key={user.id} className="border-t border-brown/10">
                      <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top shadow-[8px_0_16px_rgba(80,35,20,0.08)]">
                        <div className="font-bold">
                          {user.firstName} {user.lastName}
                        </div>
                      </th>
                      {printInfoColumns.map((column) => (
                        <td
                          key={`${user.id}-${column}`}
                          className="availability-print-info-column hidden px-1 py-2"
                        />
                      ))}
                      {days.map((headerDay) => {
                        const day = user.availability.days.find(
                          (item) => item.date === headerDay
                        );
                        const style = getCellStyle(day);
                        return (
                          <td key={headerDay} className="border-l border-brown/10 p-1 align-top">
                            <button
                              className={`min-h-10 w-full rounded-md px-1.5 py-1 text-center text-xs font-bold leading-tight transition hover:ring-2 hover:ring-red/30 ${style.className}`}
                              type="button"
                              onClick={() => openDayEditor(user, headerDay)}
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
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editingDay ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-brown/40 p-4">
          <Card className="w-full max-w-md space-y-4 bg-white">
            <div>
              <h3 className="text-xl font-bold">
                {editingDay.user.firstName} {editingDay.user.lastName}
              </h3>
              <p className="mt-1 text-sm font-semibold text-brown/60">
                {formatDate(editingDay.day.date)} · {formatDayName(editingDay.day.date)}
              </p>
            </div>

            <Select
              label="Nap típusa"
              value={editingDay.day.type}
              onChange={(event) => {
                const type = event.target.value as AvailabilityDay["type"];
                updateEditingDay({
                  ...editingDay.day,
                  type,
                  workPreference: type === "WORK" ? editingDay.day.workPreference ?? "ANYTIME" : null,
                  startTime: null,
                  endTime: null
                });
              }}
              options={[
                { value: "OFF", label: "Pihenőnap" },
                { value: "WORK", label: "Munka" }
              ]}
            />

            {editingDay.day.type === "WORK" ? (
              <Select
                label="Munka preferencia"
                value={editingDay.day.workPreference ?? "ANYTIME"}
                onChange={(event) => {
                  const workPreference = event.target
                    .value as AvailabilityDay["workPreference"];
                  updateEditingDay({
                    ...editingDay.day,
                    workPreference,
                    startTime:
                      workPreference === "TIME_RANGE" ? editingDay.day.startTime : null,
                    endTime:
                      workPreference === "TIME_RANGE" ? editingDay.day.endTime : null
                  });
                }}
                options={[
                  { value: "ANYTIME", label: "Bárhogy" },
                  { value: "TIME_RANGE", label: "Időponttal" }
                ]}
              />
            ) : null}

            {editingDay.day.type === "WORK" &&
            editingDay.day.workPreference === "TIME_RANGE" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Kezdés"
                  type="time"
                  value={editingDay.day.startTime ?? ""}
                  onChange={(event) =>
                    updateEditingDay({
                      ...editingDay.day,
                      startTime: event.target.value
                    })
                  }
                />
                <Input
                  label="Végzés"
                  type="time"
                  value={editingDay.day.endTime ?? ""}
                  onChange={(event) =>
                    updateEditingDay({
                      ...editingDay.day,
                      endTime: event.target.value
                    })
                  }
                />
              </div>
            ) : null}

            <Input
              label="Megjegyzés"
              value={editingDay.day.note}
              onChange={(event) =>
                updateEditingDay({ ...editingDay.day, note: event.target.value })
              }
            />

            {dayError ? <p className="text-sm font-semibold text-red">{dayError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={isSavingDay} onClick={saveEditingDay}>
                Mentés
              </Button>
              <Button
                disabled={isSavingDay}
                variant="ghost"
                onClick={() => setEditingDay(null)}
              >
                Mégse
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
