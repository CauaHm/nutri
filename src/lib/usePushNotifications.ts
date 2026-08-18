import { useState, useEffect, useCallback } from "react";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// Conversao base64url (a forma que a chave VAPID publica vem, e o formato
// que applicationServerKey EXIGE como Uint8Array) -> Uint8Array. Ordem
// importa: primeiro troca os caracteres URL-safe pelos padrao, DEPOIS
// restaura o padding, DEPOIS decodifica com atob — inverter essa ordem e um
// erro classico de copy-paste que "quase" funciona e falha silenciosamente
// em algumas chaves.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

function suportado(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export interface UsePushNotificationsApi {
  suportado: boolean;
  permission: NotificationPermission | "unsupported";
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

// Permissao de notificacao nao dispara evento de mudanca nativo — reler no
// foco da janela e a forma pratica de refletir uma mudanca feita fora do
// app (ex: usuario foi nas configuracoes do navegador e mudou por la).
export function usePushNotifications(): UsePushNotificationsApi {
  const ok = suportado();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(ok ? Notification.permission : "unsupported");

  useEffect(() => {
    if (!ok) return;
    const onFocus = () => setPermission(Notification.permission);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [ok]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!ok || !VAPID_PUBLIC_KEY) return false;
    try {
      let perm = Notification.permission;
      if (perm === "default") perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
      }

      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      return r.ok;
    } catch {
      return false;
    }
  }, [ok]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!ok) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    } catch {
      // silencioso — desativar notificacao nunca deve travar a UI
    }
  }, [ok]);

  return { suportado: ok, permission, subscribe, unsubscribe };
}
