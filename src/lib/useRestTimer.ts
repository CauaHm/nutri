import { useEffect, useState } from "react";
import { fireRestComplete, maybeRequestNotifPermission, unlockAudio } from "./restTimerEffects";

export interface RestTimerState {
  remaining: number;
  totalSeconds: number;
  label: string;
  exId?: number;
  dayIndex?: number;
  completed: boolean;
}

export interface RestTimerApi {
  timer: RestTimerState | null;
  start: (seconds: number, label: string, meta?: { exId?: number; dayIndex?: number }) => void;
  adjust: (deltaSeconds: number) => void;
  skip: () => void;
}

interface Persisted {
  endAt: number;
  totalSeconds: number;
  label: string;
  exId?: number;
  dayIndex?: number;
}

// Timer de descanso global — sobrevive a navegacao entre telas porque e
// instanciado uma unica vez em AppShell (App.tsx) e o estado fica em
// localStorage, nao dentro de um componente de tela que desmonta. O tempo
// restante e sempre endAt - Date.now() (nunca decrementado a partir de um
// contador), entao fica correto mesmo depois da aba passar tempo em
// segundo plano — o setInterval so existe pra forcar re-render da UI.
export function useRestTimer(userId: string | null | undefined): RestTimerApi {
  const [persisted, setPersisted] = useState<Persisted | null>(null);
  const [completed, setCompleted] = useState(false);
  const [, bump] = useState(0);
  const storageKey = userId ? `rm_resttimer_${userId}` : null;

  useEffect(() => {
    if (!storageKey) {
      setPersisted(null);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setPersisted(raw ? JSON.parse(raw) : null);
    } catch {
      setPersisted(null);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!persisted) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((persisted.endAt - Date.now()) / 1000));
      if (remaining <= 0 && !completed) {
        setCompleted(true);
        fireRestComplete(persisted.label);
      }
      bump((n) => n + 1);
    };
    tick();
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [persisted, completed]);

  useEffect(() => {
    if (!completed) return;
    const t = setTimeout(() => persist(null), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  function persist(next: Persisted | null) {
    setPersisted(next);
    setCompleted(false);
    if (!storageKey) return;
    try {
      if (next) localStorage.setItem(storageKey, JSON.stringify(next));
      else localStorage.removeItem(storageKey);
    } catch {
      // sem localStorage: timer ainda funciona em memoria pra sessao atual
    }
  }

  const start: RestTimerApi["start"] = (seconds, label, meta) => {
    unlockAudio();
    maybeRequestNotifPermission(userId);
    persist({ endAt: Date.now() + seconds * 1000, totalSeconds: seconds, label, ...meta });
  };

  const adjust: RestTimerApi["adjust"] = (delta) => {
    if (!persisted) return;
    persist({
      ...persisted,
      endAt: persisted.endAt + delta * 1000,
      totalSeconds: Math.max(1, persisted.totalSeconds + delta),
    });
  };

  const skip: RestTimerApi["skip"] = () => persist(null);

  const timer: RestTimerState | null = persisted
    ? {
        remaining: Math.max(0, Math.round((persisted.endAt - Date.now()) / 1000)),
        totalSeconds: persisted.totalSeconds,
        label: persisted.label,
        exId: persisted.exId,
        dayIndex: persisted.dayIndex,
        completed,
      }
    : null;

  return { timer, start, adjust, skip };
}
