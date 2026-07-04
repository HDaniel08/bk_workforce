import { useEffect, useState } from "react";
import { createTenant, getTenants, updateTenant, type Tenant } from "../api/tenants";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

const emptyForm = {
  name: "",
  slug: "",
  city: "",
  address: "",
  adminName: "",
  adminEmail: ""
};

export function SuperadminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setTenants(await getTenants());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit() {
    setError(null);
    try {
      if (editingId) {
        await updateTenant(editingId, {
          name: form.name,
          slug: form.slug,
          city: form.city,
          address: form.address
        });
      } else {
        await createTenant(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch {
      setError("Tenant mentési hiba");
    }
  }

  function editTenant(tenant: Tenant) {
    setEditingId(tenant.id);
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      city: tenant.city ?? "",
      address: tenant.address ?? "",
      adminName: "",
      adminEmail: ""
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card>
        <h2 className="text-xl font-bold">{editingId ? "Tenant szerkesztése" : "Új tenant"}</h2>
        <div className="mt-4 space-y-4">
          <Input label="Név" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
          <Input label="Város" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <Input label="Cím" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          {!editingId ? (
            <>
              <Input
                label="Tenant admin neve"
                value={form.adminName}
                onChange={(event) => setForm({ ...form, adminName: event.target.value })}
              />
              <Input
                label="Tenant admin email"
                type="email"
                value={form.adminEmail}
                onChange={(event) => setForm({ ...form, adminEmail: event.target.value })}
              />
            </>
          ) : null}
          {error ? <p className="text-sm font-semibold text-red">{error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={handleSubmit}>{editingId ? "Mentés" : "Létrehozás"}</Button>
            {editingId ? <Button variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Mégse</Button> : null}
          </div>
        </div>
      </Card>
      <div className="space-y-3">
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{tenant.name}</h3>
                  <Badge tone={tenant.isActive ? "green" : "red"}>{tenant.isActive ? "Aktív" : "Inaktív"}</Badge>
                </div>
                <p className="mt-1 text-sm text-brown/60">{tenant.slug} Â· {tenant.city ?? "Nincs varos"} Â· {tenant.userCount} user</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => editTenant(tenant)}>Szerkesztés</Button>
                <Button variant="secondary" onClick={() => updateTenant(tenant.id, { isActive: !tenant.isActive }).then(load)}>
                  {tenant.isActive ? "Inaktívalas" : "Aktívalas"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

