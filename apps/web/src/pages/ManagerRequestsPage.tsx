import { useEffect, useState } from "react";
import { createVacationRequest, getMyVacationRequests, cancelVacationRequest, type VacationRequest } from "../api/vacation-requests";
import { getMyManagerRequests, hasManagerRequestCollision, removeMyManagerRequest, saveMyManagerRequest, type ManagerDayRequest } from "../api/manager-schedules";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { getNextMonthValue } from "../utils/date";

const today = new Date().toISOString().slice(0, 10);
const nextMonth = getNextMonthValue();

export function ManagerRequestsPage() {
  const [month, setMonth] = useState(nextMonth);
  const [date, setDate] = useState(`${nextMonth}-01`);
  const [kind, setKind] = useState<"WORK" | "REST" | "VACATION">("WORK");
  const [note, setNote] = useState("");
  const [collision, setCollision] = useState(false);
  const [checkingCollision, setCheckingCollision] = useState(false);
  const [requests, setRequests] = useState<ManagerDayRequest[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load(selectedMonth = month) {
    const [dayRequests, vacationRequests] = await Promise.all([getMyManagerRequests(selectedMonth), getMyVacationRequests()]);
    setRequests(dayRequests);
    const [year, number] = selectedMonth.split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year ?? 0, number ?? 0, 1)).toISOString().slice(0, 10);
    setVacations(vacationRequests.filter((item) => item.startDate < nextMonth && item.endDate >= `${selectedMonth}-01`));
  }

  useEffect(() => { load().catch(() => setError("A kérelmek nem tölthetők be.")); }, [month]);
  useEffect(() => {
    let active = true;
    setCollision(false);
    setCheckingCollision(Boolean(date));
    if (date) hasManagerRequestCollision(date).then((exists) => { if (active) setCollision(exists); }).catch(() => {}).finally(() => { if (active) setCheckingCollision(false); });
    return () => { active = false; };
  }, [date]);

  async function save() {
    setError(""); setMessage("");
    if (!date || date < today) { setError("Múltbeli vagy hiányzó dátumra nem adhatsz le kérelmet."); return; }
    try {
      setCollision(await hasManagerRequestCollision(date));
      if (kind === "VACATION") await createVacationRequest({ startDate: date, endDate: date, reason: note });
      else await saveMyManagerRequest({ date, kind, note });
      setMonth(date.slice(0, 7));
      setMessage("Kérelem elmentve.");
      await load(date.slice(0, 7));
    } catch { setError("A kérelem nem menthető. Ellenőrizd, van-e már saját, átfedő szabadságkérelmed."); }
  }

  async function remove(dateToRemove: string) {
    setError("");
    try { await removeMyManagerRequest(dateToRemove); await load(); }
    catch { setError("A kérelem nem törölhető."); }
  }

  return <section className="space-y-5">
    <Card className="space-y-4">
      <h2 className="text-2xl font-bold">Managerkérelmeim</h2>
      <p className="text-sm text-brown/70">A szabadságkérelem egy másik manager jóváhagyására vár. A munka és pihenő beosztási igény.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Nap" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Select label="Kérelem" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} options={[{ value: "WORK", label: "Munka" }, { value: "REST", label: "Pihenő" }, { value: "VACATION", label: "Szabadság" }]} />
        <Input label="Megjegyzés (pl. nyit vagy off)" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
      </div>
      {collision ? <p role="status" className="rounded-md bg-amber-100 p-3 text-sm font-semibold text-brown">Erre a napra más manager már adott le kérelmet. A saját kérelmedet ettől még leadhatod.</p> : null}
      {error ? <p className="text-sm text-red">{error}</p> : null}
      {message ? <p className="text-sm text-green">{message}</p> : null}
      <Button disabled={checkingCollision} onClick={save}>{checkingCollision ? "Ütközés ellenőrzése…" : "Kérelem leadása"}</Button>
    </Card>
    <Card className="space-y-3">
      <Input label="Kérelmek hónapja" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      <div className="grid gap-2 md:grid-cols-2">
        {requests.map((item) => <div key={item.date} className="rounded-md border border-brown/10 p-3 text-sm">
          <strong>{item.date} · {item.kind === "WORK" ? "Munka" : "Pihenő"}</strong>
          {item.note ? <span> · {item.note}</span> : null}
          <Button className="ml-2" variant="ghost" onClick={() => remove(item.date)}>Törlés</Button>
        </div>)}
        {vacations.map((item) => <div key={item.id} className="rounded-md border border-brown/10 p-3 text-sm">
          <strong>{item.startDate}{item.endDate !== item.startDate ? `–${item.endDate}` : ""} · Szabadság · {item.status === "APPROVED" ? "Elfogadva" : item.status === "PENDING" ? "Függőben" : "Lezárva"}</strong>
          {item.reason ? <span> · {item.reason}</span> : null}
          {item.status === "PENDING" ? <Button className="ml-2" variant="ghost" onClick={() => cancelVacationRequest(item.id).then(() => load()).catch(() => setError("Nem sikerült visszavonni."))}>Visszavonás</Button> : null}
        </div>)}
      </div>
    </Card>
  </section>;
}
