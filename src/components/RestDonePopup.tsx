import { CARD, GRN, SUB, TEXT, sBtn } from "@/lib/theme";

interface RestDonePopupProps {
  restDone: { label: string } | null;
  onClose: () => void;
}

// Popup de "acabou o descanso". Existe porque o som/vibracao passam batido
// com o celular no bolso ou no mudo, e a notificacao do sistema so aparece
// se a permissao foi concedida — o popup e o unico aviso que sempre chega.
// Fica ate ser fechado (ver restDone em useRestTimer).
export default function RestDonePopup({ restDone, onClose }: RestDonePopupProps) {
  if (!restDone) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000000b3", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="pop-in" style={{ background: CARD, borderRadius: 20, padding: 26, textAlign: "center", border: `2px solid ${GRN}`, maxWidth: 300, width: "100%", boxShadow: `0 0 40px -8px ${GRN}80` }}>
        <div style={{ fontSize: 46 }}>⏱️</div>
        <div style={{ fontWeight: 800, fontSize: 17, color: GRN, margin: "10px 0 6px" }}>Descanso concluído!</div>
        <div style={{ color: SUB, fontSize: 12.5, marginBottom: 4, lineHeight: 1.5 }}>Hora da próxima série de</div>
        <div style={{ color: TEXT, fontSize: 13.5, fontWeight: 700, marginBottom: 18 }}>{restDone.label}</div>
        <button style={sBtn(GRN, true)} onClick={onClose}>Bora</button>
      </div>
    </div>
  );
}
