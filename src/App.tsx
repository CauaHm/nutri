import { useState, useMemo, type ReactElement } from "react";
import AuthScreen from "@/components/AuthScreen";
import BottomNav from "@/components/BottomNav";
import PrizeModal from "@/components/PrizeModal";
import GoalAlertPopup from "@/components/GoalAlertPopup";
import RestTimerBar from "@/components/RestTimerBar";
import OfflineBanner from "@/components/OfflineBanner";
import UpdatePrompt from "@/components/UpdatePrompt";
import { useAuth, type AuthApi } from "@/lib/useAuth";
import { useCompetition } from "@/lib/useCompetition";
import { useAppData } from "@/lib/useAppData";
import { useGoalAlerts, type GoalMetric } from "@/lib/useGoalAlerts";
import { useRestTimer } from "@/lib/useRestTimer";
import { todayStr } from "@/lib/dates";
import { BG } from "@/lib/theme";
import type { User, NavApi } from "@/lib/types";
import type { ScreenProps } from "@/lib/screenProps";

import HomeScreen from "@/components/screens/HomeScreen";
import TreinoScreen from "@/components/screens/TreinoScreen";
import NutricaoScreen from "@/components/screens/NutricaoScreen";
import PerfilScreen from "@/components/screens/PerfilScreen";

import RankingScreen from "@/components/screens/RankingScreen";
import TreinoDiaScreen from "@/components/screens/TreinoDiaScreen";
import CargasScreen from "@/components/screens/CargasScreen";
import LiveWorkoutScreen from "@/components/screens/LiveWorkoutScreen";
import RefeicoesHojeScreen from "@/components/screens/RefeicoesHojeScreen";
import RefeicoesConfigScreen from "@/components/screens/RefeicoesConfigScreen";
import ComposicaoScreen from "@/components/screens/ComposicaoScreen";
import ComparativoScreen from "@/components/screens/ComparativoScreen";
import HistoricoScreen from "@/components/screens/HistoricoScreen";
import ReceitasScreen from "@/components/screens/ReceitasScreen";
import ComprasScreen from "@/components/screens/ComprasScreen";
import AlimentosScreen from "@/components/screens/AlimentosScreen";
import AdicionarAlimentoScreen from "@/components/screens/AdicionarAlimentoScreen";
import SistemaScreen from "@/components/screens/SistemaScreen";
import AtividadeScreen from "@/components/screens/AtividadeScreen";
import BalancoScreen from "@/components/screens/BalancoScreen";

type ScreenComponent = (props: ScreenProps) => ReactElement | null;

const ROOTS: Record<string, ScreenComponent> = { inicio: HomeScreen, treino: TreinoScreen, nutricao: NutricaoScreen, perfil: PerfilScreen };
const PUSHED: Record<string, ScreenComponent> = {
  ranking: RankingScreen,
  "treino-dia": TreinoDiaScreen,
  "treino-cargas": CargasScreen,
  "treino-live": LiveWorkoutScreen,
  "refeicoes-hoje": RefeicoesHojeScreen,
  "refeicoes-config": RefeicoesConfigScreen,
  composicao: ComposicaoScreen,
  comparativo: ComparativoScreen,
  historico: HistoricoScreen,
  receitas: ReceitasScreen,
  compras: ComprasScreen,
  alimentos: AlimentosScreen,
  "adicionar-alimento": AdicionarAlimentoScreen,
  sistema: SistemaScreen,
  atividade: AtividadeScreen,
  balanco: BalancoScreen,
};

interface StackEntry {
  screen: string;
  params?: any;
}

function AppShell({ auth }: { auth: AuthApi & { user: User } }) {
  const comp = useCompetition(auth.user._id);
  const data = useAppData(auth.user, comp);
  const [activeTab, setActiveTab] = useState("inicio");
  const [stack, setStack] = useState<StackEntry[]>([]);

  const nav: NavApi = useMemo(() => ({
    push: (screen, params) => setStack((s) => [...s, { screen, params }]),
    pop: () => setStack((s) => s.slice(0, -1)),
    goTab: (tab) => { setActiveTab(tab); setStack([]); },
    goTo: (tab, screen, params) => { setActiveTab(tab); setStack(screen ? [{ screen, params }] : []); },
  }), []);

  const alertMetrics: GoalMetric[] = useMemo(() => {
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
  const rest = useRestTimer(data.userId);

  if (!data.ready || !data.treino || !data.myStats) return null;

  const { showPrize, winner, config, novaRodada, user, outroUser } = data;
  const top = stack[stack.length - 1];
  const RootComp = ROOTS[activeTab];
  const PushedComp = top ? PUSHED[top.screen] : null;
  const winnerUser = winner === user._id ? user : winner === outroUser?._id ? outroUser : null;
  const isLiveWorkout = top?.screen === "treino-live";

  return (
    <div style={{ background: BG, minHeight: "100vh", color: "#ede9f6", fontSize: 13 }}>
      {showPrize && winnerUser && (
        <PrizeModal winnerUser={winnerUser} metaPontos={config.metaPontos} onNovaRodada={novaRodada} />
      )}
      <GoalAlertPopup alert={alert} onClose={dismiss} />

      <RootComp data={data} nav={nav} auth={auth} rest={rest} />

      {PushedComp && top && (
        <div key={`${top.screen}-${JSON.stringify(top.params || {})}`} className="screen-push" style={{ position: "fixed", inset: 0, background: BG, zIndex: 25, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <PushedComp data={data} nav={nav} auth={auth} rest={rest} params={top.params} />
        </div>
      )}

      {!isLiveWorkout && <RestTimerBar timer={rest.timer} onAdjust={rest.adjust} onSkip={rest.skip} />}
      {!isLiveWorkout && <BottomNav active={activeTab} accent={data.user.cor} onChange={nav.goTab} />}
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  // OfflineBanner/UpdatePrompt ficam aqui fora (nunca dentro de AppShell,
  // que remonta via `key={auth.user._id}` a cada troca de conta) porque sao
  // preocupacoes de nivel de pagina — leem de um store externo
  // (useSyncExternalStore) e precisam sobreviver a esse remount.
  return (
    <>
      <OfflineBanner />
      <UpdatePrompt />
      {!auth.ready ? null : !auth.user ? <AuthScreen auth={auth} /> : <AppShell key={auth.user._id} auth={auth as AuthApi & { user: User }} />}
    </>
  );
}
