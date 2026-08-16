import ScreenHeader from "@/components/ScreenHeader";
import RankingTab from "@/components/tabs/RankingTab";
import type { ScreenProps } from "@/lib/screenProps";

export default function RankingScreen({ data, nav }: ScreenProps) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Ranking" accent="🏆" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <RankingTab data={data} />
      </div>
    </div>
  );
}
