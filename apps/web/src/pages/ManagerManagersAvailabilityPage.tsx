import { useEffect, useState } from "react";
import {
  getTeamAvailability,
  type AvailabilityDay,
  type TeamAvailabilityResponse
} from "../api/availability";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { getCurrentMonthValue, getMonthWeeks } from "../utils/date";

type TeamUser = TeamAvailabilityResponse["users"][number];

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

function sortByName(users: TeamUser[]) {
  return [...users].sort((left, right) => {
    const leftName = `${left.lastName} ${left.firstName}`;
    const rightName = `${right.lastName} ${right.firstName}`;
    return leftName.localeCompare(rightName, "hu-HU");
  });
}

export function ManagerManagersAvailabilityPage() {
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [team, setTeam] = useState<TeamAvailabilityResponse | null>(null);

  const monthStartDate = `${month}-01`;
  const weeks = getMonthWeeks(monthStartDate);
  const managers = sortByName(team?.users ?? []);

  async function load() {
    const teamData = await getTeamAvailability({
      monthStartDate,
      employeeSubRole: "MANAGER"
    });
    setTeam(teamData);
  }

  useEffect(() => {
    load();
  }, [month]);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Manager ráérések</h2>
        <p className="mt-1 text-sm text-brown/70">
          Havi áttekintés, hetekre bontva.
        </p>
      </div>

      <Card>
        <div className="max-w-sm">
          <Input
            label="Hónap"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
      </Card>

      <div className="space-y-4">
        {weeks.map((week, weekIndex) => (
          <Card key={weekIndex} className="overflow-hidden p-0">
            <div className="border-b border-brown/10 bg-cream/80 px-3 py-2">
              <h3 className="text-sm font-bold">{weekIndex + 1}. hét</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="bg-brown text-cream">
                    <th className="sticky left-0 z-10 w-56 bg-brown px-3 py-3 text-left">
                      Manager
                    </th>
                    {week.map((date, dayIndex) => (
                      <th
                        key={`${weekIndex}-${dayIndex}`}
                        className="min-w-24 border-l border-cream/20 px-2 py-2 text-center"
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
                  {managers.map((user) => (
                    <tr key={user.id} className="border-t border-brown/10">
                      <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top shadow-[8px_0_16px_rgba(80,35,20,0.08)]">
                        <div className="font-bold">
                          {user.lastName} {user.firstName}
                        </div>
                      </th>
                      {week.map((date, dayIndex) => {
                        if (!date) {
                          return (
                            <td
                              key={`${user.id}-${dayIndex}`}
                              className="border-l border-brown/10 bg-brown/5 p-1"
                            />
                          );
                        }

                        const day = user.availability.days.find(
                          (item) => item.date === date
                        );
                        const style = getCellStyle(day);
                        return (
                          <td key={date} className="border-l border-brown/10 p-1 align-top">
                            <div className={`min-h-10 w-full rounded-md px-1.5 py-1 text-center text-xs font-bold leading-tight ${style.className}`}>
                              <span>{style.label}</span>
                              {day?.note ? (
                                <span className="mt-1 block text-xs font-normal opacity-75">
                                  {day.note}
                                </span>
                              ) : null}
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
        ))}
      </div>
    </section>
  );
}
