import { api } from "../lib/api";
import type { AuthResponse } from "../store/auth-store";

export async function login(email: string, password: string) {
  const response = await api.post<AuthResponse>("/auth/login", {
    email,
    password
  });

  return response.data;
}

export async function superadminLogin(email: string, password: string) {
  const response = await api.post<AuthResponse>("/auth/superadmin/login", {
    email,
    password
  });

  return response.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const response = await api.post<{ success: true }>("/auth/change-password", {
    currentPassword,
    newPassword
  });

  return response.data;
}
