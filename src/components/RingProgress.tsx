import type { ReactElement } from "react";
import { BORDER, TEXT, SUB } from "@/lib/theme";
import type { IconProps } from "@/components/icons";

interface RingProgressProps {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
  Icon: (p: IconProps) => ReactElement;
  label: string;
  value: string | number;
  onClick?: () => void;
}

export default function RingProgress({ pct, size = 60, stroke = 6, color, Icon, label, value, onClick }: RingProgressProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);

  return (
    <div
      onClick={onClick}
      className={onClick ? "tapable" : undefined}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: onClick ? "pointer" : "default", flex: 1, minWidth: 0 }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke={BORDER} strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          <Icon size={size * 0.34} />
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: TEXT }}>{value}</div>
        <div style={{ fontSize: 9.5, color: SUB, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      </div>
    </div>
  );
}
