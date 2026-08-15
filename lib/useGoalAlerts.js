"use client";
import { useEffect, useRef, useState } from "react";
import { todayStr } from "@/lib/dates";

// Observa metricas do dia (kcal, proteina, agua...) e dispara um popup na
// hora em que uma delas cruza a meta — uma vez por metrica por dia (guarda
// no localStorage pra nao repetir se a pessoa recarregar a pagina).
// direction "floor": bater/passar da meta e bom (agua, proteina).
// direction "ceiling": passar da meta e alerta (kcal).
export function useGoalAlerts(userId, metrics) {
  const [alert, setAlert] = useState(null);
  const seenRef = useRef(new Set());
  const loadedForRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const storageKey = `rm_alerts_${userId}_${todayStr()}`;
    try {
      const raw = localStorage.getItem(storageKey);
      seenRef.current = new Set(raw ? JSON.parse(raw) : []);
    } catch {
      seenRef.current = new Set();
    }
    loadedForRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId || loadedForRef.current !== userId) return;
    for (const m of metrics) {
      if (!m.meta || m.meta <= 0 || !(m.value > 0)) continue;
      const pct = (m.value / m.meta) * 100;
      if (pct < 100) continue;
      if (seenRef.current.has(m.key)) continue;
      seenRef.current.add(m.key);
      try {
        localStorage.setItem(`rm_alerts_${userId}_${todayStr()}`, JSON.stringify([...seenRef.current]));
      } catch {}
      const isCeiling = m.direction === "ceiling";
      setAlert({
        kind: isCeiling ? "warning" : "success",
        emoji: m.emoji,
        title: isCeiling ? `Passou da meta de ${m.label}` : `Meta de ${m.label} batida!`,
        text: isCeiling
          ? `Você já está em ${m.value}${m.unit || ""}, acima dos ${m.meta}${m.unit || ""} planejados.`
          : `${m.value}${m.unit || ""} de ${m.meta}${m.unit || ""} — mandou bem! 🎉`,
      });
      break; // um popup por vez, os outros disparam nas proximas atualizacoes
    }
  }, [userId, metrics]);

  return { alert, dismiss: () => setAlert(null) };
}
