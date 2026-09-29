import { api } from "../lib/api";
import type { HandoverPerson } from "./handovers";

export type NotificationType = "HANDOVER_MENTION" | "HANDOVER_REPLY";

export interface AppNotification {
  id: string;
  type: NotificationType;
  actor: HandoverPerson;
  readAt: string | null;
  createdAt: string;
  handoverDate: string | null;
  handoverPostId: string | null;
  handoverReplyId: string | null;
  snippet: string;
}

export interface NotificationsResponse {
  unreadCount: number;
  items: AppNotification[];
}

export async function getNotifications() {
  const response = await api.get<NotificationsResponse>("/notifications");
  return response.data;
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.post("/notifications/read-all");
}

