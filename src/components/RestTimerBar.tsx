import { PINK, PURP, GRN, SUB, TEXT, CARD, SHADOW_POP } from "@/lib/theme";
import type { RestTimerState } from "@/lib/useRestTimer";

interface RestTimerBarProps {
  timer: RestTimerState | null;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
}

export default function RestTimerBar({ timer, onAdjust, onSkip }: RestTimerBarProps) {
  if (!timer) return null;
  const mm = String(Math.floor(timer.remaining / 60)).padStart(2, "0");
  const ss = String(timer.remaining % 60).padStart(2, "0");
  const pct = timer.totalSeconds > 0 ? Math.min(100, Math.max(0, Math.round(((timer.totalSeconds - timer.remaining) / timer.totalSeconds) * 100))) : 0;

  return (
    <div
      className="fade-in-up"
      style={{
        position: "fixed",
        left: 10,
        right: 10,
        bottom: "calc(64px + env(safe-area-inset-bottom,0px) + 8px)",
        zIndex: 28,
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
        <div style={{ fontSize: 10, color: SUB, fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {timer.completed ? "Descanso concluído ✓" : "Descanso"} · {timer.label}
        </div>
        <div style={{ fontWeight: 800, fontSize: 20, color: timer.completed ? GRN : TEXT }}>{mm}:{ss}</div>
        <div style={{ height: 3, background: "#ffffff14", borderRadius: 2, marginTop: 4 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${PINK},${PURP})`, borderRadius: 2, transition: "width .2s linear" }} />
        </div>
      </div>
      <button onClick={() => onAdjust(-15)} className="tapable" style={{ background: "#ffffff10", border: "none", borderRadius: 9, color: TEXT, padding: "8px 10px", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>-15s</button>
      <button onClick={() => onAdjust(15)} className="tapable" style={{ background: "#ffffff10", border: "none", borderRadius: 9, color: TEXT, padding: "8px 10px", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>+15s</button>
      <button onClick={onSkip} className="tapable" style={{ background: "none", border: "none", color: SUB, fontSize: 11, cursor: "pointer", padding: "8px 4px" }}>Pular</button>
    </div>
  );
}
