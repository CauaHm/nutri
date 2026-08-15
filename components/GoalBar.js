"use client";
import { RED, GRN, SUB, TEXT } from "@/lib/theme";

// Barra de progresso que "estoura": passa de 100% e muda de cor (vermelho
// se a meta era um teto, ex: kcal; verde/dourado se era um piso, ex: agua
// e proteina — passar da meta ali e bom).
export default function GoalBar({ label, value, meta, unit = "", color, direction = "floor", Icon }) {
  const pct = meta ? (value / meta) * 100 : 0;
  const over = meta > 0 && pct > 100;
  const barColor = over ? (direction === "ceiling" ? RED : GRN) : color;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: TEXT, fontWeight: 700 }}>
          {Icon && <Icon size={13} style={{ color: barColor }} />} {label}
        </span>
        <span style={{ color: barColor, fontWeight: 800 }}>
          {value}{unit} <span style={{ color: SUB, fontWeight: 400 }}>/ {meta}{unit}</span>
          {over && <span style={{ marginLeft: 4 }}>· +{Math.round(pct - 100)}%</span>}
        </span>
      </div>
      <div style={{ position: "relative", background: "#ffffff12", borderRadius: 7, height: 8, marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: barColor, borderRadius: 7, transition: "width 400ms ease, background 300ms ease" }} />
        {over && <div className="bar-overflow-pulse" style={{ position: "absolute", inset: 0, borderRadius: 7, boxShadow: `inset 0 0 0 2px ${barColor}` }} />}
      </div>
    </div>
  );
}
