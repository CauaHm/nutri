import { SUB, BORDER } from "@/lib/theme";

export interface CompareSeriesPoint {
  date: string;
  y: number;
}

// As series sao arrays de pontos com metadados extras (nome/cor) anexados
// diretamente no array — mesmo padrão do original em JS (ver ComparativoScreen).
export interface CompareSeries extends Array<CompareSeriesPoint> {
  nome: string;
  color: string;
}

interface CompareChartProps {
  title: string;
  unit: string;
  seriesA: CompareSeries;
  seriesB: CompareSeries;
}

// Grafico de 2 series (eu x parceiro) — com 2+ series a legenda e sempre
// visivel (nunca so cor), por isso os nomes coloridos abaixo do titulo.
export default function CompareChart({ title, unit, seriesA, seriesB }: CompareChartProps) {
  void unit; // preservado do original: prop existe mas nunca é usada no render
  const W = 320, H = 130, PAD_L = 34, PAD_R = 10, PAD_T = 14, PAD_B = 20;
  const all = [...seriesA, ...seriesB];

  if (all.length === 0) {
    return <div style={{ padding: "14px 4px", textAlign: "center", color: SUB, fontSize: 11 }}>Sem dados suficientes pra "{title}" ainda.</div>;
  }

  const ys = all.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.18;
  min -= pad; max += pad;

  const allDates = [...new Set(all.map((p) => p.date))].sort();
  const x = (date: string) => {
    const i = allDates.indexOf(date);
    return PAD_L + (allDates.length === 1 ? 0 : (i * (W - PAD_L - PAD_R)) / (allDates.length - 1));
  };
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - (v - min) / (max - min));

  const pathFor = (series: CompareSeriesPoint[]) => series.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.date).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#ede9f6" }}>{title}</div>
        <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
          <span style={{ color: seriesA.color }}>● {seriesA.nome}</span>
          <span style={{ color: seriesB.color }}>● {seriesB.nome}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[min, (min + max) / 2, max].map((g, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(g)} y2={y(g)} stroke={BORDER} strokeWidth="1" />
            <text x={PAD_L - 6} y={y(g) + 3} textAnchor="end" fontSize="8" fill={SUB}>{g.toFixed(0)}</text>
          </g>
        ))}
        {seriesA.length > 0 && <path d={pathFor(seriesA)} fill="none" stroke={seriesA.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {seriesB.length > 0 && <path d={pathFor(seriesB)} fill="none" stroke={seriesB.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {seriesA.map((p, i) => <circle key={`a${i}`} cx={x(p.date)} cy={y(p.y)} r="3" fill={seriesA.color} stroke="#0d0118" strokeWidth="1.2" />)}
        {seriesB.map((p, i) => <circle key={`b${i}`} cx={x(p.date)} cy={y(p.y)} r="3" fill={seriesB.color} stroke="#0d0118" strokeWidth="1.2" />)}
      </svg>
    </div>
  );
}
