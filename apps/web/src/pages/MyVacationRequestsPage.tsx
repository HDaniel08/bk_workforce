import { useEffect, useState } from "react";
import {
  cancelVacationRequest,
  createVacationRequest,
  getMyVacationRequests,
  type VacationRequest
} from "../api/vacation-requests";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { vacationRequestStatusLabel } from "../utils/status-labels";

const today = new Date().toISOString().slice(0, 10);

function statusTone(status: VacationRequest["status"]) {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED" || status === "CANCELLED") return "red";
  return "brown";
}

export function MyVacationRequestsPage() {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRequests(await getMyVacationRequests());
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    setError(null);
    if (startDate < today) {
      setError("Múltbeli dátum nem választható");
      return;
    }
    if (endDate < startDate) {
      setError("A vége nem lehet korábbi, mint a kezdete");
      return;
    }
    try {
      await createVacationRequest({ startDate, endDate, reason });
      setReason("");
      await load();
    } catch {
      setError("Átfedő kérelem van, vagy a kérelem nem menthető");
    }
  }

  return (
    <section className="space-y-5">
      <Card className="space-y-4">
        <h2 className="text-2xl font-bold">Szabadságkérelmeim</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Kezdete" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input label="Vége" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <Input label="Indok" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        {error ? <p className="text-sm font-semibold text-red">{error}</p> : null}
        <Button onClick={submit}>Kérelem leadása</Button>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-brown/60">{request.startDate} - {request.endDate}</p>
                <h3 className="mt-1 font-bold">{request.reason || "Szabadság"}</h3>
              </div>
              <Badge tone={statusTone(request.status)}>
                {vacationRequestStatusLabel(request.status)}
              </Badge>
            </div>
            {request.reviewerNote ? (
              <p className="mt-3 text-sm text-brown/70">{request.reviewerNote}</p>
            ) : null}
            {request.status === "PENDING" ? (
              <Button className="mt-4" variant="ghost" onClick={() => cancelVacationRequest(request.id).then(load)}>
                Visszavonás
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

