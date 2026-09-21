import { useState, useEffect, useRef } from "react";
import { CARD, CARD2, PINK, GRN, SUB, BORDER, TEXT, sBtn } from "@/lib/theme";
import { IconX, IconPlay, IconCheck } from "@/components/icons";
import type { RotinaTarefa } from "@/lib/rotina";
import { corDaCategoria } from "@/lib/rotina";

// A regra dos 5 minutos, virada em botao. O compromisso nunca e "estudar
// 45 minutos" — e "5 minutos". Depois que o timer dos 5 acaba, a tarefa JA
// conta como feita (versao minima); continuar e opcional, e e exatamente ai
// que a maioria continua.

const CINCO_MIN = 5 * 60;
const BLOCO = 45 * 60;

function mmss(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

interface Props {
  tarefa: RotinaTarefa;
  onFechar: () => void;
  onConcluir: (status: "feito" | "minimo") => void;
}

export default function FocoTimer({ tarefa, onFechar, onConcluir }: Props) {
  const cor = corDaCategoria(tarefa.categoria);
  const [fase, setFase] = useState<"pronto" | "cinco" | "passou" | "bloco">("pronto");
  const [restante, setRestante] = useState(CINCO_MIN);
  const totalRef = useRef(CINCO_MIN);

  useEffect(() => {
    if (fase !== "cinco" && fase !== "bloco") return;
    const id = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          clearInterval(id);
          setFase((f) => (f === "cinco" ? "passou" : "passou"));
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [fase]);

  const comecar = (segundos: number, proxima: "cinco" | "bloco") => {
    totalRef.current = segundos;
    setRestante(segundos);
    setFase(proxima);
  };

  const pct = fase === "pronto" ? 0 : 1 - restante / totalRef.current;
  const R = 74;
  const C = 2 * Math.PI * R;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(6,1,14,.82)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onFechar}
    >
      <div
        className="pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: CARD, borderTopLeftRadius: 22, borderTopRightRadius: 22, border: `1px solid ${BORDER}`, borderBottom: "none", padding: "16px 18px calc(env(safe-area-inset-bottom,0px) + 20px)" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: cor }}>Bloco de foco</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: -0.2, marginTop: 2 }}>{tarefa.titulo}</div>
          </div>
          <button onClick={onFechar} className="tapable" aria-label="Fechar" style={{ background: "#ffffff10", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: SUB, cursor: "pointer", flexShrink: 0 }}>
            <IconX size={16} />
          </button>
        </div>

        {tarefa.ancora && fase === "pronto" && (
          <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 11px", fontSize: 11.5, color: TEXT, lineHeight: 1.45, margin: "10px 0 4px" }}>
            {tarefa.ancora}
          </div>
        )}
        {tarefa.nota && fase === "pronto" && (
          <div style={{ fontSize: 10.5, color: SUB, margin: "8px 0 0", lineHeight: 1.4 }}>{tarefa.nota}</div>
        )}

        {/* --- anel --- */}
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 10px" }}>
          <div style={{ position: "relative", width: 176, height: 176 }}>
            <svg width="176" height="176" viewBox="0 0 176 176" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="88" cy="88" r={R} fill="none" stroke={BORDER} strokeWidth="9" />
              <circle
                cx="88" cy="88" r={R} fill="none" stroke={fase === "passou" ? GRN : cor} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
                style={{ transition: "stroke-dashoffset 900ms linear, stroke 300ms ease" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              {fase === "passou" ? (
                <>
                  <IconCheck size={34} style={{ color: GRN }} />
                  <div style={{ fontSize: 11, color: GRN, fontWeight: 700 }}>já conta como feito</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 38, fontWeight: 800, color: TEXT, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>
                    {mmss(fase === "pronto" ? CINCO_MIN : restante)}
                  </div>
                  <div style={{ fontSize: 10.5, color: SUB }}>
                    {fase === "pronto" ? "o compromisso é só isso" : fase === "cinco" ? "só os 5 primeiros" : "bloco cheio"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* --- acoes por fase --- */}
        {fase === "pronto" && (
          <>
            <button onClick={() => comecar(CINCO_MIN, "cinco")} className="tapable" style={{ ...sBtn(cor, true), display: "flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 46, fontSize: 13.5 }}>
              <IconPlay size={16} /> Começar 5 minutos
            </button>
            <div style={{ fontSize: 10.5, color: SUB, textAlign: "center", marginTop: 9, lineHeight: 1.45 }}>
              Celular em outro cômodo. Você não está se comprometendo com o bloco inteiro — só com os 5 primeiros minutos.
            </div>
          </>
        )}

        {(fase === "cinco" || fase === "bloco") && (
          <button onClick={() => { setFase("passou"); setRestante(0); }} className="tapable" style={{ width: "100%", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 10, minHeight: 44, color: SUB, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
              Parar aqui
          </button>
        )}

        {fase === "passou" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => comecar(BLOCO, "bloco")} className="tapable" style={{ ...sBtn(cor, true), minHeight: 46, fontSize: 13.5 }}>
              Continuar — bloco de 45 min
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onConcluir("minimo")} className="tapable" style={{ flex: 1, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 10, minHeight: 44, color: TEXT, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                Marcar mínimo
              </button>
              <button onClick={() => onConcluir("feito")} className="tapable" style={{ flex: 1, background: `${GRN}1e`, border: `1px solid ${GRN}55`, borderRadius: 10, minHeight: 44, color: GRN, fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}>
                Concluir
              </button>
            </div>
            <div style={{ fontSize: 10, color: PINK, opacity: 0.75, textAlign: "center", lineHeight: 1.4 }}>
              Os 5 minutos já valem o X do dia. O resto é bônus.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
