import { useRegisterSW } from "virtual:pwa-register/react";
import { PINK, SUB, TEXT, CARD, SHADOW_POP, sBtn } from "@/lib/theme";

// Sempre montado (ver App.tsx). So aparece quando um novo build do SW ja
// esta instalado e esperando (`needRefresh`). Nunca ativa sozinho —
// `registerType: "prompt"` em vite.config.ts garante isso; so troca de
// versao quando o usuario aperta "Atualizar", chamando
// updateServiceWorker(true) (skipWaiting + reload).
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.error("SW register error", err);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className="fade-in-up"
      style={{
        position: "fixed",
        left: 10,
        right: 10,
        bottom: "calc(64px + env(safe-area-inset-bottom,0px) + 8px)",
        zIndex: 32,
        background: CARD,
        borderRadius: 14,
        boxShadow: SHADOW_POP,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: SUB, fontWeight: 700, textTransform: "uppercase" }}>Atualização</div>
        <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>Nova versão disponível</div>
      </div>
      <button onClick={() => updateServiceWorker(true)} className="tapable" style={{ ...sBtn(PINK), flexShrink: 0 }}>
        Atualizar
      </button>
    </div>
  );
}
