export const BG = "#0d0118";
export const CARD = "#160d28";
export const CARD2 = "#1e1035";
export const PINK = "#e040fb";
export const PURP = "#a855f7";
export const GRN = "#4ade80";
export const CYAN = "#22d3ee";
export const AMB = "#f59e0b";
export const RED = "#f87171";
export const TEXT = "#ede9f6";
export const SUB = "#7c6a9a";
export const BORDER = "#2a1a45";

export const COR_PALETTE = [PINK, CYAN, GRN, AMB, PURP, RED, "#60a5fa", "#fb923c"];

export const SHADOW_CARD = "0 1px 2px rgba(0,0,0,.4), 0 8px 20px -12px rgba(0,0,0,.55)";
export const SHADOW_POP = "0 4px 10px rgba(0,0,0,.5), 0 16px 32px -16px rgba(0,0,0,.6)";
export const RADIUS = 16;
export const RADIUS_SM = 11;

export const sCard = {
  background: CARD,
  borderRadius: RADIUS,
  border: `1px solid ${BORDER}`,
  boxShadow: SHADOW_CARD,
  overflow: "hidden",
};

export const sInp = {
  background: CARD2,
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  padding: "10px 12px",
  minHeight: 40,
  color: TEXT,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

export const sLbl = {
  fontSize: 10,
  color: SUB,
  fontWeight: 700,
  display: "block",
  marginBottom: 4,
  marginTop: 10,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

export const sBtn = (cor, full) => ({
  background: `linear-gradient(135deg,${cor},${PURP})`,
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  minHeight: 40,
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: `0 4px 14px -4px ${cor}80`,
  ...(full ? { width: "100%" } : {}),
});

// Cor deterministica a partir de um texto livre (categorias/tags que o
// usuario cria na hora, sem precisar de uma paleta fixa cadastrada).
export function corDeTexto(txt) {
  let h = 0;
  for (let i = 0; i < (txt || "").length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return COR_PALETTE[h % COR_PALETTE.length];
}
