// Shape comum de props que App.tsx passa pra toda tela raiz (bottom nav) ou
// empilhada (nav.push). Cada tela so desestrutura o que usa, mas todas
// recebem esse mesmo pacote — ver AppShell em App.tsx.
import type { AppData } from "./useAppData";
import type { NavApi } from "./types";
import type { AuthApi } from "./useAuth";
import type { RestTimerApi } from "./useRestTimer";

export interface ScreenProps {
  data: AppData;
  nav: NavApi;
  auth: AuthApi;
  rest: RestTimerApi;
  params?: any;
}

// Componentes de aba (dentro de uma tela empilhada) so recebem `data`.
export interface TabProps {
  data: AppData;
}
