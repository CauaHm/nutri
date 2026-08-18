import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { IconEdit, IconTrash, IconPlus, IconChevronUp, IconChevronDown } from "@/components/icons";
import { PURP, PINK, GRN, RED, AMB, SUB, BORDER, TEXT, CARD2, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import { getRestSeconds, inferDefaultRestSeconds } from "@/lib/restTimer";
import { buildAutoSeriesPlan } from "@/lib/seriesPlan";
import { DIAS_PT } from "@/lib/dates";
import type { ScreenProps } from "@/lib/screenProps";
import type { Exercicio, SerieConfig, TipoSerie } from "@/lib/defaults";

interface DiaMetaTemp {
  dia: string;
  tag: string;
  emoji: string;
  cardio: string;
  info: string;
}

// Editor de plano de series (aquecimento/normal/reserva/falha) — usado tanto
// no formulario de editar exercicio quanto no de adicionar exercicio.
// Colapsavel, mesmo padrao ja usado neste arquivo pra "Ver notas do
// exercicio" (estado boolean + botao de texto). Aberto por padrao so se o
// exercicio ja tiver series ao montar (a decisao e tomada uma vez, no mount
// — cada exercicio editado gera uma instancia nova deste componente).
function SeriesPlanner({ series, proto, onChange }: { series: SerieConfig[]; proto: string; onChange: (next: SerieConfig[]) => void }) {
  const [aberto, setAberto] = useState(series.length > 0);
  const [ultimaAteFalha, setUltimaAteFalha] = useState(false);

  const updateRow = (i: number, patch: Partial<SerieConfig>) => onChange(series.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const removeRow = (i: number) => onChange(series.filter((_, j) => j !== i));
  const addRow = () => onChange([...series, { tipo: "normal" }]);
  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= series.length) return;
    const next = [...series];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const gerarAuto = () => {
    onChange(buildAutoSeriesPlan({ nome: "", proto: proto || "", foco: "", nota: "" }, { lastSetToFailure: ultimaAteFalha }));
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" onClick={() => setAberto((v) => !v)} style={{ background: "none", border: "none", color: SUB, fontSize: 11.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
        {aberto ? "Ocultar planejamento de séries" : "Planejar séries"}
      </button>
      {aberto && (
        <div style={{ marginTop: 8, padding: 10, background: "#ffffff08", borderRadius: 9, borderLeft: `2px solid ${PURP}` }}>
          {series.length === 0 && <div style={{ fontSize: 11, color: SUB, marginBottom: 8 }}>Sem plano próprio — usa o protocolo padrão ({proto || "não definido"}) como séries normais.</div>}
          {series.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: SUB, width: 14, flexShrink: 0, textAlign: "center" }}>{i + 1}</span>
              <select style={{ ...sInp, flex: "1 1 96px", minHeight: 32, padding: "5px 8px", fontSize: 11.5 }} value={s.tipo} onChange={(e) => updateRow(i, { tipo: e.target.value as TipoSerie })}>
                <option value="aquecimento">Aquecimento</option>
                <option value="normal">Normal</option>
                <option value="reserva">Reserva (RIR)</option>
                <option value="falha">Até a falha</option>
              </select>
              <input style={{ ...sInp, flex: "1 1 64px", minHeight: 32, padding: "5px 8px", fontSize: 11.5 }} placeholder="reps" value={s.reps || ""} onChange={(e) => updateRow(i, { reps: e.target.value })} />
              {s.tipo === "reserva" && (
                <input type="number" style={{ ...sInp, width: 58, minHeight: 32, padding: "5px 8px", fontSize: 11.5 }} placeholder="RIR" value={s.rir ?? ""} onChange={(e) => updateRow(i, { rir: e.target.value ? Number(e.target.value) : undefined })} />
              )}
              {s.tipo === "aquecimento" && (
                <input type="number" style={{ ...sInp, width: 58, minHeight: 32, padding: "5px 8px", fontSize: 11.5 }} placeholder="%" value={s.percentual ?? ""} onChange={(e) => updateRow(i, { percentual: e.target.value ? Number(e.target.value) : undefined })} />
              )}
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <button type="button" onClick={() => moveRow(i, -1)} disabled={i === 0} className="tapable" style={{ background: "none", border: "none", color: i === 0 ? BORDER : SUB, cursor: i === 0 ? "default" : "pointer", padding: 2 }}><IconChevronUp size={14} /></button>
                <button type="button" onClick={() => moveRow(i, 1)} disabled={i === series.length - 1} className="tapable" style={{ background: "none", border: "none", color: i === series.length - 1 ? BORDER : SUB, cursor: i === series.length - 1 ? "default" : "pointer", padding: 2 }}><IconChevronDown size={14} /></button>
                <button type="button" onClick={() => removeRow(i)} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 2 }}><IconTrash size={14} /></button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addRow} className="tapable" style={{ width: "100%", padding: "8px 0", background: "#ffffff08", border: `1px dashed ${BORDER}`, borderRadius: 8, color: PURP, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 4 }}>
            <IconPlus size={12} /> Adicionar série
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: SUB, cursor: "pointer" }}>
              <input type="checkbox" checked={ultimaAteFalha} onChange={(e) => setUltimaAteFalha(e.target.checked)} />
              última série até a falha
            </label>
          </div>
          <button type="button" onClick={gerarAuto} className="tapable" style={{ width: "100%", marginTop: 8, padding: "9px 0", background: `${AMB}18`, border: `1px solid ${AMB}40`, borderRadius: 8, color: AMB, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
            ⚡ Gerar automaticamente
          </button>
        </div>
      )}
    </div>
  );
}

export default function TreinoDiaScreen({ data, nav, rest, params }: ScreenProps) {
  const { user, treino, saveTreino, liveSession, saveLiveSession } = data;
  const di = params?.dayIndex;
  const dia = treino?.[di];

  const [exAberto, setExAberto] = useState<number | null>(null);
  const [editEx, setEditEx] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Exercicio>>({});
  const [addingEx, setAddingEx] = useState(false);
  const [newEx, setNewEx] = useState<Exercicio>({ nome: "", proto: "3×12", foco: "", nota: "" });
  const [editDiaMeta, setEditDiaMeta] = useState(false);
  const [diaMetaTemp, setDiaMetaTemp] = useState<DiaMetaTemp | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmSwitchSessao, setConfirmSwitchSessao] = useState(false);

  if (!dia || !treino) {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Treino" onBack={nav.pop} />
        <div style={{ padding: 24, color: SUB, textAlign: "center", fontSize: 12 }}>Esse dia não existe mais.</div>
      </div>
    );
  }

  const startEdit = (ei: number) => { setEditEx(ei); setEditData({ ...dia.exercicios[ei] }); };
  const confirmEdit = async () => {
    const next = treino.map((d, i) => (i === di ? { ...d, exercicios: d.exercicios.map((e, j) => (j === editEx ? { ...e, ...editData } : e)) } : d));
    await saveTreino(next);
    setEditEx(null);
  };
  const delEx = async (ei: number) => {
    const next = treino.map((d, i) => (i === di ? { ...d, exercicios: d.exercicios.filter((_, j) => j !== ei) } : d));
    await saveTreino(next);
  };
  const addEx = async () => {
    if (!newEx.nome) return;
    const next = treino.map((d, i) => (i === di ? { ...d, exercicios: [...d.exercicios, { ...newEx, id: Date.now() }] } : d));
    await saveTreino(next);
    setAddingEx(false);
    setNewEx({ nome: "", proto: "3×12", foco: "", nota: "" });
  };
  const saveDiaMeta = async () => {
    const next = treino.map((d, i) => (i === di ? { ...d, ...diaMetaTemp } : d));
    await saveTreino(next);
    setEditDiaMeta(false);
  };
  const delDia = async () => {
    const next = treino.filter((_, i) => i !== di);
    await saveTreino(next);
    nav.pop();
  };

  return (
    <div style={{ minHeight: "100%", paddingBottom: 60 }}>
      <ScreenHeader title={dia.dia} subtitle={dia.tag} accent={dia.emoji} onBack={nav.pop} right={
        <button onClick={() => { setDiaMetaTemp({ dia: dia.dia, tag: dia.tag, emoji: dia.emoji, cardio: dia.cardio || "", info: dia.info || "" }); setEditDiaMeta(true); }} className="tapable" style={{ background: "#ffffff10", border: "none", borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT, cursor: "pointer" }}>
          <IconEdit size={16} />
        </button>
      } />

      <div style={{ padding: 14 }}>
        {editDiaMeta && diaMetaTemp && (
          <div style={{ ...sCard, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: TEXT }}>Editar dia</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: 8 }}>
              <div>
                <label style={sLbl}>Dia</label>
                <select style={sInp} value={diaMetaTemp.dia} onChange={(e) => setDiaMetaTemp((p) => (p ? { ...p, dia: e.target.value } : p))}>
                  {DIAS_PT.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><label style={sLbl}>Tipo</label><input style={sInp} value={diaMetaTemp.tag} onChange={(e) => setDiaMetaTemp((p) => (p ? { ...p, tag: e.target.value } : p))} /></div>
              <div><label style={sLbl}>Emoji</label><input style={sInp} value={diaMetaTemp.emoji} onChange={(e) => setDiaMetaTemp((p) => (p ? { ...p, emoji: e.target.value } : p))} /></div>
            </div>
            <label style={sLbl}>Cardio</label><input style={sInp} value={diaMetaTemp.cardio} onChange={(e) => setDiaMetaTemp((p) => (p ? { ...p, cardio: e.target.value } : p))} placeholder="ex: 40 min esteira" />
            <label style={sLbl}>Informação extra (opcional)</label><input style={sInp} value={diaMetaTemp.info} onChange={(e) => setDiaMetaTemp((p) => (p ? { ...p, info: e.target.value } : p))} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={saveDiaMeta}>Salvar</button>
              <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setEditDiaMeta(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {(dia.info || dia.cardio) && (
          <div style={{ marginBottom: 14 }}>
            {dia.info && <div style={{ padding: "9px 12px", fontSize: 11.5, color: PURP, background: `${PURP}12`, borderRadius: 10, marginBottom: 6 }}>📋 {dia.info}</div>}
            {dia.cardio && <div style={{ padding: "9px 12px", fontSize: 11.5, color: GRN, background: `${GRN}12`, borderRadius: 10 }}>🏃 {dia.cardio}</div>}
          </div>
        )}

        <div style={{ ...sCard, overflow: "hidden" }}>
          {dia.exercicios.length === 0 && <div style={{ padding: 18, textAlign: "center", color: SUB, fontSize: 12 }}>Dia de cardio — sem exercícios cadastrados.</div>}
          {dia.exercicios.map((ex, ei) => (
            <div key={ei} style={{ borderBottom: ei < dia.exercicios.length - 1 || addingEx ? `1px solid ${BORDER}` : "none" }}>
              {editEx === ei ? (
                <div style={{ padding: 14 }}>
                  {([["nome", "Nome"], ["proto", "Protocolo"], ["foco", "Foco muscular"], ["nota", "Notas"]] as const).map(([k, l]) => (
                    <div key={k}><label style={sLbl}>{l}</label><input style={sInp} value={editData[k] || ""} onChange={(e) => setEditData((p) => ({ ...p, [k]: e.target.value }))} /></div>
                  ))}
                  <div>
                    <label style={sLbl}>Descanso entre séries (segundos)</label>
                    <input style={sInp} type="number" value={editData.restSeconds ?? ""} placeholder={String(inferDefaultRestSeconds(editData, dia))} onChange={(e) => setEditData((p) => ({ ...p, restSeconds: e.target.value ? Number(e.target.value) : undefined }))} />
                  </div>
                  <SeriesPlanner series={editData.series || []} proto={editData.proto || ""} onChange={(next) => setEditData((p) => ({ ...p, series: next }))} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button style={{ ...sBtn(GRN), flex: 1 }} onClick={confirmEdit}>Salvar</button>
                    <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setEditEx(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => setExAberto(exAberto === ei ? null : ei)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: TEXT }}>{ex.nome}</div>
                      {ex.foco && <div style={{ fontSize: 9.5, color: PINK, background: `${PINK}18`, padding: "2px 7px", borderRadius: 8, display: "inline-block", marginTop: 3 }}>{ex.foco}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ background: CARD2, color: PURP, fontSize: 10.5, padding: "3px 8px", borderRadius: 10 }}>{ex.proto}</span>
                      <button onClick={(e) => { e.stopPropagation(); rest.start(getRestSeconds(ex, dia), ex.nome, { exId: ex.id, dayIndex: di }); }} className="tapable" style={{ background: `${user.cor}20`, border: "none", borderRadius: 8, color: user.cor, fontSize: 10, fontWeight: 700, padding: "5px 9px", cursor: "pointer" }}>▶ Descanso</button>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(ei); }} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 2 }}><IconEdit size={15} /></button>
                      <button onClick={(e) => { e.stopPropagation(); delEx(ei); }} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 2 }}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  {exAberto === ei && ex.nota && <div style={{ marginTop: 8, fontSize: 11.5, color: SUB, lineHeight: 1.5, padding: "8px 10px", background: "#ffffff08", borderRadius: 9, borderLeft: `2px solid ${PURP}` }}>{ex.nota}</div>}
                </div>
              )}
            </div>
          ))}
          {addingEx ? (
            <div style={{ padding: 14 }}>
              {([["nome", "Nome do exercício"], ["proto", "Protocolo (ex: 3×12)"], ["foco", "Foco muscular"], ["nota", "Notas (opcional)"]] as const).map(([k, l]) => (
                <div key={k}><label style={sLbl}>{l}</label><input style={sInp} value={newEx[k] || ""} onChange={(e) => setNewEx((p) => ({ ...p, [k]: e.target.value }))} placeholder={l} /></div>
              ))}
              <div>
                <label style={sLbl}>Descanso entre séries (segundos)</label>
                <input style={sInp} type="number" value={newEx.restSeconds ?? ""} placeholder={String(inferDefaultRestSeconds(newEx, dia))} onChange={(e) => setNewEx((p) => ({ ...p, restSeconds: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
              <SeriesPlanner series={newEx.series || []} proto={newEx.proto || ""} onChange={(next) => setNewEx((p) => ({ ...p, series: next }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={addEx}>+ Adicionar</button>
                <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setAddingEx(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingEx(true)} className="tapable" style={{ width: "100%", padding: 13, background: "#ffffff06", border: "none", color: user.cor, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <IconPlus size={15} /> Adicionar exercício
            </button>
          )}
        </div>

        {dia.exercicios.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {confirmSwitchSessao ? (
              <div style={{ ...sCard, padding: 14 }}>
                <div style={{ fontSize: 12, color: SUB, lineHeight: 1.6, marginBottom: 10 }}>
                  Você tem um treino em andamento em outro dia ({liveSession?.dayTag}). Iniciar este vai descartar o progresso anterior.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={async () => { await saveLiveSession(null); setConfirmSwitchSessao(false); nav.push("treino-live", { dayIndex: di }); }}>Começar mesmo assim</button>
                  <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setConfirmSwitchSessao(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                style={{ ...sBtn(user.cor, true) }}
                onClick={() => {
                  if (liveSession && liveSession.dayIndex !== di) setConfirmSwitchSessao(true);
                  else nav.push("treino-live", { dayIndex: di });
                }}
              >
                {liveSession?.dayIndex === di ? "▶ Retomar treino" : "▶ Iniciar treino"}
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)} className="tapable" style={{ width: "100%", background: "none", border: `1px solid ${RED}50`, borderRadius: 10, color: RED, fontSize: 12, fontWeight: 700, padding: "11px 0", cursor: "pointer" }}>Excluir este dia de treino</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={delDia} className="tapable" style={{ flex: 1, background: RED, border: "none", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 700, padding: "11px 0", cursor: "pointer" }}>Confirmar exclusão</button>
              <button onClick={() => setConfirmDel(false)} className="tapable" style={{ flex: 1, background: "#ffffff10", border: "none", borderRadius: 10, color: SUB, fontSize: 12, fontWeight: 700, padding: "11px 0", cursor: "pointer" }}>Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
