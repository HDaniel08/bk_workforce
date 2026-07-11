import { useEffect, useState } from "react";
import { getDeletedUsers, restoreUser, type ManagedUser } from "../api/users";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { employeeSubRoleLabel, workerTypeLabel } from "../utils/status-labels";

export function SuperadminDeletedUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function load() {
    try {
      setUsers(await getDeletedUsers());
      setError(null);
    } catch {
      setError("A törölt dolgozók betöltése nem sikerült");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleRestore(user: ManagedUser) {
    setRestoringId(user.id);
    try {
      await restoreUser(user.id);
      await load();
    } catch {
      setError("A dolgozó visszaállítása nem sikerült");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-2xl font-bold">Törölt dolgozók</h2>
        <p className="mt-1 text-sm text-brown/65">
          A visszaállított dolgozók inaktív állapotban kerülnek vissza a normál listába.
        </p>
      </div>
      {error ? <p className="mb-4 text-sm font-semibold text-red">{error}</p> : null}
      <div className="space-y-3">
        {users.length === 0 && !error ? <Card>Nincs törölt dolgozó.</Card> : null}
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{user.lastName} {user.firstName}</h3>
                  <Badge>{employeeSubRoleLabel(user.employeeSubRole ?? user.role)}</Badge>
                  <Badge tone="red">Törölt</Badge>
                </div>
                <p className="mt-1 text-sm text-brown/60">
                  {user.email} · {user.tenantName ?? "Nincs tenant"} · {workerTypeLabel(user.workerType) || "n/a"}
                </p>
                {user.deletedAt ? (
                  <p className="mt-1 text-xs text-brown/50">
                    Törölve: {new Date(user.deletedAt).toLocaleString("hu-HU")}
                  </p>
                ) : null}
              </div>
              <Button disabled={restoringId === user.id} onClick={() => handleRestore(user)}>
                {restoringId === user.id ? "Visszaállítás…" : "Visszaállítás"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
