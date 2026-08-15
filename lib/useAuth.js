"use client";
import { useState, useEffect, useCallback } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    setUser(r.ok ? (await r.json()).user : null);
    setReady(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const call = async (url, body) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.user) setUser(data.user);
    return { ok: r.ok, ...data };
  };

  const signup = (payload) => call("/api/auth/signup", payload);
  const login = (payload) => call("/api/auth/login", payload);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const updateProfile = async (patch) => {
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
