import { useEffect, useState } from "react";
import { createUser, deleteUser, getUsers, updateUser, type ManagedUser, type UserInput } from "../api/users";
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
  isStandInManager: false,
  workerType: "STUDENT",
  contractHours: "HOURS_4"
};

export function ManagerUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<UserInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
      setIsFormOpen(false);
      await load();
    } catch {
      setError("Dolgozó mentési hiba");
    }
  }

  function editUser(user: ManagedUser) {
    setEditingId(user.id);
    setIsFormOpen(true);
    setError(null);
    setForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? "",
      employeeSubRole: user.employeeSubRole ?? "WORKER",
      isStandInManager: user.isStandInManager,
      workerType: user.workerType ?? "STUDENT",
      contractHours: user.contractHours ?? "HOURS_4",
      isActive: user.isActive
    });
  }

  async function handleDelete(user: ManagedUser) {
    if (!window.confirm(`Biztosan törlöd: ${user.lastName} ${user.firstName}?`)) return;
    setError(null);
    try {
      await deleteUser(user.id);
      if (editingId === user.id) {
        setEditingId(null);
        setForm(emptyForm);
        setIsFormOpen(false);
      }
      await load();
    } catch {
      setError("A dolgozó törlése nem sikerült");
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setIsFormOpen(false);
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red">Csapatkezelés</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Dolgozók</h1>
        <p className="mt-1 text-sm text-brown/65">{users.length} dolgozó a tenantban</p>
      </div>

      {error && !isFormOpen ? <Card className="border border-red/20 bg-red/5"><p className="text-sm font-semibold text-red">{error}</p></Card> : null}

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{user.lastName} {user.firstName}</h3>
                  <Badge tone={user.isActive ? "green" : "red"}>{user.isActive ? "Aktív" : "Inaktív"}</Badge>
                  <Badge>{employeeSubRoleLabel(user.employeeSubRole ?? user.role)}</Badge>
                  {user.isStandInManager ? <Badge>Beugrós manager</Badge> : null}
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
                {!user.isActive ? (
                  <Button variant="primary" onClick={() => handleDelete(user)}>Törlés</Button>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button
        type="button"
        title="Új dolgozó"
        aria-label="Új dolgozó"
        className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-red text-3xl font-light text-white shadow-xl transition hover:scale-105 hover:bg-brown md:bottom-8 md:right-8"
        onClick={openCreateForm}
      >
        +
      </button>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
          <button type="button" aria-label="Dolgozó ablak bezárása" className="absolute inset-0 bg-brown/40" onClick={closeForm} />
          <Card className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-b-none sm:max-w-lg sm:rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 id="user-form-title" className="text-xl font-bold">{editingId ? "Dolgozó szerkesztése" : "Új dolgozó"}</h2>
              <button type="button" className="rounded px-3 py-2 text-sm font-bold hover:bg-cream" onClick={closeForm}>Bezárás</button>
            </div>
            <div className="mt-4 space-y-4">
              <Input label="Email" disabled={Boolean(editingId)} value={form.email ?? ""} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Keresztnév" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
                <Input label="Vezetéknév" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
              </div>
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
                label="Szerepkör"
                value={form.employeeSubRole}
                onChange={(event) => setForm({ ...form, employeeSubRole: event.target.value as UserInput["employeeSubRole"], isStandInManager: event.target.value === "WORKER" && form.isStandInManager })}
                options={[
                  { value: "MANAGER", label: "Manager" },
                  { value: "WORKER", label: "Dolgozó" }
                ]}
              />
              {form.employeeSubRole === "WORKER" ? (
                <><Select
                  label="Dolgozó típusa"
                  value={form.workerType ?? "STUDENT"}
                  onChange={(event) => setForm({ ...form, workerType: event.target.value as UserInput["workerType"] })}
                  options={[
                    { value: "STUDENT", label: "Diák" },
                    { value: "FULL_TIME", label: "Állandós" }
                  ]}
                /><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(form.isStandInManager)} onChange={(event) => setForm({ ...form, isStandInManager: event.target.checked })} />Beugrós manager</label></>
              ) : null}
              {error ? <p className="text-sm font-semibold text-red">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closeForm}>Mégse</Button>
                <Button onClick={handleSubmit}>{editingId ? "Mentés" : "Létrehozás"}</Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

