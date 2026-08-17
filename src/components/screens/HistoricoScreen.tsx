import ScreenHeader from "@/components/ScreenHeader";
import HistTab from "@/components/tabs/HistTab";
import { IconChevronRight } from "@/components/icons";
import { TEXT, SUB, BORDER, sCard } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";

export default function HistoricoScreen({ data, nav }: ScreenProps) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Histórico" accent="📅" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <button onClick={() => nav.push("balanco")} className="tapable" style={{ ...sCard, display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", marginBottom: 14, border: `1px solid ${BORDER}`, cursor: "pointer" }}>
          <span style={{ fontSize: 18 }}>⚖️</span>
          <span style={{ flex: 1, textAlign: "left", fontWeight: 700, fontSize: 13, color: TEXT }}>Balanço Energético</span>
          <IconChevronRight size={16} style={{ color: SUB }} />
        </button>
        <HistTab data={data} />
      </div>
    </div>
  );
}
