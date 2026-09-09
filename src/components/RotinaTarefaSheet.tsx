import { useState } from "react";
import { CARD, CARD2, GRN, AMB, RED, SUB, BORDER, TEXT, sInp } from "@/lib/theme";
import { IconX, IconCheck, IconZap, IconClock, IconPlay } from "@/components/icons";
import { corDaCategoria, CATEGORIAS, type RotinaTarefa, type RotinaEntrada, type RotinaStatusEntrada } from "@/lib/rotina";

// Bottom sheet de uma tarefa. Alem de marcar, e onde a intencao de
// implementacao ("Quando eu X, eu vou Y") e a versao minima ficam visiveis —
// os dois campos que fazem a tarefa comecar em vez de ser adiada.

interface Props {
  tarefa: RotinaTarefa;
  entrada: RotinaEntrada | null;
  onFechar: () => void;
  onMarcar: (status: RotinaStatusEntrada, extra?: { motivo?: string; horarioReal?: string }) => void;
  onDesmarcar: () => void;
  onFoco?: () => void;
}

export default function RotinaTarefaSheet({ tarefa, entrada, onFechar, onMarcar, onDesmarcar, onFoco }: Props) {
  const cor = corDaCategoria(tarefa.categoria);
  const [motivo, setMotivo] = useState(entrada?.motivo || "");
  const [horario, setHorario] = useState(entrada?.horarioReal || "");
  const [mostrarNao, setMostrarNao] = useState(false);
  const [mostrarOutro, setMostrarOutro] = useState(false);

  const janela = tarefa.fim ? `${tarefa.inicio} – ${tarefa.fim}` : tarefa.inicio;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(6,1,14,.78)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onFechar}
    >
      <div
        className="pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, maxHeight: "86vh", overflowY: "auto", background: CARD, borderTopLeftRadius: 22, borderTopRightRadius: 22, border: `1px solid ${BORDER}`, borderBottom: "none", padding: "16px 18px calc(env(safe-area-inset-bottom,0px) + 18px)" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: cor }} />
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: cor }}>
                {CATEGORIAS[tarefa.categoria].label}
              </span>
              <span style={{ fontSize: 10, color: SUB, display: "flex", alignItems: "center", gap: 3 }}>
                <IconClock size={11} /> {janela}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: -0.3, marginTop: 4 }}>{tarefa.titulo}</div>
          </div>
          <button onClick={onFechar} className="tapable" aria-label="Fechar" style={{ background: "#ffffff10", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: SUB, cursor: "pointer", flexShrink: 0 }}>
            <IconX size={16} />
          </button>
        </div>

        {tarefa.ancora && (
          <div style={{ background: `${cor}12`, border: `1px solid ${cor}33`, borderRadius: 10, padding: "10px 12px", marginTop: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: cor, marginBottom: 3 }}>Sua âncora</div>
            <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.45 }}>{tarefa.ancora}</div>
          </div>
        )}

        {tarefa.nota && (
          <div style={{ fontSize: 11.5, color: SUB, marginTop: 10, lineHeight: 1.45 }}>{tarefa.nota}</div>
        )}

        {tarefa.minimo && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 11px", marginTop: 10 }}>
            <IconZap size={14} style={{ color: AMB, flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11.5, color: TEXT, lineHeight: 1.45 }}>
              <b style={{ color: AMB }}>Dia ruim:</b> {tarefa.minimo}
              <div style={{ color: SUB, marginTop: 2 }}>Isso já conta como feito e mantém a ofensiva.</div>
            </div>
          </div>
        )}

        {entrada && (
          <div style={{ marginTop: 12, fontSize: 11, color: SUB }}>
            Marcado como <b style={{ color: TEXT }}>{
              entrada.status === "feito" ? "feito" : entrada.status === "minimo" ? "mínimo" : entrada.status === "outro_horario" ? "feito em outro horário" : "não feito"
            }</b>
            {entrada.motivo ? ` — “${entrada.motivo}”` : ""}
          </div>
        )}

        {/* ---- acoes ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {onFoco && (
            <button onClick={onFoco} className="tapable" style={{ width: "100%", background: `${cor}1c`, border: `1px solid ${cor}55`, borderRadius: 11, minHeight: 46, color: cor, fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <IconPlay size={15} /> Começar 5 minutos
            </button>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onMarcar("feito")} className="tapable" style={{ flex: 1, background: `${GRN}1c`, border: `1px solid ${GRN}55`, borderRadius: 11, minHeight: 46, color: GRN, fontWeight: 800, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <IconCheck size={15} /> Feito
            </button>
            {tarefa.minimo && (
              <button onClick={() => onMarcar("minimo")} className="tapable" style={{ flex: 1, background: `${AMB}16`, border: `1px solid ${AMB}44`, borderRadius: 11, minHeight: 46, color: AMB, fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}>
                Mínimo
              </button>
            )}
          </div>

          {!mostrarOutro ? (
            <button onClick={() => setMostrarOutro(true)} className="tapable" style={{ width: "100%", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 11, minHeight: 42, color: SUB, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Fiz em outro horário
            </button>
          ) : (
            <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 11, padding: 11 }}>
              <div style={{ fontSize: 10.5, color: SUB, marginBottom: 6 }}>Que horas você fez?</div>
              <input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="ex: 22:30" style={sInp} />
              <button
                onClick={() => onMarcar("outro_horario", { horarioReal: horario.trim() || undefined })}
                className="tapable"
                style={{ width: "100%", marginTop: 8, background: `${GRN}1c`, border: `1px solid ${GRN}55`, borderRadius: 10, minHeight: 40, color: GRN, fontWeight: 800, fontSize: 12, cursor: "pointer" }}
              >
                Salvar — conta como feito
              </button>
            </div>
          )}

          {!mostrarNao ? (
            <button onClick={() => setMostrarNao(true)} className="tapable" style={{ width: "100%", background: "none", border: `1px solid ${BORDER}`, borderRadius: 11, minHeight: 42, color: SUB, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Não fiz
            </button>
          ) : (
            <div style={{ background: `${RED}12`, border: `1px solid ${RED}33`, borderRadius: 11, padding: 11 }}>
              <div style={{ fontSize: 10.5, color: SUB, marginBottom: 6 }}>O que estava acontecendo? (isso é o que a revisão de domingo lê)</div>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex: cheguei tarde do trabalho" style={sInp} />
              <button
                onClick={() => onMarcar("nao_feito", { motivo: motivo.trim() || undefined })}
                className="tapable"
                style={{ width: "100%", marginTop: 8, background: `${RED}20`, border: `1px solid ${RED}55`, borderRadius: 10, minHeight: 40, color: RED, fontWeight: 800, fontSize: 12, cursor: "pointer" }}
              >
                Registrar
              </button>
            </div>
          )}

          {entrada && (
            <button onClick={onDesmarcar} className="tapable" style={{ width: "100%", background: "none", border: "none", color: SUB, fontSize: 11, cursor: "pointer", paddingTop: 2 }}>
              Limpar marcação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
