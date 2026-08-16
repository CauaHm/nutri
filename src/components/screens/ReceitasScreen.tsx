import ScreenHeader from "@/components/ScreenHeader";
import ReceitasTab from "@/components/tabs/ReceitasTab";
import type { ScreenProps } from "@/lib/screenProps";

export default function ReceitasScreen({ data, nav }: ScreenProps) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Receitas" accent="🍳" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <ReceitasTab data={data} />
      </div>
    </div>
  );
}
