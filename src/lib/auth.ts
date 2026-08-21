const AUTH_KEY = "bible_auth_user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

const isBrowser = typeof window !== "undefined";

const DUMMY_ACCOUNTS = [
  { id: "test", pw: "1234", profile: { id: "test", name: "테스터", email: "test@example.com" } },
  { id: "test1", pw: "1111", profile: { id: "test1", name: "테스터1", email: "test1@example.com" } },
  { id: "test2", pw: "2222", profile: { id: "test2", name: "테스터2", email: "test2@example.com" } },
  { id: "test3", pw: "3333", profile: { id: "test3", name: "테스터3", email: "test3@example.com" } },
];

export function login(id: string, pw: string): boolean {
  if (!isBrowser) return false;
  
  const account = DUMMY_ACCOUNTS.find(acc => acc.id === id && acc.pw === pw);
  if (account) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(account.profile));
    return true;
  }
  return false;
}

export function logout(): void {
  if (!isBrowser) return;
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "/";
}

export function getAuthUser(): AuthUser | null {
  if (!isBrowser) return null;
  try {
    const data = localStorage.getItem(AUTH_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {}
  return null;
}
