const TOKEN_KEY = "ski_store_token";
const STORE_KEY = "ski_store_info";

export interface StoreInfo {
  storeId: number;
  storeName: string;
  isAdmin?: boolean;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoreInfo(): StoreInfo | null {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isAdminSession(): boolean {
  return getStoreInfo()?.isAdmin === true;
}

export function saveAuth(token: string, info: StoreInfo): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(STORE_KEY, JSON.stringify(info));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STORE_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
