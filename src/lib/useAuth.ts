import { useState, useEffect, useCallback } from "react";
import type { User } from "./types";

export interface AuthApi {
  user: User | null;
  ready: boolean;
  signup: (payload: { email: string; senha: string; nome?: string }) => Promise<{ ok: boolean; user?: User; error?: string }>;
  login: (payload: { email: string; senha: string }) => Promise<{ ok: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<User | null>;
  refresh: () => Promise<void>;
}

export function useAuth(): AuthApi {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    setUser(r.ok ? (await r.json()).user : null);
    setReady(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const call = async (url: string, body: any): Promise<{ ok: boolean; user?: User; error?: string }> => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.user) setUser(data.user);
    return { ok: r.ok, ...data };
  };

  const signup = (payload: { email: string; senha: string; nome?: string }) => call("/api/auth/signup", payload);
  const login = (payload: { email: string; senha: string }) => call("/api/auth/login", payload);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const updateProfile = async (patch: Partial<User>): Promise<User | null> => {
    const r = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (r.ok) {
      const { user: u } = await r.json();
      setUser(u);
      return u;
    }
    return null;
  };

  return { user, ready, signup, login, logout, updateProfile, refresh };
}
