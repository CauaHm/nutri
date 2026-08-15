"use client";
import { useState, useEffect } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { useBodyComp } from "@/lib/useBodyComp";
import { todayStr, getWeekStart } from "@/lib/dates";
import { MEDIDAS_LABEL } from "@/lib/defaults";
import {
  calcGorduraNavy, calcMassas, calcMacros, calcMetaAutomatica,
  gerarPlanoRefeicoes, NAF_OPTIONS, OBJETIVOS, DEFICIT_MIN_RECOMENDADO, DEFICIT_MAX_RECOMENDADO,
  snapshotsPorSemana, compararSemanas,
} from "@/lib/bodycomp";
import { IconChevronUp, IconChevronDown } from "@/components/icons";
import { CARD2, PINK, CYAN, GRN, AMB, RED, PURP, SUB, BORDER, TEXT, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import BodyCompChart from "@/components/BodyCompChart";

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const fmt = (v, casas = 1) => (v === null || v === undefined || Number.isNaN(v) ? "—" : v.toFixed(casas));

const CAMPOS_LABEL = { peso: "Peso", cintura: "Cintura", pescoco: "Pescoço", ...Object.fromEntries(MEDIDAS_LABEL.map((m) => [m.key, m.label])) };
const CAMPOS_UNIDADE = { peso: "kg" };

const NOVA_MED_VAZIA = { date: todayStr(), peso: "", cintura: "", pescoco: "", quadril: "", gorduraMedida: "", ombros: "", bunda: "", braco: "", coxa: "", panturrilha: "" };

export default function ComposicaoScreen({ data, nav, auth }) {
  const { user } = data;
  const bc = useBodyComp(user);
  const [novaMed, setNovaMed] = useState(NOVA_MED_VAZIA);
  const [editMetas, setEditMetas] = useState(false);
  const [metasTemp, setMetasTemp] = useState(null);
  const [objTemp, setObjTemp] = useState(null);
  const [objSaved, setObjSaved] = useState(false);

  useEffect(() => {
    if (bc.ready && !objTemp) {
      setObjTemp({ naf: bc.config.naf, objetivo: bc.config.objetivo, pesoMeta: bc.config.pesoMeta, prazoSemanas: bc.config.prazoSemanas, proteinaGkg: bc.config.proteinaGkg, gorduraGkg: bc.config.gorduraGkg });
    }
  }, [bc.ready, bc.config, objTemp]);

  if (!bc.ready || !objTemp) {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Composição Corporal" onBack={nav.pop} />
        <div style={{ color: SUB, fontSize: 12, textAlign: "center", padding: "30px 0" }}>Carregando...</div>
      </div>
    );
  }

  const perfil = bc.perfil;
  const sexo = perfil.sexo;
  const altura = num(perfil.altura);
  const idade = num(perfil.idade);
  const latest = bc.latest;

  const pctGorduraCalc = latest
    ? calcGorduraNavy({ sexo, altura, cintura: num(latest.cintura), pescoco: num(latest.pescoco), quadril: num(latest.quadril) })
    : null;
  const gorduraMedidaLatest = latest && latest.gorduraMedida !== "" && latest.gorduraMedida !== undefined && latest.gorduraMedida !== null
    ? num(latest.gorduraMedida) : null;
  const pctGordura = gorduraMedidaLatest !== null ? gorduraMedidaLatest : pctGorduraCalc;
  const peso = latest ? num(latest.peso) : null;

  const { massaGorda, massaMagra } = calcMassas(peso, pctGordura);

  const preview = peso ? calcMetaAutomatica({
    sexo, altura, idade, pesoAtual: peso,
    naf: objTemp.naf, objetivo: objTemp.objetivo, pesoMeta: objTemp.pesoMeta, prazoSemanas: objTemp.prazoSemanas,
    proteinaGkg: objTemp.proteinaGkg,
  }) : null;

  const macros = preview ? calcMacros(peso, preview.caloriasDiarias, num(objTemp.proteinaGkg), num(objTemp.gorduraGkg)) : null;
  const plano = macros ? gerarPlanoRefeicoes(preview.caloriasDiarias, macros.proteinaG) : [];
  const deficitForaFaixa = preview && objTemp.objetivo === "perder" && (preview.deficitPct < DEFICIT_MIN_RECOMENDADO || preview.deficitPct > DEFICIT_MAX_RECOMENDADO);

  const chartPontos = [...bc.historico]
    .sort((a, b) => a.id - b.id)
    .map((h) => {
      const g = h.gorduraMedida !== "" && h.gorduraMedida !== undefined && h.gorduraMedida !== null
        ? num(h.gorduraMedida)
        : calcGorduraNavy({ sexo, altura, cintura: num(h.cintura), pescoco: num(h.pescoco), quadril: num(h.quadril) });
      return { date: h.date, label: h.date.slice(0, 5), peso: num(h.peso), gordura: g };
    });

  const escolhaHoje = bc.planoLog[todayStr()] || {};

  const semanas = snapshotsPorSemana(bc.historico, getWeekStart);
  const metasComparacao = { ...bc.config.metasMedidas, peso: objTemp.objetivo !== "manter" ? num(objTemp.pesoMeta) : null };
  const comparacao = semanas.length >= 2 ? compararSemanas(semanas[0].entry, semanas[1].entry, metasComparacao) : null;

  const salvarMedicao = () => {
    if (!novaMed.peso) return;
    bc.addMedicao(novaMed);
    setNovaMed(NOVA_MED_VAZIA);
  };

  const salvarObjetivo = async () => {
    await bc.saveConfig({ ...bc.config, ...objTemp });
    if (preview) {
      await auth.updateProfile({ kcalMeta: preview.caloriasDiarias, waterMeta: preview.waterMeta, proteinaMeta: preview.proteinaMeta });
    }
    setObjSaved(true);
    setTimeout(() => setObjSaved(false), 1500);
  };

  return (
    <div style={{ minHeight: "100%", paddingBottom: 60 }}>
      <ScreenHeader title="Composição Corporal" accent="🧬" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <div style={{ background: `${PURP}12`, border: `1px solid ${PURP}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: "#c4b5fd", lineHeight: 1.6 }}>
          Uma medição por semana já é suficiente — cada nova entrada vira o "retrato" daquela semana pra comparação.
        </div>

        {/* Perfil (edita no Perfil, so mostra aqui) */}
        <button onClick={() => nav.goTo("perfil")} className="tapable" style={{ ...sCard, display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px 14px", marginBottom: 14, border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <div><div style={{ color: SUB, fontSize: 9.5 }}>SEXO</div><div style={{ fontWeight: 700, color: TEXT }}>{sexo === "F" ? "Feminino" : "Masculino"}</div></div>
            <div><div style={{ color: SUB, fontSize: 9.5 }}>ALTURA</div><div style={{ fontWeight: 700, color: TEXT }}>{perfil.altura || "—"} cm</div></div>
            <div><div style={{ color: SUB, fontSize: 9.5 }}>IDADE</div><div style={{ fontWeight: 700, color: TEXT }}>{perfil.idade || "—"}</div></div>
          </div>
          <span style={{ fontSize: 10.5, color: PURP, fontWeight: 700 }}>editar no Perfil</span>
        </button>

        {/* Nova medição unificada */}
        <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: TEXT }}>📐 Nova Pesagem / Medição</div>
          <div style={{ padding: "0 14px 14px" }}>
            <label style={sLbl}>Data</label>
            <input style={sInp} value={novaMed.date} onChange={(e) => setNovaMed((p) => ({ ...p, date: e.target.value }))} placeholder="DD/MM/AAAA" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={sLbl}>Peso (kg)</label><input style={sInp} type="number" step="0.1" value={novaMed.peso} onChange={(e) => setNovaMed((p) => ({ ...p, peso: e.target.value }))} /></div>
              <div><label style={sLbl}>Pescoço (cm)</label><input style={sInp} type="number" step="0.1" value={novaMed.pescoco} onChange={(e) => setNovaMed((p) => ({ ...p, pescoco: e.target.value }))} /></div>
            </div>

            <div style={{ fontSize: 10, color: SUB, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 12, marginBottom: 2, fontWeight: 700 }}>Medidas corporais (cm)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MEDIDAS_LABEL.filter((m) => m.key !== "panturrilha").map(({ key, label }) => (
                (key !== "quadril" || sexo === "F") ? (
                  <div key={key}><label style={sLbl}>{label}</label><input style={sInp} type="number" step="0.1" value={novaMed[key]} onChange={(e) => setNovaMed((p) => ({ ...p, [key]: e.target.value }))} /></div>
                ) : null
              ))}
              <div><label style={sLbl}>Panturrilha</label><input style={sInp} type="number" step="0.1" value={novaMed.panturrilha} onChange={(e) => setNovaMed((p) => ({ ...p, panturrilha: e.target.value }))} /></div>
            </div>

            <label style={sLbl}>% de gordura medido (bioimpedância) — opcional</label>
            <input style={sInp} type="number" step="0.1" value={novaMed.gorduraMedida} onChange={(e) => setNovaMed((p) => ({ ...p, gorduraMedida: e.target.value }))} placeholder="deixe em branco pra usar a fórmula" />
            <div style={{ fontSize: 10, color: SUB, marginTop: 4 }}>Se preenchido, substitui o cálculo pela fórmula da Marinha.</div>
            <button style={{ ...sBtn(user.cor, true), marginTop: 10 }} onClick={salvarMedicao}>Salvar medição</button>
          </div>
        </div>

        {/* Comparacao semanal */}
        {comparacao && comparacao.length > 0 && (
          <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ background: `${CYAN}15`, padding: "10px 14px", fontWeight: 700, color: TEXT }}>📊 Esta Semana vs Semana Passada</div>
            <div style={{ padding: "6px 14px 12px" }}>
              {comparacao.map(({ campo, anterior, atual, delta, boa }) => {
                const cor = boa === null ? SUB : boa ? GRN : RED;
                const Icon = delta === 0 ? null : delta > 0 ? IconChevronUp : IconChevronDown;
                return (
                  <div key={campo} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 12, color: SUB }}>{CAMPOS_LABEL[campo]}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 11, color: SUB }}>{anterior}{CAMPOS_UNIDADE[campo] || "cm"} → {atual}{CAMPOS_UNIDADE[campo] || "cm"}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 2, color: cor, fontWeight: 700, fontSize: 12 }}>
                        {Icon && <Icon size={12} />}{delta === 0 ? "=" : `${Math.abs(delta)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!latest ? (
          <div style={{ color: SUB, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Adicione uma medição acima pra ver os resultados calculados.</div>
        ) : (
          <>
            {/* Resultados */}
            <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ background: `${PINK}15`, padding: "10px 14px", fontWeight: 700, color: TEXT }}>📊 Composição Atual</div>
              <div style={{ padding: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: SUB }}>% Gordura {gorduraMedidaLatest !== null ? "(medido)" : "(fórmula)"}</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: PINK }}>{fmt(pctGordura)}%</div>
                  </div>
                  <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: SUB }}>Peso Atual</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: TEXT }}>{fmt(peso)} kg</div>
                  </div>
                  <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: SUB }}>Massa Gorda</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: RED }}>{fmt(massaGorda)} kg</div>
                  </div>
                  <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: SUB }}>Massa Magra</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: GRN }}>{fmt(massaMagra)} kg</div>
                  </div>
                </div>
                {pctGordura === null && <div style={{ fontSize: 11, color: AMB }}>⚠️ Preencha cintura + pescoço (e quadril, se feminino) na medição, ou informe % medido, pra calcular.</div>}
              </div>
            </div>

            {/* Medidas corporais atuais x meta */}
            <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: TEXT, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                📏 Medidas
                <button onClick={() => { setMetasTemp({ ...bc.config.metasMedidas }); setEditMetas((v) => !v); }} className="tapable" style={{ background: "none", border: "none", color: PURP, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{editMetas ? "fechar" : "editar metas"}</button>
              </div>
              <div style={{ padding: "0 14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 0", fontWeight: 700, fontSize: 9.5, color: SUB, textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>
                  <span>Região</span><span style={{ textAlign: "center" }}>Atual</span><span style={{ textAlign: "right" }}>Meta</span>
                </div>
                {MEDIDAS_LABEL.map(({ key, label }) => (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "7px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                    <span style={{ color: SUB }}>{label}</span>
                    <span style={{ textAlign: "center", fontWeight: 700, color: PINK }}>{latest[key] ? `${latest[key]} cm` : "—"}</span>
                    <span style={{ textAlign: "right", color: !bc.config.metasMedidas[key] ? SUB : GRN, fontSize: 11 }}>{bc.config.metasMedidas[key] ? `${bc.config.metasMedidas[key]} cm` : "—"}</span>
                  </div>
                ))}
              </div>
              {editMetas && (
                <div style={{ padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {MEDIDAS_LABEL.map(({ key, label }) => (
                      <div key={key}><label style={sLbl}>{label} (cm)</label><input style={sInp} type="number" value={metasTemp[key]} onChange={(e) => setMetasTemp((p) => ({ ...p, [key]: e.target.value }))} /></div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button style={{ ...sBtn(GRN), flex: 1 }} onClick={() => { bc.saveConfig({ ...bc.config, metasMedidas: metasTemp }); setEditMetas(false); }}>Salvar metas</button>
                    <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setEditMetas(false)}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Objetivo e metas diarias — isso preenche kcal/agua/proteina da conta */}
        <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ background: `${GRN}15`, padding: "10px 14px", fontWeight: 700, color: TEXT }}>🎯 Objetivo e Metas Diárias</div>
          <div style={{ padding: 14 }}>
            {!peso ? (
              <div style={{ fontSize: 11.5, color: AMB, lineHeight: 1.6 }}>⚠️ Registre seu peso na medição acima primeiro — as metas diárias são calculadas a partir dele.</div>
            ) : (
              <>
                <label style={sLbl}>Nível de atividade</label>
                <select style={sInp} value={objTemp.naf} onChange={(e) => setObjTemp((p) => ({ ...p, naf: e.target.value }))}>
                  {NAF_OPTIONS.map((n) => <option key={n.key} value={n.key}>{n.label} — {n.desc}</option>)}
                </select>

                <label style={sLbl}>Objetivo</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {OBJETIVOS.map((o) => (
                    <button key={o.key} onClick={() => setObjTemp((p) => ({ ...p, objetivo: o.key }))} style={{ flex: 1, padding: "8px 4px", background: objTemp.objetivo === o.key ? `${GRN}30` : "#ffffff08", border: `1px solid ${objTemp.objetivo === o.key ? GRN : BORDER}`, borderRadius: 8, color: objTemp.objetivo === o.key ? GRN : SUB, fontSize: 10.5, cursor: "pointer", fontWeight: objTemp.objetivo === o.key ? 700 : 400 }}>{o.label}</button>
                  ))}
                </div>

                {objTemp.objetivo !== "manter" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><label style={sLbl}>Peso meta (kg)</label><input style={sInp} type="number" step="0.5" value={objTemp.pesoMeta} onChange={(e) => setObjTemp((p) => ({ ...p, pesoMeta: e.target.value }))} /></div>
                    <div><label style={sLbl}>Prazo (semanas)</label><input style={sInp} type="number" value={objTemp.prazoSemanas} onChange={(e) => setObjTemp((p) => ({ ...p, prazoSemanas: e.target.value }))} /></div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><label style={sLbl}>Proteína (g/kg)</label><input style={sInp} type="number" step="0.1" value={objTemp.proteinaGkg} onChange={(e) => setObjTemp((p) => ({ ...p, proteinaGkg: e.target.value }))} /></div>
                  <div><label style={sLbl}>Gordura (g/kg)</label><input style={sInp} type="number" step="0.1" value={objTemp.gorduraGkg} onChange={(e) => setObjTemp((p) => ({ ...p, gorduraGkg: e.target.value }))} /></div>
                </div>

                {preview && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                      <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: SUB }}>TDEE</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{fmt(preview.tdee, 0)} kcal</div>
                      </div>
                      <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: SUB }}>Calorias/dia</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: PINK }}>{preview.caloriasDiarias}{preview.deficitPct !== 0 ? ` (${preview.deficitPct > 0 ? "-" : "+"}${Math.abs(preview.deficitPct)}%)` : ""}</div>
                      </div>
                      <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: SUB }}>Proteína/dia</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: PURP }}>{preview.proteinaMeta}g</div>
                      </div>
                      <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: SUB }}>Água/dia</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: CYAN }}>{preview.waterMeta}L</div>
                      </div>
                    </div>

                    {objTemp.objetivo !== "manter" && preview.diferencaKg !== null && (
                      <div style={{ marginTop: 10, padding: "8px 10px", background: `${AMB}12`, borderRadius: 8, fontSize: 11.5, color: AMB, textAlign: "center", lineHeight: 1.5 }}>
                        ⏱ Ritmo: <b>{fmt(Math.abs(preview.ritmoSemanal), 2)} kg/semana</b> · {fmt(preview.diferencaKg, 1)} kg no total em {objTemp.prazoSemanas || "—"} semanas
                      </div>
                    )}
                    {preview.ritmoAgressivo && (
                      <div style={{ marginTop: 8, fontSize: 11, color: RED }}>⚠️ Esse ritmo é mais agressivo que o recomendado (acima de 1% do peso corporal por semana) — considere um prazo mais longo.</div>
                    )}
                    {deficitForaFaixa && (
                      <div style={{ marginTop: 8, fontSize: 11, color: AMB }}>Déficit fora da faixa recomendada ({DEFICIT_MIN_RECOMENDADO}-{DEFICIT_MAX_RECOMENDADO}%).</div>
                    )}
                  </>
                )}

                <button style={{ ...sBtn(objSaved ? "#059669" : GRN, true), marginTop: 12 }} onClick={salvarObjetivo}>{objSaved ? "✓ Metas atualizadas!" : "Salvar objetivo"}</button>
              </>
            )}
          </div>
        </div>

        {/* Macros */}
        {macros && (
          <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ background: `${AMB}15`, padding: "10px 14px", fontWeight: 700, color: TEXT }}>🍗 Macronutrientes (com base no objetivo acima)</div>
            <div style={{ padding: 14 }}>
              {[
                ["Proteína", macros.proteinaG, macros.proteinaKcal, PINK],
                ["Gordura", macros.gorduraG, macros.gorduraKcal, AMB],
                ["Carboidrato", macros.carboG, macros.carboKcal, CYAN],
              ].map(([nome, g, kcal, cor]) => (
                <div key={nome} style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: SUB }}>{nome}</span>
                    <span style={{ fontWeight: 700, color: cor }}>{fmt(g, 0)}g · {fmt(kcal, 0)} kcal</span>
                  </div>
                  <div style={{ background: "#ffffff10", borderRadius: 6, height: 6, marginTop: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (kcal / preview.caloriasDiarias) * 100)}%`, height: "100%", background: cor, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plano de refeicoes */}
        {plano.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: PURP, marginBottom: 10 }}>🍴 Plano de Refeições — Hoje</div>
            {plano.map((slot) => (
              <div key={slot.key} style={{ ...sCard, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{slot.emoji} {slot.nome}</div>
                  <div style={{ fontSize: 10, color: SUB }}>~{slot.kcalAlvo} kcal · {slot.protAlvo}g prot</div>
                </div>
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {slot.opcoes.map((op, oi) => {
                    const marcado = escolhaHoje[slot.key] === oi;
                    return (
                      <div
                        key={oi}
                        onClick={() => bc.marcarOpcao(todayStr(), slot.key, oi)}
                        style={{ padding: "8px 10px", borderRadius: 8, background: marcado ? `${user.cor}20` : "#ffffff08", border: `1px solid ${marcado ? user.cor : BORDER}`, cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: marcado ? user.cor : TEXT, fontWeight: marcado ? 700 : 400 }}>{marcado ? "✅ " : ""}{op.itens.map((it) => `${it.alimento} (${it.gramas}g)`).join(" + ")}</span>
                        </div>
                        <div style={{ fontSize: 9, color: SUB, marginTop: 2 }}>~{op.kcal} kcal · {op.proteina}g proteína</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Historico */}
        <div style={{ fontWeight: 700, fontSize: 14, color: PINK, marginBottom: 10 }}>📈 Histórico</div>
        {bc.historico.length === 0 ? (
          <div style={{ color: SUB, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Nenhuma medição registrada ainda.</div>
        ) : (
          <>
            <div style={{ ...sCard, padding: 14, marginBottom: 10 }}>
              <BodyCompChart title="Peso" color={CYAN} unit="kg" points={chartPontos.filter((p) => p.peso !== null).map((p) => ({ x: p.date, y: p.peso, label: p.label }))} />
            </div>
            <div style={{ ...sCard, padding: 14, marginBottom: 10 }}>
              <BodyCompChart title="% de Gordura" color={PINK} unit="%" points={chartPontos.filter((p) => p.gordura !== null).map((p) => ({ x: p.date, y: Math.round(p.gordura * 10) / 10, label: p.label }))} />
            </div>
            <div style={{ ...sCard, overflow: "hidden" }}>
              {bc.historico.map((h) => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderTop: `1px solid ${BORDER}` }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{h.peso}kg</span>
                    <span style={{ color: SUB, fontSize: 11, marginLeft: 8 }}>{h.date}</span>
                  </div>
                  <button style={{ background: "none", border: "none", color: SUB, cursor: "pointer" }} onClick={() => bc.delMedicao(h.id)}>🗑</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
