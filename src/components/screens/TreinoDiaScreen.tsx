import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { IconEdit, IconTrash, IconPlus, IconCopy, IconChevronUp, IconChevronDown } from "@/components/icons";
import { PURP, PINK, GRN, RED, AMB, SUB, BORDER, TEXT, CARD2, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import { getRestSeconds, inferDefaultRestSeconds } from "@/lib/restTimer";
import { buildAutoSeriesPlan, getSeriesPlan } from "@/lib/seriesPlan";
import { duplicarDia, duplicarExercicio, moverExercicio, copiarExercicioParaDia } from "@/lib/treinoEdit";
import { DIAS_PT, weekdayPT } from "@/lib/dates";
import type { ScreenProps } from "@/lib/screenProps";
import type { Exercicio, SerieConfig, TipoSerie } from "@/lib/defaults";

interface DiaMetaTemp {
  dia: string;
  tag: string;
  emoji: string;
  cardio: string;
  info: string;
}

const COR_TIPO: Record<TipoSerie, string> = { aquecimento: AMB, normal: SUB, reserva: PURP, falha: RED };
const ROTULO_TIPO: Record<TipoSerie, string> = { aquecimento: "Aquecimento", normal: "Normal", reserva: "Reserva (RIR)", falha: "Até a falha" };

// Linha curta que resume o plano de um exercicio pra ler de relance na lista,
// ex: "1 aquec + 3×8 · RIR 2 · 40kg". Le por getSeriesPlan pra descrever
// tambem quem nao tem plano proprio (cai na heuristica do proto).
function resumoDoPlano(ex: Exercicio): string {
  const plano = getSeriesPlan(ex);
  const aquec = plano.filter((s) => s.tipo === "aquecimento").length;
  const trabalho = plano.filter((s) => s.tipo !== "aquecimento");
  const partes: string[] = [];
  if (aquec) partes.push(`${aquec} aquec`);
  const reps = [...new Set(trabalho.map((s) => s.reps).filter(Boolean))];
  partes.push(`${trabalho.length}×${reps.length === 1 ? reps[0] : reps.length > 1 ? reps.join("/") : "?"}`);
  const rirs = [...new Set(trabalho.map((s) => s.rir).filter((r) => r != null))];
  if (rirs.length === 1) partes.push(`RIR ${rirs[0]}`);
  const pesos = [...new Set(plano.map((s) => s.peso).filter(Boolean))];
  if (pesos.length === 1) partes.push(`${pesos[0]}kg`);
  else if (pesos.length > 1) partes.push("peso planejado");
  return partes.join(" · ");
}

// Editor de plano de series (aquecimento/normal/reserva/falha) — usado tanto
// no formulario de editar exercicio quanto no de adicionar exercicio.
// Colapsavel, mesmo padrao ja usado neste arquivo pra "Ver notas do
// exercicio" (estado boolean + botao de texto). Aberto por padrao so se o
// exercicio ja tiver series ao montar (a decisao e tomada uma vez, no mount
// — cada exercicio editado gera uma instancia nova deste componente).
//
// Cada serie ocupa duas linhas de proposito: numa tela de celular, tipo +
// reps + peso + RIR/% + os botoes nao cabem lado a lado sem virar campo
// minusculo.
function SeriesPlanner({ series, proto, onChange }: { series: SerieConfig[]; proto: string; onChange: (next: SerieConfig[]) => void }) {
  const [aberto, setAberto] = useState(series.length > 0);
  const [ultimaAteFalha, setUltimaAteFalha] = useState(false);
  const [repsTodas, setRepsTodas] = useState("");
  const [pesoTodas, setPesoTodas] = useState("");

  const updateRow = (i: number, patch: Partial<SerieConfig>) => onChange(series.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const removeRow = (i: number) => onChange(series.filter((_, j) => j !== i));
  const addRow = () => onChange([...series, { tipo: "normal" }]);
  const duplicateRow = (i: number) => onChange([...series.slice(0, i + 1), { ...series[i] }, ...series.slice(i + 1)]);
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
  // Reps valem pra qualquer serie; peso so pras de trabalho, porque o
  // aquecimento e calculado pela % do peso de trabalho no treino ao vivo e
  // um peso fixo aqui anularia essa conta sem a pessoa perceber.
  const aplicarEmTodas = () => {
    if (!repsTodas && !pesoTodas) return;
    onChange(series.map((s) => ({
      ...s,
      ...(repsTodas ? { reps: repsTodas } : {}),
      ...(pesoTodas && s.tipo !== "aquecimento" ? { peso: pesoTodas } : {}),
    })));
    setRepsTodas("");
    setPesoTodas("");
  };

  const sMini: React.CSSProperties = { ...sInp, minHeight: 34, padding: "6px 8px", fontSize: 11.5 };
  const sIconBtn = (ativo: boolean): React.CSSProperties => ({ background: "none", border: "none", color: ativo ? SUB : BORDER, cursor: ativo ? "pointer" : "default", padding: 3 });

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" onClick={() => setAberto((v) => !v)} style={{ background: "none", border: "none", color: SUB, fontSize: 11.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
        {aberto ? "Ocultar planejamento de séries" : "Planejar séries (reps, peso, RIR)"}
      </button>
      {aberto && (
        <div style={{ marginTop: 8, padding: 10, background: "#ffffff08", borderRadius: 9, borderLeft: `2px solid ${PURP}` }}>
          {series.length === 0 && <div style={{ fontSize: 11, color: SUB, marginBottom: 8 }}>Sem plano próprio — usa o protocolo padrão ({proto || "não definido"}) como séries normais.</div>}
          {series.map((s, i) => (
            <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < series.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: COR_TIPO[s.tipo], fontWeight: 700, width: 16, flexShrink: 0, textAlign: "center" }}>{i + 1}</span>
                <select style={{ ...sMini, flex: 1 }} value={s.tipo} onChange={(e) => updateRow(i, { tipo: e.target.value as TipoSerie })}>
                  {(Object.keys(ROTULO_TIPO) as TipoSerie[]).map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
                </select>
                <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <button type="button" title="Subir" onClick={() => moveRow(i, -1)} disabled={i === 0} className="tapable" style={sIconBtn(i !== 0)}><IconChevronUp size={14} /></button>
                  <button type="button" title="Descer" onClick={() => moveRow(i, 1)} disabled={i === series.length - 1} className="tapable" style={sIconBtn(i !== series.length - 1)}><IconChevronDown size={14} /></button>
                  <button type="button" title="Duplicar série" onClick={() => duplicateRow(i)} className="tapable" style={sIconBtn(true)}><IconCopy size={13} /></button>
                  <button type="button" title="Remover série" onClick={() => removeRow(i)} className="tapable" style={sIconBtn(true)}><IconTrash size={14} /></button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, paddingLeft: 22 }}>
                <input style={{ ...sMini, flex: 1 }} placeholder="reps (ex: 8-10)" value={s.reps || ""} onChange={(e) => updateRow(i, { reps: e.target.value })} />
                <input style={{ ...sMini, flex: 1 }} inputMode="decimal" placeholder="peso (kg)" value={s.peso || ""} onChange={(e) => updateRow(i, { peso: e.target.value || undefined })} />
                {/* RIR e % ficam com a unidade escrita ao lado: preenchidos,
                    um numero solto de dois digitos ao lado do campo de peso
                    e indistinguivel de mais um peso. */}
                {s.tipo === "reserva" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: PURP, fontWeight: 700 }}>RIR</span>
                    <input type="number" style={{ ...sMini, width: 48 }} placeholder="2" value={s.rir ?? ""} onChange={(e) => updateRow(i, { rir: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                )}
                {s.tipo === "aquecimento" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <input type="number" style={{ ...sMini, width: 48 }} placeholder="60" value={s.percentual ?? ""} onChange={(e) => updateRow(i, { percentual: e.target.value ? Number(e.target.value) : undefined })} />
                    <span style={{ fontSize: 10, color: AMB, fontWeight: 700 }}>%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addRow} className="tapable" style={{ width: "100%", padding: "8px 0", background: "#ffffff08", border: `1px dashed ${BORDER}`, borderRadius: 8, color: PURP, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 4 }}>
            <IconPlus size={12} /> Adicionar série
          </button>

          {series.length > 1 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 10, color: SUB, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Aplicar em todas</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...sMini, flex: 1 }} placeholder="reps" value={repsTodas} onChange={(e) => setRepsTodas(e.target.value)} />
                <input style={{ ...sMini, flex: 1 }} inputMode="decimal" placeholder="peso (kg)" value={pesoTodas} onChange={(e) => setPesoTodas(e.target.value)} />
                <button type="button" onClick={aplicarEmTodas} className="tapable" style={{ flexShrink: 0, padding: "0 14px", background: `${PURP}22`, border: `1px solid ${PURP}45`, borderRadius: 9, color: PURP, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Aplicar</button>
              </div>
              <div style={{ fontSize: 9.5, color: SUB, marginTop: 5, lineHeight: 1.5 }}>O peso vai só nas séries de trabalho — aquecimento continua saindo da % do peso de trabalho.</div>
            </div>
          )}

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
  // Escolha de qual treino comecar. Nem sempre o treino do dia acontece no
  // dia: feriado, imprevisto, e ai a pessoa faz o de segunda numa terca. O
  // padrao continua sendo o dia que ela abriu, so que agora da pra trocar
  // antes de comecar em vez de ter que voltar e achar o outro dia.
  const [iniciando, setIniciando] = useState(false);
  const [diaEscolhido, setDiaEscolhido] = useState(di);
  const [copiarPara, setCopiarPara] = useState<number | null>(null);
  const [avisoCopia, setAvisoCopia] = useState("");

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
    setExAberto(null);
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

  // Duplicar o dia deixa o usuario NA copia (que entra logo depois do
  // original), pra ele ja sair editando o que quis mudar.
  const duplicarEsteDia = async () => {
    await saveTreino(duplicarDia(treino, di));
    nav.pop();
    nav.push("treino-dia", { dayIndex: di + 1 });
  };
  const moverEx = async (ei: number, dir: -1 | 1) => {
    await saveTreino(moverExercicio(treino, di, ei, dir));
    setExAberto(ei + dir);
  };
  const duplicarEx = async (ei: number) => {
    await saveTreino(duplicarExercicio(treino, di, ei));
    setExAberto(null);
  };
  const copiarEx = async (ei: number, destino: number) => {
    await saveTreino(copiarExercicioParaDia(treino, di, ei, destino));
    setCopiarPara(null);
    setAvisoCopia(`Copiado pra ${treino[destino].dia} · ${treino[destino].tag}`);
    setTimeout(() => setAvisoCopia(""), 2500);
  };

  const hojePT = weekdayPT();
  const escolhido = treino[diaEscolhido];
  const sessaoEmOutroDia = !!liveSession && liveSession.dayIndex !== diaEscolhido;

  const sAcao = (cor: string): React.CSSProperties => ({ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flex: 1, background: `${cor}18`, border: `1px solid ${cor}35`, borderRadius: 8, color: cor, fontSize: 10.5, fontWeight: 700, padding: "8px 4px", cursor: "pointer" });

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

        {avisoCopia && <div style={{ marginBottom: 10, padding: "9px 12px", fontSize: 11.5, color: GRN, background: `${GRN}15`, borderRadius: 10 }}>✓ {avisoCopia}</div>}

        <div style={{ ...sCard, overflow: "hidden" }}>
          {dia.exercicios.length === 0 && <div style={{ padding: 18, textAlign: "center", color: SUB, fontSize: 12 }}>Nenhum exercício ainda — adicione abaixo ou copie de outro dia.</div>}
          {dia.exercicios.map((ex, ei) => (
            <div key={ex.id ?? ei} style={{ borderBottom: ei < dia.exercicios.length - 1 || addingEx ? `1px solid ${BORDER}` : "none" }}>
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
                <div style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => { setExAberto(exAberto === ei ? null : ei); setCopiarPara(null); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: TEXT }}>{ex.nome}</div>
                      <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{resumoDoPlano(ex)}</div>
                      {ex.foco && <div style={{ fontSize: 9.5, color: PINK, background: `${PINK}18`, padding: "2px 7px", borderRadius: 8, display: "inline-block", marginTop: 4 }}>{ex.foco}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ background: CARD2, color: PURP, fontSize: 10.5, padding: "3px 8px", borderRadius: 10 }}>{ex.proto}</span>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(ei); }} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 2 }}><IconEdit size={15} /></button>
                    </div>
                  </div>

                  {exAberto === ei && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10 }}>
                      {ex.nota && <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.5, padding: "8px 10px", background: "#ffffff08", borderRadius: 9, borderLeft: `2px solid ${PURP}`, marginBottom: 8 }}>{ex.nota}</div>}
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <button onClick={() => rest.start(getRestSeconds(ex, dia), ex.nome, { exId: ex.id, dayIndex: di })} className="tapable" style={sAcao(user.cor)}>▶ Descanso</button>
                        <button onClick={() => moverEx(ei, -1)} disabled={ei === 0} className="tapable" style={{ ...sAcao(SUB), opacity: ei === 0 ? 0.4 : 1, cursor: ei === 0 ? "default" : "pointer" }}><IconChevronUp size={13} /> Subir</button>
                        <button onClick={() => moverEx(ei, 1)} disabled={ei === dia.exercicios.length - 1} className="tapable" style={{ ...sAcao(SUB), opacity: ei === dia.exercicios.length - 1 ? 0.4 : 1, cursor: ei === dia.exercicios.length - 1 ? "default" : "pointer" }}><IconChevronDown size={13} /> Descer</button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => duplicarEx(ei)} className="tapable" style={sAcao(PURP)}><IconCopy size={13} /> Duplicar</button>
                        {treino.length > 1 && <button onClick={() => setCopiarPara(copiarPara === ei ? null : ei)} className="tapable" style={sAcao(PINK)}>→ Copiar pra outro dia</button>}
                        <button onClick={() => delEx(ei)} className="tapable" style={sAcao(RED)}><IconTrash size={13} /> Excluir</button>
                      </div>
                      {copiarPara === ei && (
                        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                          <select style={{ ...sInp, minHeight: 36, fontSize: 12, flex: 1 }} defaultValue="" onChange={(e) => { if (e.target.value !== "") copiarEx(ei, Number(e.target.value)); }}>
                            <option value="">Copiar pra qual dia?</option>
                            {treino.map((d, i) => i !== di && <option key={i} value={i}>{d.dia} · {d.tag}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
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
            {iniciando ? (
              <div style={{ ...sCard, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, marginBottom: 2 }}>Qual treino você vai fazer?</div>
                <div style={{ fontSize: 11, color: SUB, marginBottom: 8 }}>Hoje é {hojePT}. Dá pra fazer o treino de outro dia.</div>
                <select style={sInp} value={diaEscolhido} onChange={(e) => setDiaEscolhido(Number(e.target.value))}>
                  {treino.map((d, i) => d.exercicios.length > 0 && (
                    <option key={i} value={i}>{d.emoji} {d.dia} · {d.tag}{d.dia === hojePT ? " (hoje)" : ""}</option>
                  ))}
                </select>
                {escolhido && (
                  <div style={{ fontSize: 11, color: SUB, marginTop: 8 }}>
                    {escolhido.exercicios.length} exercícios{escolhido.info ? ` · ${escolhido.info}` : ""}
                  </div>
                )}
                {sessaoEmOutroDia && (
                  <div style={{ fontSize: 11.5, color: AMB, background: `${AMB}12`, borderRadius: 9, padding: "9px 11px", marginTop: 10, lineHeight: 1.5 }}>
                    Você tem um treino em andamento ({liveSession?.dayTag}). Começar este vai descartar o progresso dele.
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    style={{ ...sBtn(user.cor), flex: 1 }}
                    onClick={async () => {
                      if (sessaoEmOutroDia) await saveLiveSession(null);
                      setIniciando(false);
                      nav.push("treino-live", { dayIndex: diaEscolhido });
                    }}
                  >
                    ▶ Começar
                  </button>
                  <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setIniciando(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                style={{ ...sBtn(user.cor, true) }}
                onClick={() => {
                  // Retomar nao pergunta nada: a sessao ja e deste dia e a
                  // pessoa so quer voltar de onde parou.
                  if (liveSession?.dayIndex === di) nav.push("treino-live", { dayIndex: di });
                  else { setDiaEscolhido(di); setIniciando(true); }
                }}
              >
                {liveSession?.dayIndex === di ? "▶ Retomar treino" : "▶ Iniciar treino"}
              </button>
            )}
          </div>
        )}

        <button onClick={duplicarEsteDia} className="tapable" style={{ width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#ffffff08", border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 12, fontWeight: 700, padding: "11px 0", cursor: "pointer" }}>
          <IconCopy size={15} /> Duplicar este dia
        </button>

        <div style={{ marginTop: 14 }}>
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
