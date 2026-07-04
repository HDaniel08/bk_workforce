import { useEffect, useMemo, useState } from "react";
import { getUsers, type ManagedUser } from "../api/users";
import {
  assignShift,
  createScheduleWeek,
  createShift,
  deleteShift,
  getScheduleWeeks,
  getScheduleWeek,
  lockScheduleWeek,
  publishScheduleWeek,
  unassignShift,
  updateShift,
  type ScheduleWeek,
  type Shift,
  type ShiftPayload
} from "../api/schedules";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { getCurrentWeekStartDate } from "../utils/date";
import { scheduleWeekStatusLabel } from "../utils/status-labels";

const emptyShift: ShiftPayload = {
  date: getCurrentWeekStartDate(),
  startTime: "08:00",
  endTime: "16:00",
  label: "",
  note: ""
};

export function ManagerSchedulesPage() {
  const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekStartDate());
  const [week, setWeek] = useState<ScheduleWeek | null>(null);
  const [employees, setEmployees] = useState<ManagedUser[]>([]);
  const [shiftForm, setShiftForm] = useState<ShiftPayload>(emptyShift);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const isDraft = week?.status === "DRAFT";

  useEffect(() => {
    getUsers({ isActive: "true" }).then(setEmployees);
  }, []);

  async function loadWeek(id: string) {
    setWeek(await getScheduleWeek(id));
  }

  async function openOrCreateWeek() {
    setError(null);
    const weeks = await getScheduleWeeks({ weekStartDate });
    if (weeks[0]) {
      await loadWeek(weeks[0].id);
      return;
    }
    const created = await createScheduleWeek({ weekStartDate });
    await loadWeek(created.id);
  }

  async function saveShift() {
    if (!week) return;
    setError(null);
    try {
      if (editingShiftId) {
        await updateShift(editingShiftId, shiftForm);
      } else {
        await createShift(week.id, shiftForm);
      }
      setShiftForm({ ...emptyShift, date: weekStartDate });
      setEditingShiftId(null);
      await loadWeek(week.id);
    } catch {
      setError("Műszak mentési hiba");
    }
  }

  function editShift(shift: Shift) {
    setEditingShiftId(shift.id);
    setShiftForm({
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      label: shift.label ?? "",
      note: shift.note ?? ""
    });
  }

  const shiftsByDate = useMemo(() => {
    const groups = new Map<string, Shift[]>();
    for (const shift of week?.shifts ?? []) {
      groups.set(shift.date, [...(groups.get(shift.date) ?? []), shift]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [week]);

  return (
    <section className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            label="Hét kezdete"
            type="date"
            value={weekStartDate}
            onChange={(event) => setWeekStartDate(event.target.value)}
          />
          <Button onClick={openOrCreateWeek}>Het megnyitása / létrehozása</Button>
        </div>
        {week ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={week.status === "PUBLISHED" ? "green" : week.status === "LOCKED" ? "red" : "brown"}>
              {scheduleWeekStatusLabel(week.status)}
            </Badge>
            <Button variant="ghost" disabled={!isDraft} onClick={() => publishScheduleWeek(week.id).then(setWeek)}>
              Publish
            </Button>
            <Button variant="secondary" disabled={week.status === "LOCKED"} onClick={() => lockScheduleWeek(week.id).then(setWeek)}>
              Lock
            </Button>
          </div>
        ) : null}
      </Card>

      {week ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">{editingShiftId ? "Műszak szerkesztése" : "Új műszak"}</h2>
          <div className="grid gap-3 md:grid-cols-5">
            <Input label="Dátum" type="date" value={shiftForm.date} onChange={(event) => setShiftForm({ ...shiftForm, date: event.target.value })} />
            <Input label="Kezdés" type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm({ ...shiftForm, startTime: event.target.value })} />
            <Input label="Végzés" type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} />
            <Input label="Címke" value={shiftForm.label ?? ""} onChange={(event) => setShiftForm({ ...shiftForm, label: event.target.value })} />
            <Input label="Megjegyzés" value={shiftForm.note ?? ""} onChange={(event) => setShiftForm({ ...shiftForm, note: event.target.value })} />
          </div>
          {error ? <p className="text-sm font-semibold text-red">{error}</p> : null}
          <div className="flex gap-2">
            <Button disabled={!isDraft} onClick={saveShift}>{editingShiftId ? "Mentés" : "Műszak létrehozása"}</Button>
            {editingShiftId ? <Button variant="ghost" onClick={() => setEditingShiftId(null)}>Mégse</Button> : null}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-7">
        {shiftsByDate.map(([date, shifts]) => (
          <Card key={date} className="space-y-3">
            <h3 className="font-bold">{date}</h3>
            {shifts.map((shift) => (
              <div key={shift.id} className="rounded-md bg-cream p-3">
                <p className="font-bold">{shift.startTime}-{shift.endTime}</p>
                <p className="text-sm text-brown/70">{shift.label || "Műszak"}</p>
                <div className="mt-2 space-y-1">
                  {shift.assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{assignment.user.firstName} {assignment.user.lastName}</span>
                      <button disabled={!isDraft} className="font-bold text-red disabled:opacity-40" type="button" onClick={() => week && unassignShift(assignment.id).then(() => loadWeek(week.id))}>
                        Levétel
                      </button>
                    </div>
                  ))}
                </div>
                <Select
                  label="Dolgozó"
                  value={selectedUsers[shift.id] ?? ""}
                  onChange={(event) => setSelectedUsers({ ...selectedUsers, [shift.id]: event.target.value })}
                  options={[
                    { value: "", label: "Valassz dolgozót" },
                    ...employees.map((employee) => ({
                      value: employee.id,
                      label: `${employee.firstName} ${employee.lastName} Â· ${employee.workerType ?? employee.employeeSubRole} Â· ${employee.contractHours?.replace("HOURS_", "")} óra`
                    }))
                  ]}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    disabled={!isDraft || !selectedUsers[shift.id]}
                    onClick={() => {
                      const userId = selectedUsers[shift.id];
                      if (!week || !userId) return;
                      assignShift(shift.id, { userId }).then(() => loadWeek(week.id));
                    }}
                  >
                    Hozzárendelés
                  </Button>
                  <Button variant="ghost" disabled={!isDraft} onClick={() => editShift(shift)}>Szerkesztés</Button>
                  <Button variant="secondary" disabled={!isDraft} onClick={() => week && deleteShift(shift.id).then(() => loadWeek(week.id))}>Törlés</Button>
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </section>
  );
}

