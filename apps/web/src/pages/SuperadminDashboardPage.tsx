import { useEffect, useState } from "react";
import { getAuditLogs, type AuditLog } from "../api/audit-logs";
import { getTenants, type Tenant } from "../api/tenants";
import { getUsers } from "../api/users";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";

export function SuperadminDashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function load() {
      const [tenantData, userData, auditData] = await Promise.all([
        getTenants(),
        getUsers(),
        getAuditLogs()
      ]);

      setTenants(tenantData);
      setUserCount(userData.length);
      setLogs(auditData.slice(0, 5));
    }

    load();
  }, []);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Superadmin dashboard</h2>
        <p className="mt-1 text-sm text-brown/70">Tenantok és rendszeresemények áttekintése.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-brown/65">Tenantok száma</p>
          <p className="mt-2 text-3xl font-bold">{tenants.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-brown/65">Aktív tenantok</p>
          <p className="mt-2 text-3xl font-bold">{tenants.filter((tenant) => tenant.isActive).length}</p>
        </Card>
        <Card>
          <p className="text-sm text-brown/65">Összes user</p>
          <p className="mt-2 text-3xl font-bold">{userCount}</p>
        </Card>
      </div>
      <Card>
        <h3 className="text-lg font-bold">Utolso audit esemenyek</h3>
        <div className="mt-4 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 border-b border-brown/10 pb-3">
              <div>
                <p className="font-semibold">{log.action}</p>
                <p className="text-sm text-brown/60">{log.tenantName ?? "Global"} Â· {log.actorName ?? "System"}</p>
              </div>
              <Badge>{log.entityType}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

