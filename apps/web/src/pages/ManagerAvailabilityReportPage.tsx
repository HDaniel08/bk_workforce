import { type FormEvent, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  getClosedAvailabilitySubmissionWeeks,
  getFullTimeRequestsReport,
  getStudentWorkCoverageReport,
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

function getReportErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (message === "REPORT_REQUIRES_CLOSED_WEEKS") {
      return "A kiválasztott időszak minden érintett hetének lezártnak kell lennie.";
    }
    if (message === "REPORT_FROM_AFTER_TO") {
      return "A kezdődátum nem lehet későbbi a végdátumnál.";
    }
    if (message === "REPORT_RANGE_AFTER_CURRENT_WEEK") {
      return "A kimutatás legfeljebb az aktuális hét végéig kérhető le.";
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [report, setReport] = useState<StudentWorkCoverageReport | null>(null);
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

        const weekStarts = weeks.map((week) => week.weekStartDate).sort();
        const initialFrom = weekStarts.at(-1);
        const earliestFrom = weekStarts[0];
        if (!initialFrom || !earliestFrom) {
          setHasClosedWeeks(false);
          return;
        }
        const initialTo = addDays(initialFrom, 6);
        setMinDate(earliestFrom);
        setMaxDate(initialTo);
        setFrom(initialFrom);
        setTo(initialTo);
        return getStudentWorkCoverageReport({ from: initialFrom, to: initialTo }).then(
          setReport
        );
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!from || !to) {
      setError("Add meg a kezdő- és végdátumot.");
      return;
    }

    if (from > to) {
      setError("A kezdődátum nem lehet későbbi a végdátumnál.");
      return;
    }

    setIsLoading(true);
    try {
      setReport(await getStudentWorkCoverageReport({ from, to }));
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
                className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={handleSubmit}
              >
                <label className="grid gap-1 text-sm font-bold">
                  Ettől
                  <input
                    type="date"
                    value={from}
                    min={minDate}
                    max={maxDate}
                    className="rounded-md border border-brown/20 bg-white px-3 py-2 font-normal"
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Eddig
                  <input
                    type="date"
                    value={to}
                    min={from || minDate}
                    max={maxDate}
                    className="rounded-md border border-brown/20 bg-white px-3 py-2 font-normal"
                    onChange={(event) => setTo(event.target.value)}
                  />
                </label>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Betöltés..." : "Kimutatás"}
                </Button>
              </form>

              {error ? (
                <p className="mt-4 rounded-md bg-red/10 px-3 py-2 text-sm font-bold text-red">
                  {error}
                </p>
              ) : null}

              {report ? (
                <div className="mt-6">
                  <div className="mb-4 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-cream px-3 py-1 font-bold">
                      {report.totalStudents} aktív diák
                    </span>
                    <span className="rounded-full bg-cream px-3 py-1">
                      {report.from} – {report.to}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-brown/15 text-left">
                          <th className="px-2 py-3">Nap</th>
                          <th className="px-2 py-3 text-center">Vállalta</th>
                          <th className="px-2 py-3 text-center">Rögzítve</th>
                          <th className="w-2/5 px-2 py-3">Arány</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.days.map((day) => (
                          <tr key={day.date} className="border-b border-brown/10 last:border-0">
                            <th className="px-2 py-3 text-left font-semibold capitalize">
                              {formatDay(day.date)}
                            </th>
                            <td className="px-2 py-3 text-center font-bold">
                              {day.availableStudents} / {day.totalStudents} fő
                            </td>
                            <td className="px-2 py-3 text-center text-brown/70">
                              {day.recordedStudents} / {day.totalStudents} fő
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream">
                                  <div
                                    className="h-full rounded-full bg-red"
                                    style={{ width: `${day.percentage}%` }}
                                  />
                                </div>
                                <span className="w-11 text-right font-bold">
                                  {day.percentage}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-xs text-brown/60">
                    A „Vállalta” oszlop a WORK napokat, a „Rögzítve” oszlop az
                    adott napra mentett bármilyen ráérési adatot számolja.
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
                              className="flex flex-col gap-1 rounded-md border border-brown/10 px-3 py-2 text-sm sm:flex-row sm:items-center"
                            >
                              <span className="font-bold">{formatDay(request.date)}</span>
                              <span className="sm:ml-auto">
                                {request.type === "OFF"
                                  ? "Pihenőnap"
                                  : `${request.startTime ?? "--:--"}–${request.endTime ?? "--:--"}`}
                              </span>
                              {request.isWeekend ? (
                                <span className="w-fit rounded-full bg-red/10 px-2 py-0.5 text-xs font-bold text-red">
                                  Hétvége
                                </span>
                              ) : null}
                              {request.note ? (
                                <span className="text-xs text-brown/60 sm:basis-full">
                                  {request.note}
                                </span>
                              ) : null}
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
