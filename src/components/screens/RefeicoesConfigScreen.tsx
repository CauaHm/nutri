import ScreenHeader from "@/components/ScreenHeader";
import RefeicoesTab from "@/components/tabs/RefeicoesTab";
import type { ScreenProps } from "@/lib/screenProps";

export default function RefeicoesConfigScreen({ data, nav }: ScreenProps) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Configurar Refeições" accent="📋" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <RefeicoesTab data={data} />
      </div>
    </div>
  );
}
