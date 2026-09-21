import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { CARD2, PINK, GRN, AMB, RED, PURP, SUB, BORDER, TEXT, sCard, sInp, sBtn } from "@/lib/theme";
import { IconCheck, IconClock, IconTarget, IconRotate } from "@/components/icons";
import { corDaCategoria, addDias, nomeDoDia, resumoDoDia } from "@/lib/rotina";
import type { ScreenProps } from "@/lib/screenProps";

// O passo 10 do protocolo: 10 minutos de domingo, duas perguntas.
// "Em que dias eu não fiz" e "o que estava acontecendo naquele momento".
// A tela nunca pede mais que isso — e o que faz a revisão realmente
// acontecer toda semana em vez de virar mais uma tarefa adiada.

export default function RevisaoScreen({ data, nav }: ScreenProps) {
  const { rotina, user } = data;
  const acento = user.cor || PINK;
  const [i, setI] = useState(0);
  const [motivo, setMotivo] = useState("");
  const [horario, setHorario] = useState("");
  const [modo, setModo] = useState<null | "outro" | "nao">(null);

  const pendencias = rotina.pendencias;
  const atual = pendencias[i] || null;
  const terminou = !atual;

  const proxima = () => {
    setMotivo("");
    setHorario("");
    setModo(null);
    setI((v) => v + 1);
  };

  const responder = async (status: "outro_horario" | "nao_feito") => {
    if (!atual) return;
    await rotina.marcar(
      atual.tarefa.id,
      status,
      status === "outro_horario" ? { horarioReal: horario.trim() || undefined } : { motivo: motivo.trim() || undefined },
      atual.data
    );
    proxima();
  };

  // Semana que passou, do mais antigo pro mais novo.
  const semana = Array.from({ length: 7 }, (_, k) => {
    const dataBR = addDias(rotina.hoje, -(6 - k));
    return resumoDoDia(rotina.tarefas, rotina.log, dataBR, user._id, rotina.hoje, rotina.config.inicio);
  });

  const padrao = rotina.padrao;

  return (
    <div style={{ paddingBottom: 60 }}>
      <ScreenHeader
        title="Revisão da semana"
        subtitle={terminou ? "Onde a semana travou" : `${i + 1} de ${pendencias.length}`}
        onBack={nav.pop}
      />

      {/* ---------------- a semana em 7 quadrados ---------------- */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ ...sCard, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: SUB, marginBottom: 10 }}>Últimos 7 dias</div>
          <div style={{ display: "flex", gap: 6 }}>
            {semana.map((r) => {
              const cor = r.status === "fechado" ? acento : r.status === "parcial" ? `${AMB}66` : r.status === "vazio" ? "#ffffff08" : `${RED}33`;
              return (
                <div key={r.data} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ width: "100%", height: 38, borderRadius: 8, background: cor, border: `1px solid ${r.status === "falhou" ? `${RED}44` : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: r.status === "fechado" ? "#0d0118" : SUB }}>
                    {r.essenciaisTotal > 0 ? `${r.essenciaisFeitos}/${r.essenciaisTotal}` : "–"}
                  </div>
                  <span style={{ fontSize: 9, color: SUB }}>{nomeDoDia(r.data).slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------- perguntas, uma por vez ---------------- */}
      {!terminou && atual && (
        <div style={{ padding: "14px 16px 0" }}>
          <div className="fade-in-up" key={`${atual.data}-${atual.tarefa.id}`} style={{ ...sCard, padding: 16, borderColor: `${AMB}33` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: corDaCategoria(atual.tarefa.categoria) }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: SUB }}>
                {atual.diaNome}, {atual.data.slice(0, 5)}
              </span>
              <span style={{ fontSize: 10, color: SUB, marginLeft: "auto", display: "flex", alignItems: "center", gap: 3 }}>
                <IconClock size={11} /> {atual.tarefa.fim ? `${atual.tarefa.inicio}–${atual.tarefa.fim}` : atual.tarefa.inicio}
              </span>
            </div>

            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: -0.3, lineHeight: 1.2 }}>{atual.tarefa.titulo}</div>
            <div style={{ fontSize: 12, color: SUB, marginTop: 6, lineHeight: 1.5 }}>
              Ficou sem marcação. Você fez em outro horário, ou não fez?
            </div>

            {modo === null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                <button onClick={() => setModo("outro")} className="tapable" style={{ width: "100%", background: `${GRN}1a`, border: `1px solid ${GRN}55`, borderRadius: 11, minHeight: 46, color: GRN, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  Fiz em outro horário
                </button>
                <button onClick={() => setModo("nao")} className="tapable" style={{ width: "100%", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 11, minHeight: 46, color: TEXT, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  Não fiz
                </button>
                <button onClick={proxima} className="tapable" style={{ width: "100%", background: "none", border: "none", color: SUB, fontSize: 11, cursor: "pointer", paddingTop: 2 }}>
                  Pular essa
                </button>
              </div>
            )}

            {modo === "outro" && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: SUB, marginBottom: 6 }}>Que horas foi?</div>
                <input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="ex: 22:40" style={sInp} autoFocus />
                <button onClick={() => responder("outro_horario")} className="tapable" style={{ ...sBtn(GRN, true), minHeight: 44, marginTop: 10, fontSize: 13 }}>
                  Conta como feito
                </button>
                <button onClick={() => setModo(null)} className="tapable" style={{ width: "100%", background: "none", border: "none", color: SUB, fontSize: 11, cursor: "pointer", paddingTop: 8 }}>Voltar</button>
              </div>
            )}

            {modo === "nao" && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: SUB, marginBottom: 6, lineHeight: 1.45 }}>
                  O que estava acontecendo naquele momento? Escreva curto — é o padrão que importa, não a explicação.
                </div>
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex: cansaço pós-trabalho" style={sInp} autoFocus />
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {["cansaço", "cheguei tarde", "celular", "tarefa mal definida", "imprevisto"].map((s) => (
                    <button key={s} onClick={() => setMotivo(s)} className="tapable" style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: SUB, fontSize: 11, cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => responder("nao_feito")} className="tapable" style={{ ...sBtn(acento, true), minHeight: 44, marginTop: 12, fontSize: 13 }}>
                  Registrar
                </button>
                <button onClick={() => setModo(null)} className="tapable" style={{ width: "100%", background: "none", border: "none", color: SUB, fontSize: 11, cursor: "pointer", paddingTop: 8 }}>Voltar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- o padrão ---------------- */}
      {terminou && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={{ ...sCard, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <IconTarget size={16} style={{ color: acento }} />
              <span style={{ fontSize: 14.5, fontWeight: 800, color: TEXT }}>O que travou</span>
            </div>

            {padrao.totalPendencias === 0 ? (
              <div style={{ fontSize: 12.5, color: GRN, lineHeight: 1.55 }}>
                Semana inteira fechada. Nada pra ajustar — só repetir.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  padrao.tarefaCritica && { label: "Meta que mais falhou", valor: padrao.tarefaCritica.titulo, extra: `${padrao.tarefaCritica.vezes}×`, cor: RED },
                  padrao.diaCritico && { label: "Dia mais difícil", valor: padrao.diaCritico.dia, extra: `${padrao.diaCritico.vezes}×`, cor: AMB },
                  padrao.motivoComum && { label: "Motivo mais repetido", valor: padrao.motivoComum.motivo, extra: `${padrao.motivoComum.vezes}×`, cor: PURP },
                  padrao.totalRecuperadas > 0 && { label: "Feitas em outro horário", valor: `${padrao.totalRecuperadas} ${padrao.totalRecuperadas === 1 ? "meta" : "metas"}`, extra: "", cor: GRN },
                ]
                  .filter(Boolean)
                  .map((linha: any) => (
                    <div key={linha.label} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${BORDER}` }}>
                      <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: linha.cor }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: SUB }}>{linha.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginTop: 2 }}>{linha.valor}</div>
                      </div>
                      {linha.extra && <span style={{ fontSize: 12, fontWeight: 800, color: linha.cor, fontVariantNumeric: "tabular-nums" }}>{linha.extra}</span>}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {padrao.totalPendencias > 0 && (
            <div style={{ ...sCard, padding: 16, marginTop: 12, borderColor: `${acento}33`, background: `linear-gradient(160deg, ${acento}12, #160d28 60%)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <IconRotate size={15} style={{ color: acento }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, color: acento }}>Ajuste da semana</span>
              </div>
              <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.6 }}>
                Mude <b>uma</b> variável só — nunca a rotina inteira.
                {padrao.tarefaCritica && (
                  <> Comece por <b>{padrao.tarefaCritica.titulo}</b>: ou mude o horário, ou baixe a versão mínima até virar impossível de não fazer.</>
                )}
              </div>
              <button
                onClick={() => nav.goTo("rotina", "rotina-config")}
                className="tapable"
                style={{ ...sBtn(acento, true), minHeight: 44, marginTop: 14, fontSize: 13 }}
              >
                Ajustar a rotina
              </button>
            </div>
          )}

          <div style={{ ...sCard, padding: 14, marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <IconCheck size={15} style={{ color: GRN, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.55 }}>
              Ofensiva atual: <b style={{ color: TEXT }}>{rotina.ofensiva.atual} {rotina.ofensiva.atual === 1 ? "dia" : "dias"}</b> de {rotina.ofensiva.meta}.
              {rotina.ofensiva.recorde > rotina.ofensiva.atual && <> Recorde: {rotina.ofensiva.recorde}.</>}
              {" "}Se na semana 2 ainda estiver custando, isso é o esperado.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
