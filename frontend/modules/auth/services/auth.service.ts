import { apiRequest } from "@/lib/api";
import {
  applyImpersonationSession,
  clearImpersonationSession,
  clearPrimarySession,
  closeImpersonationTab,
  consumeImpersonationHandoff,
  createImpersonationHandoff,
  getAccessToken,
  getOriginalUser,
  getSessionUser,
  isImpersonating,
  setPrimarySession,
} from "@/lib/session";
import { LoginRequest, LoginResponse, User } from "../types";

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiRequest<LoginResponse>("auth/login", {
      method: "POST",
      body: data,
    });

    if (typeof window !== "undefined") {
      setPrimarySession(response.accessToken, response.user);
    }

    return response;
  },

  logout(): void {
    if (typeof window === "undefined") return;

    if (isImpersonating()) {
      closeImpersonationTab();
      return;
    }

    clearImpersonationSession();
    clearPrimarySession();
  },

  getToken(): string | null {
    return getAccessToken();
  },

  getUser(): User | null {
    return getSessionUser() as User | null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  async impersonate(companyId: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>(`auth/impersonate/${companyId}`, {
      method: "POST",
    });
  },

  openImpersonationTab(response: LoginResponse, tab: Window) {
    const key = createImpersonationHandoff(
      response.accessToken,
      response.user,
      getSessionUser(),
    );
    tab.location.href = `/impersonate?k=${key}`;
  },

  completeImpersonationHandoff(key: string): LoginResponse | null {
    const handoff = consumeImpersonationHandoff(key);
    if (!handoff) return null;
    applyImpersonationSession(handoff);
    return {
      accessToken: handoff.accessToken,
      user: handoff.user as User,
    };
  },

  exitImpersonation(): void {
    closeImpersonationTab();
  },

  isImpersonating(): boolean {
    return isImpersonating();
  },

  getOriginalUser(): User | null {
    return getOriginalUser() as User | null;
  },
};
