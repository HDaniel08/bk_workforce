import { useEffect, useState } from "react";
import { getAuditLogs, type AuditLog } from "../api/audit-logs";
import { getTenants, type Tenant } from "../api/tenants";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";

export function SuperadminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [action, setAction] = useState("");
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    getTenants().then(setTenants);
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (action) params.action = action;
    if (tenantId) params.tenantId = tenantId;
    getAuditLogs(params).then(setLogs);
  }, [action, tenantId]);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Audit logok</h2>
        <p className="mt-1 text-sm text-brown/70">Rendszer es tenant szintu esemenyek.</p>
      </div>
      <Card className="grid gap-3 sm:grid-cols-2">
        <Input label="Action filter" value={action} onChange={(event) => setAction(event.target.value)} />
        <Select
          label="Tenant"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
          options={[{ value: "", label: "Összes tenant" }, ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))]}
        />
      </Card>
      <div className="space-y-3">
        {logs.map((log) => (
          <Card key={log.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{log.action}</p>
                <p className="text-sm text-brown/60">{log.tenantName ?? "Global"} Â· {log.actorName ?? "System"}</p>
              </div>
              <Badge>{new Date(log.createdAt).toLocaleString()}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

