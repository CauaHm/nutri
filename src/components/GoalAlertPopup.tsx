import { CARD, GRN, AMB, SUB, sBtn } from "@/lib/theme";
import type { GoalAlert } from "@/lib/useGoalAlerts";

interface GoalAlertPopupProps {
  alert: GoalAlert | null;
  onClose: () => void;
}

export default function GoalAlertPopup({ alert, onClose }: GoalAlertPopupProps) {
  if (!alert) return null;
  const color = alert.kind === "warning" ? AMB : GRN;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000000b3", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="pop-in" style={{ background: CARD, borderRadius: 20, padding: 26, textAlign: "center", border: `2px solid ${color}`, maxWidth: 300, width: "100%", boxShadow: `0 0 40px -8px ${color}80` }}>
        <div style={{ fontSize: 46 }}>{alert.emoji}</div>
        <div style={{ fontWeight: 800, fontSize: 17, color, margin: "10px 0 6px" }}>{alert.title}</div>
        <div style={{ color: SUB, fontSize: 12.5, marginBottom: 18, lineHeight: 1.5 }}>{alert.text}</div>
        <button style={sBtn(color, true)} onClick={onClose}>Entendi</button>
      </div>
    </div>
  );
}
