import type { CSSProperties, ReactNode } from "react";
import { CYAN, SHADOW_POP } from "@/lib/theme";

interface SystemPanelProps {
  children: ReactNode;
  accentColor?: string;
  style?: CSSProperties;
  className?: string;
}

// Wrapper visual de "janela de sistema" — deliberadamente distinto do resto
// do app (borda fina colorida, cantos quase retos em vez do RADIUS=16
// padrao, fundo com blur, fonte monoespacada). E o "assinatura visual" de
// tudo que pertence a "O Sistema".
export default function SystemPanel({ children, accentColor = CYAN, style, className }: SystemPanelProps) {
  return (
    <div
      className={["system-panel-in", className].filter(Boolean).join(" ")}
      style={{
        border: `1px solid ${accentColor}66`,
        borderRadius: 2,
        background: "rgba(13,1,24,0.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: `0 0 24px -6px ${accentColor}55, ${SHADOW_POP}`,
        fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
        letterSpacing: 0.4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
