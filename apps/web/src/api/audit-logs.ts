import { api } from "../lib/api";

export interface AuditLog {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export async function getAuditLogs(params?: Record<string, string>) {
  const response = await api.get<AuditLog[]>("/audit-logs", { params });
  return response.data;
}
