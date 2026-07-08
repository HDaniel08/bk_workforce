import { api } from "../lib/api";

export async function sendTestEmail(params: {
  to: string;
  subject?: string;
  message?: string;
}) {
  const response = await api.post<{ success: true }>("/mail/test", params);
  return response.data;
}
