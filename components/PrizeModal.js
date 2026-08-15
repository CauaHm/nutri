"use client";
import { CARD, sBtn } from "@/lib/theme";

export default function PrizeModal({ winnerUser, metaPontos, onNovaRodada }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: CARD, borderRadius: 20, padding: 28, textAlign: "center", border: `2px solid ${winnerUser.cor}`, maxWidth: 320, width: "100%" }}>
        <div style={{ fontSize: 56 }}>🏆</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: winnerUser.cor, margin: "12px 0 4px" }}>{winnerUser.nome} venceu!</div>
        <div style={{ color: "#7c6a9a", fontSize: 12, marginBottom: 20 }}>Chegou em {metaPontos} pontos! O outro tem que pagar um prêmio. 😄</div>
        <div style={{ background: `${winnerUser.cor}20`, borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 11, color: winnerUser.cor }}>
          🎁 Decidam juntos qual é o prêmio e comecem nova rodada!
        </div>
        <button style={sBtn(winnerUser.cor, true)} onClick={onNovaRodada}>✅ Prêmio combinado — Nova Rodada!</button>
      </div>
    </div>
  );
}
