import { api } from "../lib/api";

export type UserRole = "ADMIN" | "EMPLOYEE";
export type EmployeeSubRole = "MANAGER" | "WORKER";
export type WorkerType = "STUDENT" | "FULL_TIME";
export type ContractHours = "HOURS_4" | "HOURS_6" | "HOURS_8";

export interface AuthUser {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeSubRole: EmployeeSubRole | null;
  workerType: WorkerType | null;
  contractHours?: ContractHours | null;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

const accessTokenKey = "bk-workforce.accessToken";
const userKey = "bk-workforce.user";

function readUser() {
  const rawUser = localStorage.getItem(userKey);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(userKey);
    return null;
  }
}

export const authStore = {
  getAccessToken() {
    return localStorage.getItem(accessTokenKey);
  },
  getUser() {
    return readUser();
  },
  isAuthenticated() {
    return Boolean(this.getAccessToken() && this.getUser());
  },
  setAuth(authResponse: AuthResponse) {
    localStorage.setItem(accessTokenKey, authResponse.accessToken);
    localStorage.setItem(userKey, JSON.stringify(authResponse.user));
  },
  setUser(user: AuthUser) {
    localStorage.setItem(userKey, JSON.stringify(user));
  },
  markPasswordChanged() {
    const user = this.getUser();
    if (!user) {
      return;
    }

    this.setUser({
      ...user,
      mustChangePassword: false
    });
  },
  logout() {
    localStorage.removeItem(accessTokenKey);
    localStorage.removeItem(userKey);
  }
};

api.interceptors.request.use((config) => {
  const accessToken = authStore.getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});
