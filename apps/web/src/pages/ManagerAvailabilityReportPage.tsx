import { type FormEvent, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  getClosedAvailabilitySubmissionWeeks,
  getFullTimeRequestsReport,
  getStudentWorkCoverageReport,
  type AvailabilitySubmissionWeek,
  type FullTimeRequestsReport,
  type StudentWorkCoverageReport
} from "../api/availability";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const dateFormatter = new Intl.DateTimeFormat("hu-HU", {
  month: "short",
  day: "numeric",
  weekday: "long",
  timeZone: "UTC"
});

const weekDateFormatter = new Intl.DateTimeFormat("hu-HU", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

const reportWeekdayNames = [
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap"
];

const monthNames = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December"
];

const weekdayNames = [
  "Vasárnap",
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat"
];

function contractHoursLabel(value: string | null) {
  if (value === "HOURS_4") return "4 órás";
  if (value === "HOURS_6") return "6 órás";
  if (value === "HOURS_8") return "8 órás";
  return "Nincs megadva";
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatDay(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00.000Z`));
}

function formatWeek(start: string) {
  return `${weekDateFormatter.format(new Date(`${start}T00:00:00.000Z`))} – ${weekDateFormatter.format(new Date(`${addDays(start, 6)}T00:00:00.000Z`))}`;
}

function formatAverage(value: number) {
  return value.toLocaleString("hu-HU", { maximumFractionDigits: 1 });
}

function getReportErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (message === "REPORT_REQUIRES_CLOSED_WEEKS") {
      return "A kiválasztott időszak minden érintett hetének lezártnak kell lennie.";
    }
    if (message === "REPORT_FROM_AFTER_TO") {
      return "A kezdődátum nem lehet későbbi a végdátumnál.";
    }
  }

  return "A kimutatás betöltése nem sikerült.";
}

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

type ManagerAvailabilityReportPageProps = {
  reportType: "student" | "full-time";
};

export function ManagerAvailabilityReportPage({
  reportType
}: ManagerAvailabilityReportPageProps) {
  const [closedWeeks, setClosedWeeks] = useState<AvailabilitySubmissionWeek[]>([]);
  const [selectedWeekStarts, setSelectedWeekStarts] = useState<string[]>([]);
  const [studentWeekYear, setStudentWeekYear] = useState(currentYear);
  const [studentWeekMonth, setStudentWeekMonth] = useState(0);
  const [showOlderWeeks, setShowOlderWeeks] = useState(false);
  const [studentReports, setStudentReports] = useState<StudentWorkCoverageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasClosedWeeks, setHasClosedWeeks] = useState(true);
  const [fullTimeYear, setFullTimeYear] = useState(currentYear);
  const [fullTimeMonth, setFullTimeMonth] = useState(currentMonth);
  const [fullTimeReport, setFullTimeReport] =
    useState<FullTimeRequestsReport | null>(null);
  const [selectedFullTimeUserId, setSelectedFullTimeUserId] = useState("");
  const [isFullTimeLoading, setIsFullTimeLoading] = useState(true);
  const [fullTimeError, setFullTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (reportType !== "student") {
      return;
    }

    getClosedAvailabilitySubmissionWeeks()
      .then((weeks) => {
        if (weeks.length === 0) {
          setHasClosedWeeks(false);
          return;
        }

        const sortedWeeks = [...weeks].sort((a, b) =>
          b.weekStartDate.localeCompare(a.weekStartDate)
        );
        const initialWeekStart = sortedWeeks[0]?.weekStartDate;
        if (!initialWeekStart) {
          setHasClosedWeeks(false);
          return;
        }
        setClosedWeeks(sortedWeeks);
        setSelectedWeekStarts([initialWeekStart]);
        setStudentWeekYear(Number(initialWeekStart.slice(0, 4)));
        return getStudentWorkCoverageReport({
          from: initialWeekStart,
          to: addDays(initialWeekStart, 6)
        }).then((data) => setStudentReports([data]));
      })
      .catch((loadError) => setError(getReportErrorMessage(loadError)))
      .finally(() => setIsLoading(false));
  }, [reportType]);

  useEffect(() => {
    if (reportType !== "full-time") {
      return;
    }

    getFullTimeRequestsReport({ year: currentYear, month: currentMonth })
      .then((data) => {
        setFullTimeReport(data);
        setSelectedFullTimeUserId(data.employees[0]?.userId ?? "");
      })
      .catch((loadError) => setFullTimeError(getReportErrorMessage(loadError)))
      .finally(() => setIsFullTimeLoading(false));
  }, [reportType]);

  async function handleStudentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selectedWeekStarts.length === 0) {
      setError("Válassz ki legalább egy lezárt hetet.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await Promise.all(
        selectedWeekStarts.map((weekStart) =>
          getStudentWorkCoverageReport({
            from: weekStart,
            to: addDays(weekStart, 6)
          })
        )
      );
      setStudentReports(data);
    } catch (loadError) {
      setError(getReportErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFullTimeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFullTimeError(null);
    setIsFullTimeLoading(true);

    try {
      const data = await getFullTimeRequestsReport({
        year: fullTimeYear,
        month: fullTimeMonth
      });
      setFullTimeReport(data);
      setSelectedFullTimeUserId((current) =>
        data.employees.some((employee) => employee.userId === current)
          ? current
          : data.employees[0]?.userId ?? ""
      );
    } catch (loadError) {
      setFullTimeError(getReportErrorMessage(loadError));
    } finally {
      setIsFullTimeLoading(false);
    }
  }

  const selectedFullTimeEmployee = fullTimeReport?.employees.find(
    (employee) => employee.userId === selectedFullTimeUserId
  );

  const studentWeekYears = useMemo(
    () =>
      [...new Set(closedWeeks.map((week) => Number(week.weekStartDate.slice(0, 4))))]
        .sort((a, b) => b - a),
    [closedWeeks]
  );

  const filteredClosedWeeks = useMemo(
    () =>
      closedWeeks.filter((week) => {
        const date = new Date(`${week.weekStartDate}T00:00:00.000Z`);
        return (
          date.getUTCFullYear() === studentWeekYear &&
          (studentWeekMonth === 0 || date.getUTCMonth() + 1 === studentWeekMonth)
        );
      }),
    [closedWeeks, studentWeekMonth, studentWeekYear]
  );

  const displayedClosedWeeks = showOlderWeeks
    ? filteredClosedWeeks
    : filteredClosedWeeks.slice(0, 8);

  const studentChartDays = useMemo(
    () =>
      reportWeekdayNames.map((name, dayIndex) => {
        const reportsForDay = studentReports
          .map((studentReport) => studentReport.days[dayIndex])
          .filter((day) => day !== undefined);
        const divisor = reportsForDay.length || 1;
        const averageAvailable =
          reportsForDay.reduce((sum, day) => sum + day.availableStudents, 0) /
          divisor;
        const averageTotal =
          reportsForDay.reduce((sum, day) => sum + day.totalStudents, 0) / divisor;
        const percentage =
          reportsForDay.reduce((sum, day) => sum + day.percentage, 0) / divisor;

        return { name, averageAvailable, averageTotal, percentage };
      }),
    [studentReports]
  );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">
          {reportType === "student"
            ? "Diákráérés report"
            : "Állandós kérelem report"}
        </h2>
        <p className="mt-1 text-sm text-brown/70">
          {reportType === "student"
            ? "Lezárt ráérési hetek diákokra vonatkozó összesített adatai."
            : "Az állandós dolgozók saját maguk által rögzített havi eltérései."}
        </p>
      </div>

      <div className="space-y-5">
        {reportType === "student" ? (
          <Card>
          <div>
            <h3 className="text-lg font-bold">Diákok napi vállalási aránya</h3>
            <p className="mt-1 text-sm text-brown/65">
              Megmutatja, hogy az aktív diákok közül naponta hányan jelöltek
              bármilyen munkavállalási lehetőséget.
            </p>
          </div>

          {hasClosedWeeks ? (
            <>
              <form
                className="mt-5"
                onSubmit={handleStudentSubmit}
              >
                <fieldset>
                  <legend className="text-sm font-bold">Lezárt hetek</legend>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {[4, 8].map((count) => (
                      <button
                        key={count}
                        type="button"
                        className="rounded-full border border-brown/15 bg-white px-3 py-1.5 text-xs font-bold hover:border-red/40"
                        onClick={() => {
                          const recentWeeks = closedWeeks.slice(0, count);
                          setSelectedWeekStarts(
                            recentWeeks.map((week) => week.weekStartDate)
                          );
                          if (recentWeeks[0]) {
                            setStudentWeekYear(
                              Number(recentWeeks[0].weekStartDate.slice(0, 4))
                            );
                          }
                          setStudentWeekMonth(0);
                          setShowOlderWeeks(false);
                        }}
                      >
                        Utolsó {count} hét
                      </button>
                    ))}
                    <button
                      type="button"
                      className="rounded-full border border-brown/15 bg-white px-3 py-1.5 text-xs font-bold hover:border-red/40"
                      onClick={() => {
                        setStudentWeekYear(currentYear);
                        setStudentWeekMonth(0);
                        setShowOlderWeeks(false);
                        setSelectedWeekStarts(
                          closedWeeks
                            .filter(
                              (week) =>
                                Number(week.weekStartDate.slice(0, 4)) === currentYear
                            )
                            .map((week) => week.weekStartDate)
                        );
                      }}
                    >
                      Aktuális év
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="grid gap-1 text-xs font-bold">
                      Év
                      <select
                        value={studentWeekYear}
                        className="rounded-md border border-brown/20 bg-white px-3 py-2 text-sm font-normal"
                        onChange={(event) => {
                          setStudentWeekYear(Number(event.target.value));
                          setShowOlderWeeks(false);
                        }}
                      >
                        {studentWeekYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold">
                      Hónap
                      <select
                        value={studentWeekMonth}
                        className="rounded-md border border-brown/20 bg-white px-3 py-2 text-sm font-normal"
                        onChange={(event) => {
                          setStudentWeekMonth(Number(event.target.value));
                          setShowOlderWeeks(false);
                        }}
                      >
                        <option value={0}>Minden hónap</option>
                        {monthNames.map((month, index) => (
                          <option key={month} value={index + 1}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-3 pb-2 text-xs font-bold">
                      <button
                        type="button"
                        className="text-red hover:underline"
                        onClick={() =>
                          setSelectedWeekStarts(
                            filteredClosedWeeks.map((week) => week.weekStartDate)
                          )
                        }
                      >
                        Szűrt hetek kijelölése
                      </button>
                      <button
                        type="button"
                        className="text-brown/60 hover:underline"
                        onClick={() => setSelectedWeekStarts([])}
                      >
                        Kijelölés törlése
                      </button>
                    </div>
                  </div>

                  {selectedWeekStarts.length > 0 ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {selectedWeekStarts.map((weekStart) => (
                        <span
                          key={weekStart}
                          className="flex shrink-0 items-center gap-2 rounded-full bg-red/10 px-3 py-1 text-xs font-bold text-red"
                        >
                          {formatWeek(weekStart)}
                          <button
                            type="button"
                            aria-label={`${formatWeek(weekStart)} eltávolítása`}
                            className="text-base leading-none"
                            onClick={() =>
                              setSelectedWeekStarts((current) =>
                                current.filter((item) => item !== weekStart)
                              )
                            }
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-2 rounded-md border border-brown/15 bg-cream/40 p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {displayedClosedWeeks.map((week) => {
                      const isSelected = selectedWeekStarts.includes(week.weekStartDate);
                      return (
                        <label
                          key={week.weekStartDate}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                            isSelected
                              ? "border-red/40 bg-white font-bold"
                              : "border-transparent bg-white/60 text-brown/70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            className="accent-red"
                            onChange={() =>
                              setSelectedWeekStarts((current) =>
                                isSelected
                                  ? current.filter(
                                      (weekStart) => weekStart !== week.weekStartDate
                                    )
                                  : [...current, week.weekStartDate]
                              )
                            }
                          />
                          {formatWeek(week.weekStartDate)}
                        </label>
                      );
                    })}
                    {filteredClosedWeeks.length === 0 ? (
                      <p className="text-sm text-brown/60 sm:col-span-2 lg:col-span-3">
                        Ehhez a szűréshez nincs lezárt hét.
                      </p>
                    ) : null}
                  </div>

                  {filteredClosedWeeks.length > 8 ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-bold text-red hover:underline"
                      onClick={() => setShowOlderWeeks((current) => !current)}
                    >
                      {showOlderWeeks
                        ? "Korábbi hetek elrejtése"
                        : `Korábbi hetek megjelenítése (${filteredClosedWeeks.length - 8})`}
                    </button>
                  ) : null}
                </fieldset>
                <div className="mt-3 flex items-center gap-3">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Betöltés..." : "Kimutatás frissítése"}
                  </Button>
                  <span className="text-sm text-brown/60">
                    {selectedWeekStarts.length} hét kiválasztva
                  </span>
                </div>
              </form>

              {error ? (
                <p className="mt-4 rounded-md bg-red/10 px-3 py-2 text-sm font-bold text-red">
                  {error}
                </p>
              ) : null}

              {studentReports.length > 0 ? (
                <div className="mt-6">
                  <div className="mb-4 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-cream px-3 py-1 font-bold">
                      {formatAverage(studentChartDays[0]?.averageTotal ?? 0)} aktív diák
                    </span>
                    <span className="rounded-full bg-cream px-3 py-1">
                      {studentReports.length === 1
                        ? "1 lezárt hét"
                        : `${studentReports.length} lezárt hét átlaga`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[700px] rounded-xl border border-brown/10 bg-cream/30 px-5 pb-4 pt-6">
                      <div className="grid h-72 grid-cols-7 gap-3 border-b border-brown/15">
                        {studentChartDays.map((day) => (
                          <div
                            key={day.name}
                            className="flex min-w-0 flex-col items-center justify-end"
                          >
                            <div className="mb-2 text-center">
                              <div className="font-bold text-brown">
                                {formatAverage(day.averageAvailable)} fő
                              </div>
                              <div className="text-xs font-bold text-red">
                                {formatAverage(day.percentage)}%
                              </div>
                            </div>
                            <div className="flex h-48 w-full max-w-16 items-end overflow-hidden rounded-t-md bg-brown/5">
                              <div
                                className="w-full rounded-t-md bg-red transition-[height] duration-300"
                                style={{ height: `${day.percentage}%` }}
                                title={`${day.name}: ${formatAverage(day.averageAvailable)} / ${formatAverage(day.averageTotal)} fő (${formatAverage(day.percentage)}%)`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-3 pt-3 text-center text-xs font-bold sm:text-sm">
                        {studentChartDays.map((day) => (
                          <span key={day.name}>{day.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-brown/60">
                    Az oszlopok azt mutatják, hogy az aktív diákok közül az adott
                    hétköznapon hányan vállaltak bármilyen műszakot. Több hét
                    kiválasztásakor a létszám és az arány a kiválasztott hetek átlaga.
                  </p>
                </div>
              ) : null}
            </>
          ) : isLoading ? (
            <p className="mt-5 text-sm text-brown/65">Lezárt hetek betöltése...</p>
          ) : (
            <p className="mt-5 rounded-md bg-cream px-3 py-3 text-sm font-bold">
              Még nincs lezárt ráérési hét, amelyből kimutatás készíthető.
            </p>
          )}
          </Card>
        ) : null}

        {reportType === "full-time" ? (
          <Card>
          <div>
            <h3 className="text-lg font-bold">Állandós-kérelmek</h3>
            <p className="mt-1 text-sm text-brown/65">
              Saját maguk által rögzített eltérések az alapértelmezett, egész napos
              rugalmas ráéréshez képest. A manageri módosítások és a szabadságok nem
              számítanak bele.
            </p>
          </div>

          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={handleFullTimeSubmit}
          >
            <label className="grid gap-1 text-sm font-bold">
              Év
              <input
                type="number"
                min={2000}
                max={2100}
                value={fullTimeYear}
                className="w-32 rounded-md border border-brown/20 bg-white px-3 py-2 font-normal"
                onChange={(event) => setFullTimeYear(Number(event.target.value))}
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Hónap
              <select
                value={fullTimeMonth}
                className="rounded-md border border-brown/20 bg-white px-3 py-2 font-normal"
                onChange={(event) => setFullTimeMonth(Number(event.target.value))}
              >
                {monthNames.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={isFullTimeLoading}>
              {isFullTimeLoading ? "Betöltés..." : "Kimutatás"}
            </Button>
          </form>

          {fullTimeError ? (
            <p className="mt-4 rounded-md bg-red/10 px-3 py-2 text-sm font-bold text-red">
              {fullTimeError}
            </p>
          ) : null}

          {fullTimeReport ? (
            fullTimeReport.employees.length > 0 ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,2fr)]">
                <div>
                  <h4 className="mb-3 font-bold">Ranglista</h4>
                  <div className="space-y-2">
                    {fullTimeReport.employees.map((employee, index) => (
                      <button
                        key={employee.userId}
                        type="button"
                        className={[
                          "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition",
                          selectedFullTimeUserId === employee.userId
                            ? "bg-brown text-cream"
                            : "bg-cream hover:bg-brown/10"
                        ].join(" ")}
                        onClick={() => setSelectedFullTimeUserId(employee.userId)}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 font-bold text-brown">
                          {index + 1}.
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">
                            {employee.lastName} {employee.firstName}
                          </span>
                          <span className="block text-xs opacity-70">
                            {contractHoursLabel(employee.contractHours)}
                          </span>
                        </span>
                        <span className="shrink-0 text-lg font-bold">
                          {employee.totalRequests}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedFullTimeEmployee ? (
                  <div className="min-w-0">
                    <label className="grid gap-1 text-sm font-bold">
                      Dolgozó
                      <select
                        value={selectedFullTimeUserId}
                        className="w-full rounded-md border border-brown/20 bg-white px-3 py-2 font-normal"
                        onChange={(event) =>
                          setSelectedFullTimeUserId(event.target.value)
                        }
                      >
                        {fullTimeReport.employees.map((employee) => (
                          <option key={employee.userId} value={employee.userId}>
                            {employee.lastName} {employee.firstName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Összes kérelem", selectedFullTimeEmployee.totalRequests],
                        ["Hétköznap", selectedFullTimeEmployee.weekdayRequests],
                        ["Hétvégén", selectedFullTimeEmployee.weekendRequests],
                        ["Pihenőnap", selectedFullTimeEmployee.offRequests],
                        ["Idősávos", selectedFullTimeEmployee.timeRangeRequests]
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md bg-cream p-3">
                          <p className="text-xs text-brown/65">{label}</p>
                          <p className="mt-1 text-2xl font-bold">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <h5 className="font-bold">Eloszlás a hét napjai szerint</h5>
                      <div className="mt-3 space-y-2">
                        {selectedFullTimeEmployee.weekdayDistribution.map((day) => {
                          const maxCount = Math.max(
                            1,
                            ...selectedFullTimeEmployee.weekdayDistribution.map(
                              (item) => item.count
                            )
                          );
                          return (
                            <div
                              key={day.dayOfWeek}
                              className="grid grid-cols-[90px_1fr_28px] items-center gap-3 text-sm"
                            >
                              <span>{weekdayNames[day.dayOfWeek]}</span>
                              <div className="h-2.5 overflow-hidden rounded-full bg-cream">
                                <div
                                  className="h-full rounded-full bg-red"
                                  style={{ width: `${(day.count / maxCount) * 100}%` }}
                                />
                              </div>
                              <span className="text-right font-bold">{day.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6">
                      <h5 className="font-bold">Kérelmek részletesen</h5>
                      {selectedFullTimeEmployee.requests.length > 0 ? (
                        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                          {selectedFullTimeEmployee.requests.map((request) => (
                            <div
                              key={request.date}
                              className="grid gap-3 rounded-md border border-brown/10 px-3 py-3 text-sm sm:grid-cols-[minmax(140px,1fr)_minmax(170px,1fr)_minmax(180px,1.4fr)_auto] sm:items-center"
                            >
                              <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wide text-brown/50">
                                  Dátum
                                </span>
                                <span className="font-bold">{formatDay(request.date)}</span>
                              </div>
                              <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wide text-brown/50">
                                  Kérvény típusa
                                </span>
                                <span className="font-semibold">
                                  {request.type === "OFF"
                                    ? "Pihenőnap"
                                    : `Idősáv · ${request.startTime ?? "--:--"}–${request.endTime ?? "--:--"}`}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wide text-brown/50">
                                  Megjegyzés
                                </span>
                                <span className={request.note ? "text-brown/70" : "text-brown/40"}>
                                  {request.note ?? "Nincs megjegyzés"}
                                </span>
                              </div>
                              <span
                                className={`w-fit rounded-full px-2 py-0.5 text-xs font-bold sm:justify-self-end ${
                                  request.isWeekend
                                    ? "bg-red/10 text-red"
                                    : "bg-green/10 text-green"
                                }`}
                              >
                                {request.isWeekend ? "Hétvége" : "Hétköznap"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-md bg-cream px-3 py-3 text-sm">
                          Ebben a hónapban nem volt saját eltérése az egész napos
                          rugalmas ráéréshez képest.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 rounded-md bg-cream px-3 py-3 text-sm font-bold">
                Nincs aktív állandós dolgozó.
              </p>
            )
          ) : null}
          </Card>
        ) : null}
      </div>
    </section>
  );
}
