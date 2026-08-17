import { CYAN, TEXT } from "@/lib/theme";

export interface XPToastEntry {
  id: number;
  amount: number;
  label?: string;
}

interface XPToastProps {
  entries: XPToastEntry[];
  onDone: (id: number) => void;
}

// Stack fixa de "+XP" subindo e sumindo ao cumprir missao. Duracao/curva
// vivem em globals.css (.xp-toast), com bloqueio via prefers-reduced-motion.
export default function XPToast({ entries, onDone }: XPToastProps) {
  if (!entries.length) return null;
  return (
    <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top,0px) + 64px)", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none", zIndex: 60 }}>
      {entries.map((e) => (
        <div
          key={e.id}
          className="xp-toast"
          onAnimationEnd={() => onDone(e.id)}
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
            fontWeight: 800,
            fontSize: 13,
            color: CYAN,
            background: "rgba(13,1,24,0.85)",
            border: `1px solid ${CYAN}66`,
            borderRadius: 2,
            padding: "6px 14px",
            boxShadow: `0 0 16px -4px ${CYAN}66`,
          }}
        >
          +{e.amount} XP{e.label ? <span style={{ color: TEXT, fontWeight: 600 }}> · {e.label}</span> : null}
        </div>
      ))}
    </div>
  );
}
