"use client";
import ScreenHeader from "@/components/ScreenHeader";
import ReceitasTab from "@/components/tabs/ReceitasTab";

export default function ReceitasScreen({ data, nav }) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Receitas" accent="🍳" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <ReceitasTab data={data} />
      </div>
    </div>
  );
}
