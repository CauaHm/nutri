"use client";
import { useState, useEffect, useMemo } from "react";
import AuthScreen from "@/components/AuthScreen";
import BottomNav from "@/components/BottomNav";
import PrizeModal from "@/components/PrizeModal";
import GoalAlertPopup from "@/components/GoalAlertPopup";
import { useAuth } from "@/lib/useAuth";
import { useCompetition } from "@/lib/useCompetition";
import { useAppData } from "@/lib/useAppData";
import { useGoalAlerts } from "@/lib/useGoalAlerts";
import { todayStr } from "@/lib/dates";
import { BG } from "@/lib/theme";

import HomeScreen from "@/components/screens/HomeScreen";
import TreinoScreen from "@/components/screens/TreinoScreen";
import NutricaoScreen from "@/components/screens/NutricaoScreen";
import PerfilScreen from "@/components/screens/PerfilScreen";

import RankingScreen from "@/components/screens/RankingScreen";
import TreinoDiaScreen from "@/components/screens/TreinoDiaScreen";
import CargasScreen from "@/components/screens/CargasScreen";
import RefeicoesHojeScreen from "@/components/screens/RefeicoesHojeScreen";
import RefeicoesConfigScreen from "@/components/screens/RefeicoesConfigScreen";
import ComposicaoScreen from "@/components/screens/ComposicaoScreen";
import ComparativoScreen from "@/components/screens/ComparativoScreen";
import HistoricoScreen from "@/components/screens/HistoricoScreen";
import ReceitasScreen from "@/components/screens/ReceitasScreen";
import ComprasScreen from "@/components/screens/ComprasScreen";
import AlimentosScreen from "@/components/screens/AlimentosScreen";
import AdicionarAlimentoScreen from "@/components/screens/AdicionarAlimentoScreen";

const ROOTS = { inicio: HomeScreen, treino: TreinoScreen, nutricao: NutricaoScreen, perfil: PerfilScreen };
const PUSHED = {
  ranking: RankingScreen,
  "treino-dia": TreinoDiaScreen,
  "treino-cargas": CargasScreen,
  "refeicoes-hoje": RefeicoesHojeScreen,
  "refeicoes-config": RefeicoesConfigScreen,
  composicao: ComposicaoScreen,
  comparativo: ComparativoScreen,
  historico: HistoricoScreen,
  receitas: ReceitasScreen,
  compras: ComprasScreen,
  alimentos: AlimentosScreen,
  "adicionar-alimento": AdicionarAlimentoScreen,
};

function AppShell({ auth }) {
  const comp = useCompetition(auth.user._id);
  const data = useAppData(auth.user, comp);
  const [activeTab, setActiveTab] = useState("inicio");
  const [stack, setStack] = useState([]);

  const nav = useMemo(() => ({
    push: (screen, params) => setStack((s) => [...s, { screen, params }]),
    pop: () => setStack((s) => s.slice(0, -1)),
    goTab: (tab) => { setActiveTab(tab); setStack([]); },
    goTo: (tab, screen, params) => { setActiveTab(tab); setStack(screen ? [{ screen, params }] : []); },
  }), []);

  const alertMetrics = useMemo(() => {
    if (!data.user || !data.todayTotais) return [];
    const kcalTotal = Math.round(data.todayTotais.kcal);
    const proteinaTotal = Math.round(data.todayTotais.proteina);
    const waterEntry = data.waters.find((l) => l.date === todayStr());
    return [
      { key: "kcal", label: "Calorias", value: kcalTotal, meta: data.user.kcalMeta, direction: "ceiling", emoji: "🔥", unit: " kcal" },
      { key: "proteina", label: "Proteína", value: proteinaTotal, meta: data.user.proteinaMeta, direction: "floor", emoji: "💪", unit: "g" },
      { key: "agua", label: "Água", value: waterEntry?.liters || 0, meta: data.user.waterMeta, direction: "floor", emoji: "💧", unit: "L" },
    ];
  }, [data.user, data.todayTotais, data.waters]);

  const { alert, dismiss } = useGoalAlerts(data.userId, alertMetrics);

  if (!data.ready || !data.treino || !data.myStats) return null;

  const { showPrize, winner, config, novaRodada, user, outroUser } = data;
  const top = stack[stack.length - 1];
  const RootComp = ROOTS[activeTab];
  const PushedComp = top ? PUSHED[top.screen] : null;
  const winnerUser = winner === user._id ? user : winner === outroUser?._id ? outroUser : null;

  return (
    <div style={{ background: BG, minHeight: "100vh", color: "#ede9f6", fontSize: 13 }}>
      {showPrize && winnerUser && (
        <PrizeModal winnerUser={winnerUser} metaPontos={config.metaPontos} onNovaRodada={novaRodada} />
      )}
      <GoalAlertPopup alert={alert} onClose={dismiss} />

      <RootComp data={data} nav={nav} auth={auth} />

      {PushedComp && (
        <div key={`${top.screen}-${JSON.stringify(top.params || {})}`} className="screen-push" style={{ position: "fixed", inset: 0, background: BG, zIndex: 25, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <PushedComp data={data} nav={nav} auth={auth} params={top.params} />
        </div>
      )}

      <BottomNav active={activeTab} accent={data.user.cor} onChange={nav.goTab} />
    </div>
  );
}

export default function Page() {
  const auth = useAuth();

  if (!auth.ready) return null;
  if (!auth.user) return <AuthScreen auth={auth} />;

  return <AppShell key={auth.user._id} auth={auth} />;
}
