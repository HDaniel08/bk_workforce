import type { AvailabilityDay } from "../../api/availability";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

interface AvailabilityDayEditorProps {
  day: AvailabilityDay;
  onChange: (day: AvailabilityDay) => void;
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export function AvailabilityDayEditor({ day, onChange }: AvailabilityDayEditorProps) {
  const isWork = day.type === "WORK";
  const isTimeRange = isWork && day.workPreference === "TIME_RANGE";
  const editableType = day.type === "VACATION" ? "OFF" : day.type;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">{formatDateLabel(day.date)}</h3>
      </div>
      <Select
        label="Nap típusa"
        value={editableType}
        onChange={(event) => {
          const type = event.target.value as AvailabilityDay["type"];
          onChange({
            ...day,
            type,
            workPreference: type === "WORK" ? day.workPreference ?? "ANYTIME" : null,
            startTime: null,
            endTime: null
          });
        }}
        options={[
          { value: "OFF", label: "Pihenőnap" },
          { value: "WORK", label: "Munka" }
        ]}
      />
      {isWork ? (
        <Select
          label="Munka preferencia"
          value={day.workPreference ?? "ANYTIME"}
          onChange={(event) => {
            const workPreference = event.target
              .value as AvailabilityDay["workPreference"];
            onChange({
              ...day,
              workPreference,
              startTime: workPreference === "TIME_RANGE" ? day.startTime : null,
              endTime: workPreference === "TIME_RANGE" ? day.endTime : null
            });
          }}
          options={[
            { value: "ANYTIME", label: "Bárhogy" },
            { value: "TIME_RANGE", label: "Időponttal" }
          ]}
        />
      ) : null}
      {isTimeRange ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Kezdés"
            type="time"
            value={day.startTime ?? ""}
            onChange={(event) => onChange({ ...day, startTime: event.target.value })}
          />
          <Input
            label="Végzés"
            type="time"
            value={day.endTime ?? ""}
            onChange={(event) => onChange({ ...day, endTime: event.target.value })}
          />
        </div>
      ) : null}
      <Input
        label="Megjegyzés"
        value={day.note}
        onChange={(event) => onChange({ ...day, note: event.target.value })}
      />
    </Card>
  );
}

