"use client";
import ScreenHeader from "@/components/ScreenHeader";
import RefeicoesTab from "@/components/tabs/RefeicoesTab";

export default function RefeicoesConfigScreen({ data, nav }) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Configurar Refeições" accent="📋" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <RefeicoesTab data={data} />
      </div>
    </div>
  );
}
