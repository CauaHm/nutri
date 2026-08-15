"use client";
import { TEXT, SUB, BORDER } from "@/lib/theme";
import { IconChevronLeft } from "@/components/icons";

// Cabecalho padrao: telas raiz (bottom nav) nao tem back, telas empilhadas
// (pushadas por um botao) mostram seta de voltar + titulo — igual navegacao
// nativa (UINavigationController / Android back stack).
export default function ScreenHeader({ title, subtitle, onBack, right, accent }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "linear-gradient(180deg,#170a2b 0%,#12071f 100%)",
        borderBottom: `1px solid ${BORDER}`,
        padding: "calc(env(safe-area-inset-top,0px) + 12px) 14px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button
            onClick={onBack}
            className="tapable"
            aria-label="Voltar"
            style={{ background: "#ffffff10", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT, cursor: "pointer", flexShrink: 0 }}
          >
            <IconChevronLeft size={19} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: TEXT, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {accent && <span style={{ color: accent }}>{accent} </span>}{title}
          </div>
          {subtitle && <div style={{ fontSize: 11, color: SUB, marginTop: 1 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}
