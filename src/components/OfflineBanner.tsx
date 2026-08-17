import { AMB, TEXT } from "@/lib/theme";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

// Sempre montado (ver App.tsx) — so aparece quando offline. zIndex 40: acima
// do BottomNav (30) e da RestTimerBar (28), abaixo de toasts/modais (60+).
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: AMB,
        color: "#1a1206",
        fontSize: 11.5,
        fontWeight: 700,
        textAlign: "center",
        padding: "6px 10px",
        paddingTop: "calc(6px + env(safe-area-inset-top,0px))",
      }}
    >
      Você está offline — suas alterações serão sincronizadas quando a conexão voltar
    </div>
  );
}
