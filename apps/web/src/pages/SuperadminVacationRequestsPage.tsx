import { useEffect, useState } from "react";
import { getTenants, type Tenant } from "../api/tenants";
import { getVacationRequests, type VacationRequest } from "../api/vacation-requests";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { vacationRequestStatusLabel } from "../utils/status-labels";

function statusTone(status: VacationRequest["status"]) {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED" || status === "CANCELLED") return "red";
  return "brown";
}

export function SuperadminVacationRequestsPage() {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    getTenants().then(setTenants);
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (tenantId) params.tenantId = tenantId;
    if (status) params.status = status;
    getVacationRequests(params).then(setRequests);
  }, [tenantId, status]);

  return (
    <section className="space-y-5">
      <Card className="grid gap-3 md:grid-cols-2">
        <Select
          label="Tenant"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
          options={[
            { value: "", label: "Összes tenant" },
            ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))
          ]}
        />
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
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-brown/60">{request.tenantName}</p>
                <h3 className="font-bold">{request.requesterName}</h3>
                <p className="mt-2 text-sm">{request.startDate} - {request.endDate}</p>
                <p className="text-sm text-brown/70">{request.reason}</p>
              </div>
              <Badge tone={statusTone(request.status)}>
                {vacationRequestStatusLabel(request.status)}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

