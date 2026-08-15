"use client";
import ScreenHeader from "@/components/ScreenHeader";
import RankingTab from "@/components/tabs/RankingTab";

export default function RankingScreen({ data, nav }) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Ranking" accent="🏆" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <RankingTab data={data} />
      </div>
    </div>
  );
}
