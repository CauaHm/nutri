import ScreenHeader from "@/components/ScreenHeader";
import ComprasTab from "@/components/tabs/ComprasTab";
import type { ScreenProps } from "@/lib/screenProps";

export default function ComprasScreen({ data, nav }: ScreenProps) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Lista de Compras" accent="🛒" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <ComprasTab data={data} />
      </div>
    </div>
  );
}
