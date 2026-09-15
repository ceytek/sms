const TOKEN_KEY = "accessToken";
const USER_KEY = "user";
const IMP_TOKEN_KEY = "impersonateToken";
const IMP_USER_KEY = "impersonateUser";
const IMP_ORIGINAL_KEY = "impersonateOriginalUser";
const HANDOFF_PREFIX = "impersonate_handoff_";

export interface SessionUser {
  id: string;
  companyId?: string;
  companyCode: string;
  username: string;
  role: string;
}

export interface ImpersonationHandoff {
  accessToken: string;
  user: SessionUser;
  originalUser: SessionUser | null;
  createdAt: number;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(IMP_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(IMP_USER_KEY) || localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function setPrimarySession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  clearImpersonationSession();
}

export function recoverLegacyImpersonation() {
  if (typeof window === "undefined") return;
  const originalToken = localStorage.getItem("originalToken");
  const originalUser = localStorage.getItem("originalUser");
  if (!originalToken || !originalUser) return;

  localStorage.setItem(TOKEN_KEY, originalToken);
  localStorage.setItem(USER_KEY, originalUser);
  localStorage.removeItem("originalToken");
  localStorage.removeItem("originalUser");
}

export function clearPrimarySession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("originalToken");
  localStorage.removeItem("originalUser");
}

export function isImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem(IMP_TOKEN_KEY);
}

export function getOriginalUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(IMP_ORIGINAL_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function applyImpersonationSession(handoff: ImpersonationHandoff) {
  sessionStorage.setItem(IMP_TOKEN_KEY, handoff.accessToken);
  sessionStorage.setItem(IMP_USER_KEY, JSON.stringify(handoff.user));
  if (handoff.originalUser) {
    sessionStorage.setItem(IMP_ORIGINAL_KEY, JSON.stringify(handoff.originalUser));
  }
}

export function clearImpersonationSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(IMP_TOKEN_KEY);
  sessionStorage.removeItem(IMP_USER_KEY);
  sessionStorage.removeItem(IMP_ORIGINAL_KEY);
}

export function createImpersonationHandoff(
  accessToken: string,
  user: SessionUser,
  originalUser: SessionUser | null,
): string {
  const key = crypto.randomUUID();
  const payload: ImpersonationHandoff = {
    accessToken,
    user,
    originalUser,
    createdAt: Date.now(),
  };
  localStorage.setItem(`${HANDOFF_PREFIX}${key}`, JSON.stringify(payload));
  return key;
}

export function consumeImpersonationHandoff(key: string): ImpersonationHandoff | null {
  const storageKey = `${HANDOFF_PREFIX}${key}`;
  const raw = localStorage.getItem(storageKey);
  localStorage.removeItem(storageKey);
  if (!raw) return null;

  const payload = JSON.parse(raw) as ImpersonationHandoff;
  if (Date.now() - payload.createdAt > 30_000) return null;
  return payload;
}

export function closeImpersonationTab() {
  clearImpersonationSession();
  window.close();
  window.location.replace("/impersonate/closed");
}
