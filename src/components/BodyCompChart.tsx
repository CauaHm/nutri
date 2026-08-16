import { useState } from "react";
import { SUB, BORDER, TEXT } from "@/lib/theme";

export interface ChartPoint {
  x?: string;
  y: number;
  label: string;
}

interface BodyCompChartProps {
  title: string;
  color: string;
  unit: string;
  points: ChartPoint[];
}

// Grafico de linha simples e independente (sem lib externa), 1 serie por
// grafico — titulo ja identifica a serie, entao dispensa legenda (guia da
// skill de dataviz: serie unica nao precisa de legenda em caixa).
export default function BodyCompChart({ title, color, unit, points }: BodyCompChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320, H = 120, PAD_L = 34, PAD_R = 10, PAD_T = 14, PAD_B = 20;

  if (!points || points.length === 0) {
    return (
      <div style={{ padding: "16px 4px", textAlign: "center", color: SUB, fontSize: 11 }}>
        Sem registros ainda para "{title}".
      </div>
    );
  }

  const ys = points.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  min -= pad; max += pad;

  const x = (i: number) => PAD_L + (points.length === 1 ? 0 : (i * (W - PAD_L - PAD_R)) / (points.length - 1));
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - (v - min) / (max - min));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");
  const gridLines = [min, (min + max) / 2, max];
  const active = hover !== null ? points[hover] : points[points.length - 1];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color }}>{active.y}{unit} <span style={{ color: SUB, fontWeight: 400, fontSize: 10 }}>{active.label}</span></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
        onMouseLeave={() => setHover(null)}
      >
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(g)} y2={y(g)} stroke={BORDER} strokeWidth="1" />
            <text x={PAD_L - 6} y={y(g) + 3} textAnchor="end" fontSize="8" fill={SUB}>{g.toFixed(1)}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(i)} cy={y(p.y)} r="10" fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
              style={{ cursor: "pointer" }}
            />
            <circle cx={x(i)} cy={y(p.y)} r={hover === i ? 4.5 : 3} fill={color} stroke="#0d0118" strokeWidth="1.5" />
          </g>
        ))}
        <text x={PAD_L} y={H - 4} fontSize="8" fill={SUB}>{points[0].label}</text>
        <text x={W - PAD_R} y={H - 4} fontSize="8" fill={SUB} textAnchor="end">{points[points.length - 1].label}</text>
      </svg>
    </div>
  );
}
