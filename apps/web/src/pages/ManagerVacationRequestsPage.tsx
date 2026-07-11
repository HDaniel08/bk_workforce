import { useEffect, useState } from "react";
import { getUsers, type ManagedUser } from "../api/users";
import {
  approveVacationRequest,
  getVacationRequests,
  rejectVacationRequest,
  type VacationRequest
} from "../api/vacation-requests";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import {
  vacationRequestStatusLabel,
  workerTypeLabel,
  employeeSubRoleLabel
} from "../utils/status-labels";
import { formatDateOnly, getCurrentMonthValue } from "../utils/date";

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return null;
  }

  return {
    from: `${month}-01`,
    to: formatDateOnly(new Date(year, monthNumber, 0))
  };
}

function statusTone(status: VacationRequest["status"]) {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED" || status === "CANCELLED") return "red";
  return "brown";
}

export function ManagerVacationRequestsPage() {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (userId) params.userId = userId;
    const monthRange = getMonthRange(month);
    if (monthRange) {
      params.from = monthRange.from;
      params.to = monthRange.to;
    }
    setRequests(await getVacationRequests(params));
  }

  useEffect(() => {
    getUsers({ isActive: "true" }).then(setUsers);
  }, []);

  useEffect(() => {
    load();
  }, [status, userId, month]);

  async function review(id: string, action: "approve" | "reject") {
    setError(null);
    try {
      const payload = { reviewerNote: notes[id] };
      if (action === "approve") {
        await approveVacationRequest(id, payload);
      } else {
        await rejectVacationRequest(id, payload);
      }
      await load();
    } catch {
      setError(
        "Csak függőben lévő vagy még el nem kezdődött elfogadott kérelem utasítható el."
      );
    }
  }

  return (
    <section className="space-y-5">
      <Card className="grid gap-3 md:grid-cols-3">
        <Select
          label="Státusz"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: "", label: "Összes" },
            { value: "PENDING", label: "Függőben" },
            { value: "APPROVED", label: "Elfogadva" },
            { value: "REJECTED", label: "Elutasítva" },
            { value: "CANCELLED", label: "Visszavonva" }
          ]}
        />
        <Select
          label="Dolgozó"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          options={[
            { value: "", label: "Összes" },
            ...users.map((user) => ({
              value: user.id,
              label: `${user.lastName} ${user.firstName}`
            }))
          ]}
        />
        <Input
          label="Év és hónap (a szabadság kezdete szerint)"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </Card>

      {error ? <p className="font-semibold text-red">{error}</p> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{request.requesterName}</h3>
                <p className="text-sm text-brown/60">
                  {workerTypeLabel(request.requester.workerType) ||
                    employeeSubRoleLabel(request.requester.employeeSubRole)} · {request.requester.contractHours?.replace("HOURS_", "") ?? "?"} óra
                </p>
                <p className="mt-2 text-sm">{request.startDate} - {request.endDate}</p>
                <p className="text-sm text-brown/70">{request.reason}</p>
              </div>
              <Badge tone={statusTone(request.status)}>
                {vacationRequestStatusLabel(request.status)}
              </Badge>
            </div>
            {request.reviewerNote ? (
              <p className="mt-3 text-sm text-brown/70">{request.reviewerNote}</p>
            ) : null}
            {request.status === "PENDING" ||
            (request.status === "APPROVED" &&
              request.startDate >
                new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
                  .toISOString()
                  .slice(0, 10)) ? (
              <div className="mt-4 space-y-3">
                <Input
                  label="Bírálói megjegyzés"
                  value={notes[request.id] ?? ""}
                  onChange={(event) => setNotes({ ...notes, [request.id]: event.target.value })}
                />
                <div className="flex gap-2">
                  {request.status === "PENDING" ? (
                    <Button onClick={() => review(request.id, "approve")}>Jóváhagyás</Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => review(request.id, "reject")}>
                    {request.status === "APPROVED"
                      ? "Elfogadás visszavonása"
                      : "Elutasítás"}
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

