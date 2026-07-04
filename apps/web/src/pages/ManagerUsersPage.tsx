import { useEffect, useState } from "react";
import { createUser, getUsers, updateUser, type ManagedUser, type UserInput } from "../api/users";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { employeeSubRoleLabel, workerTypeLabel } from "../utils/status-labels";

const emptyForm: UserInput = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  employeeSubRole: "WORKER",
  workerType: "STUDENT",
  contractHours: "HOURS_4"
};

export function ManagerUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<UserInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setUsers(await getUsers());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit() {
    setError(null);
    try {
      if (editingId) {
        const updateData = { ...form };
        delete updateData.email;
        await updateUser(editingId, updateData);
      } else {
        await createUser(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch {
      setError("Dolgozó mentési hiba");
    }
  }

  function editUser(user: ManagedUser) {
    setEditingId(user.id);
    setForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? "",
      employeeSubRole: user.employeeSubRole ?? "WORKER",
      workerType: user.workerType ?? "STUDENT",
      contractHours: user.contractHours ?? "HOURS_4",
      isActive: user.isActive
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card>
        <h2 className="text-xl font-bold">{editingId ? "Dolgozó szerkesztése" : "Új dolgozó"}</h2>
        <div className="mt-4 space-y-4">
          <Input label="Email" disabled={Boolean(editingId)} value={form.email ?? ""} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Input label="Keresztnév" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
          <Input label="Vezetéknév" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
          <Input label="Telefon" value={form.phone ?? ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <Select
            label="Szerződés szerinti napi óraszám"
            value={form.contractHours}
            onChange={(event) => setForm({ ...form, contractHours: event.target.value as UserInput["contractHours"] })}
            options={[
              { value: "HOURS_4", label: "4 óra" },
              { value: "HOURS_6", label: "6 óra" },
              { value: "HOURS_8", label: "8 óra" }
            ]}
          />
          <Select
            label="Szerepkor"
            value={form.employeeSubRole}
            onChange={(event) => setForm({ ...form, employeeSubRole: event.target.value as UserInput["employeeSubRole"] })}
            options={[
              { value: "MANAGER", label: "Manager" },
              { value: "WORKER", label: "Dolgozó" }
            ]}
          />
          {form.employeeSubRole === "WORKER" ? (
            <Select
              label="Dolgozó típusa"
              value={form.workerType ?? "STUDENT"}
              onChange={(event) => setForm({ ...form, workerType: event.target.value as UserInput["workerType"] })}
              options={[
                { value: "STUDENT", label: "Diák" },
                { value: "FULL_TIME", label: "Állandós" }
              ]}
            />
          ) : null}
          {error ? <p className="text-sm font-semibold text-red">{error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={handleSubmit}>{editingId ? "Mentés" : "Létrehozás"}</Button>
            {editingId ? <Button variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Mégse</Button> : null}
          </div>
        </div>
      </Card>
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{user.firstName} {user.lastName}</h3>
                  <Badge tone={user.isActive ? "green" : "red"}>{user.isActive ? "Aktív" : "Inaktív"}</Badge>
                  <Badge>{employeeSubRoleLabel(user.employeeSubRole ?? user.role)}</Badge>
                </div>
                <p className="mt-1 text-sm text-brown/60">
                  {user.email} · {workerTypeLabel(user.workerType) || "n/a"} · {user.contractHours?.replace("HOURS_", "") ?? "?"} óra
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => editUser(user)}>Szerkesztés</Button>
                <Button variant="secondary" onClick={() => updateUser(user.id, { isActive: !user.isActive }).then(load)}>
                  {user.isActive ? "Inaktívalas" : "Aktívalas"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

