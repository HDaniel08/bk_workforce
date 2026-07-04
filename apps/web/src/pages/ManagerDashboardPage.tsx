import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, type ManagedUser } from "../api/users";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { authStore } from "../store/auth-store";

export function ManagerDashboardPage() {
  const user = authStore.getUser();
  const [users, setUsers] = useState<ManagedUser[]>([]);

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Manager dashboard</h2>
        <p className="mt-1 text-sm text-brown/70">
          Tenant: {user?.tenantName ?? user?.tenantSlug ?? "Saját tenant"}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-brown/65">Dolgozók száma</p>
          <p className="mt-2 text-3xl font-bold">{users.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-brown/65">Aktív dolgozók</p>
          <p className="mt-2 text-3xl font-bold">{users.filter((item) => item.isActive).length}</p>
        </Card>
      </div>
      <Link to="/manager/users">
        <Button>Dolgozók kezelése</Button>
      </Link>
    </section>
  );
}

