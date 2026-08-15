"use client";
import { useState, useEffect, useCallback } from "react";
import { kvGet, kvSet, kvGetMany } from "@/lib/clientStorage";
import { defaultMedidasMetas } from "@/lib/defaults";

const DEFAULT_CONFIG = {
  naf: "leve", proteinaGkg: 2.1, gorduraGkg: 0.7,
  objetivo: "manter", pesoMeta: "", prazoSemanas: "12",
  metasMedidas: defaultMedidasMetas(),
};

// Hook isolado do modulo de Composicao Corporal — nao mexe em nenhuma
// chave usada pelo useAppData, entao nao interfere no resto do app.
// sexo/altura/idade agora vem da conta (useAuth), nao sao mais guardados
// aqui — editam-se no Perfil.
export function useBodyComp(user) {
  const userId = user?._id;
  const [ready, setReady] = useState(false);
  const [config, setConfigState] = useState(DEFAULT_CONFIG);
  const [historico, setHistoricoState] = useState([]);
  const [planoLog, setPlanoLogState] = useState({});

  useEffect(() => {
    if (!userId) return;
    setReady(false);
    (async () => {
      const keys = [`${userId}_bc_config`, `${userId}_bc_historico`, `${userId}_bc_planolog`];
      const v = await kvGetMany(keys);
      setConfigState({ ...DEFAULT_CONFIG, ...(v[`${userId}_bc_config`] || {}), metasMedidas: { ...DEFAULT_CONFIG.metasMedidas, ...((v[`${userId}_bc_config`] || {}).metasMedidas || {}) } });
      setHistoricoState(v[`${userId}_bc_historico`] || []);
      setPlanoLogState(v[`${userId}_bc_planolog`] || {});
      setReady(true);
    })();
  }, [userId]);

  const saveConfig = useCallback(async (next) => {
    setConfigState(next);
    await kvSet(`${userId}_bc_config`, next);
  }, [userId]);

  const addMedicao = useCallback(async (entry) => {
    const next = [{ id: Date.now(), ...entry }, ...historico.filter((h) => h.date !== entry.date)]
      .sort((a, b) => b.id - a.id);
    setHistoricoState(next);
    await kvSet(`${userId}_bc_historico`, next);
  }, [historico, userId]);

  const delMedicao = useCallback(async (id) => {
    const next = historico.filter((h) => h.id !== id);
    setHistoricoState(next);
    await kvSet(`${userId}_bc_historico`, next);
  }, [historico, userId]);

  const marcarOpcao = useCallback(async (date, slotKey, optionIndex) => {
    const day = { ...(planoLog[date] || {}) };
    day[slotKey] = optionIndex;
    const next = { ...planoLog, [date]: day };
    setPlanoLogState(next);
    await kvSet(`${userId}_bc_planolog`, next);
  }, [planoLog, userId]);

  const latest = historico[0] || null;
  const perfil = { sexo: user?.sexo || "M", altura: user?.altura || "", idade: user?.idade || "" };

  return { ready, perfil, config, saveConfig, historico, addMedicao, delMedicao, planoLog, marcarOpcao, latest };
}

export async function loadHistoricoDe(userId) {
  if (!userId) return [];
  const v = await kvGet(`${userId}_bc_historico`, []);
  return v || [];
}
