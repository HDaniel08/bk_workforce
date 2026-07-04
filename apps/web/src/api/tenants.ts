import { api } from "../lib/api";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

export type TenantInput = {
  name: string;
  slug: string;
  city?: string;
  address?: string;
  isActive?: boolean;
  adminName?: string;
  adminEmail?: string;
};

export async function getTenants() {
  const response = await api.get<Tenant[]>("/tenants");
  return response.data;
}

export async function createTenant(input: TenantInput) {
  const response = await api.post<Tenant>("/tenants", input);
  return response.data;
}

export async function updateTenant(id: string, input: Partial<TenantInput>) {
  const response = await api.patch<Tenant>(`/tenants/${id}`, input);
  return response.data;
}
