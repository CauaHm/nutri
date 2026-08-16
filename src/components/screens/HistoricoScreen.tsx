import ScreenHeader from "@/components/ScreenHeader";
import HistTab from "@/components/tabs/HistTab";
import type { ScreenProps } from "@/lib/screenProps";

export default function HistoricoScreen({ data, nav }: ScreenProps) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Histórico" accent="📅" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <HistTab data={data} />
      </div>
    </div>
  );
}
