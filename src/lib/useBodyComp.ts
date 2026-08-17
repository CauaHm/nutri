import { useState, useEffect, useCallback } from "react";
import { kvGet, kvSet, kvGetMany } from "./clientStorage";
import { defaultMedidasMetas, type MedidasMap } from "./defaults";
import type { MedicaoEntry, Sexo } from "./bodycomp";
import type { User } from "./types";

// Modo de gasto — resolve a armadilha de contagem dupla entre o fator NAF
// (que ja embute a rotina planejada) e as atividades extras registradas:
//  - "estimativa" (padrao, retrocompativel): NAF continua valendo, atividade
//    extra so registra o que foi ALEM do treino planejado.
//  - "preciso": NAF trava em sedentario (1.2) e TODA atividade — inclusive o
//    treino programado — precisa ser registrada como atividade extra.
export type ModoGasto = "estimativa" | "preciso";
export const NAF_TRAVADO_MODO_PRECISO = "sedentario";

export interface BodyCompConfig {
  naf: string;
  proteinaGkg: number | string;
  gorduraGkg: number | string;
  objetivo: string;
  pesoMeta: string | number;
  prazoSemanas: string | number;
  metasMedidas: MedidasMap;
  modoGasto: ModoGasto;
}

const DEFAULT_CONFIG: BodyCompConfig = {
  naf: "leve", proteinaGkg: 2.1, gorduraGkg: 0.7,
  objetivo: "manter", pesoMeta: "", prazoSemanas: "12",
  metasMedidas: defaultMedidasMetas(),
  modoGasto: "estimativa",
};

export type PlanoLog = Record<string, Record<string, number>>;

// Hook isolado do modulo de Composicao Corporal — nao mexe em nenhuma
// chave usada pelo useAppData, entao nao interfere no resto do app.
// sexo/altura/idade agora vem da conta (useAuth), nao sao mais guardados
// aqui — editam-se no Perfil.
export function useBodyComp(user: User | null | undefined) {
  const userId = user?._id;
  const [ready, setReady] = useState(false);
  const [config, setConfigState] = useState<BodyCompConfig>(DEFAULT_CONFIG);
  const [historico, setHistoricoState] = useState<MedicaoEntry[]>([]);
  const [planoLog, setPlanoLogState] = useState<PlanoLog>({});

  useEffect(() => {
    if (!userId) return;
    setReady(false);
    (async () => {
      const keys = [`${userId}_bc_config`, `${userId}_bc_historico`, `${userId}_bc_planolog`];
      const v = await kvGetMany(keys);
      const savedConfig = v[`${userId}_bc_config`] || {};
      setConfigState({ ...DEFAULT_CONFIG, ...savedConfig, metasMedidas: { ...DEFAULT_CONFIG.metasMedidas, ...(savedConfig.metasMedidas || {}) } });
      setHistoricoState(v[`${userId}_bc_historico`] || []);
      setPlanoLogState(v[`${userId}_bc_planolog`] || {});
      setReady(true);
    })();
  }, [userId]);

  const saveConfig = useCallback(async (next: BodyCompConfig) => {
    setConfigState(next);
    await kvSet(`${userId}_bc_config`, next);
  }, [userId]);

  const addMedicao = useCallback(async (entry: Record<string, any>) => {
    const next = [{ id: Date.now(), ...entry } as MedicaoEntry, ...historico.filter((h) => h.date !== entry.date)]
      .sort((a, b) => b.id - a.id);
    setHistoricoState(next);
    await kvSet(`${userId}_bc_historico`, next);
  }, [historico, userId]);

  const delMedicao = useCallback(async (id: number) => {
    const next = historico.filter((h) => h.id !== id);
    setHistoricoState(next);
    await kvSet(`${userId}_bc_historico`, next);
  }, [historico, userId]);

  const marcarOpcao = useCallback(async (date: string, slotKey: string, optionIndex: number) => {
    const day = { ...(planoLog[date] || {}) };
    day[slotKey] = optionIndex;
    const next = { ...planoLog, [date]: day };
    setPlanoLogState(next);
    await kvSet(`${userId}_bc_planolog`, next);
  }, [planoLog, userId]);

  const latest = historico[0] || null;
  const perfil = { sexo: (user?.sexo || "M") as Sexo, altura: user?.altura || "", idade: user?.idade || "" };

  return { ready, perfil, config, saveConfig, historico, addMedicao, delMedicao, planoLog, marcarOpcao, latest };
}

export async function loadHistoricoDe(userId: string | null | undefined): Promise<MedicaoEntry[]> {
  if (!userId) return [];
  const v = await kvGet<MedicaoEntry[]>(`${userId}_bc_historico`, []);
  return v || [];
}
