import { useEffect, useState } from "react";
import { todayStr, weekdayPT, getWeekStart } from "@/lib/dates";
import {
  IconMenu, IconBell, IconChevronRight, IconDroplet, IconFlame, IconDumbbell,
  IconStar, IconTrophy, IconSend, IconPlus, IconMinus, IconCheck, IconZap, IconEdit,
} from "@/components/icons";
import { CARD2, PINK, CYAN, GRN, AMB, RED, PURP, SUB, BORDER, TEXT, sCard, sBtn, sInp } from "@/lib/theme";
import RingProgress from "@/components/RingProgress";
import GoalBar from "@/components/GoalBar";
import StatusWindow from "@/components/StatusWindow";
import { useBodyComp } from "@/lib/useBodyComp";
import { calcTMB } from "@/lib/bodycomp";
import { gastoExtraDoDia, minutosExtraDoDia, calcSugestaoReposicao, MINUTOS_ATIVOS_META_PADRAO } from "@/lib/atividades";
import type { ScreenProps } from "@/lib/screenProps";

const num = (v: any): number | null => (v === "" || v === null || v === undefined ? null : Number(v));

export default function HomeScreen({ data, nav }: ScreenProps) {
  const {
    userId, user, outroUser, waters, saveWater, addWaterQuick, checks, saveCheck,
    treino, refeicoesCfg, mealLog, myStats, outroStats, config, recados, sendRecado, todayTotais,
    temParceiro, invitesRecebidos, atividades,
  } = data;
  const [msg, setMsg] = useState("");
  const [metaAplicadaHoje, setMetaAplicadaHoje] = useState(false);
  const bc = useBodyComp(user);

  // Quantidade de agua "lembrada" pro botao de um toque — mesma convencao de
  // storage de rm_last_uid (apiCacheGuard.ts) e rm_resttimer_${userId}
  // (useRestTimer.ts): chave por usuario, leitura/escrita sempre
  // try/catch-guardada (localStorage pode nao existir/estar bloqueado).
  const [waterMl, setWaterMl] = useState(250);
  const [editingWaterMl, setEditingWaterMl] = useState(false);
  const [waterMlInput, setWaterMlInput] = useState("");

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`rm_water_ml_${userId}`);
      const n = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(n) && n > 0) setWaterMl(n);
    } catch {
      // sem localStorage: fica no padrao 250ml so pra essa sessao
    }
  }, [userId]);

  const persistWaterMl = (ml: number) => {
    setWaterMl(ml);
    if (!userId) return;
    try {
      localStorage.setItem(`rm_water_ml_${userId}`, String(ml));
    } catch {
      // sem localStorage: quantidade lembrada nao sobrevive a um reload
    }
  };

  const confirmWaterMlEdit = () => {
    const n = parseInt(waterMlInput, 10);
    if (Number.isFinite(n) && n > 0) {
      persistWaterMl(n);
      addWaterQuick(n / 1000);
    }
    setEditingWaterMl(false);
  };

  const today = todayStr();
  const kcalTotal = Math.round(todayTotais.kcal);
  const proteinaTotal = Math.round(todayTotais.proteina);

  const tmb = bc.ready ? calcTMB({ sexo: user.sexo, peso: num(bc.historico[0]?.peso), altura: num(user.altura), idade: num(user.idade) }) : null;
  const gastoExtraHoje = gastoExtraDoDia(atividades, today);
  const minutosExtraHoje = minutosExtraDoDia(atividades, today);
  const minutosMeta = user.minutosAtivosMeta || MINUTOS_ATIVOS_META_PADRAO;
  const sugestaoReposicao = calcSugestaoReposicao(user.kcalMeta, gastoExtraHoje, tmb);
  const kcalMetaEfetiva = metaAplicadaHoje && sugestaoReposicao ? sugestaoReposicao.metaAjustada : user.kcalMeta;

  const kcalRestante = Math.max(0, kcalMetaEfetiva - kcalTotal);
  const proteinaRestante = Math.max(0, user.proteinaMeta - proteinaTotal);
  const waterEntry = waters.find((l) => l.date === today);
  const waterHoje = waterEntry?.liters || 0;
  const checkEntry = checks.find((l) => l.date === today);

  const diaSemana = weekdayPT(new Date());
  const treinoHoje = (treino || []).find((d) => d.dia === diaSemana);
  const treinoHojeIdx = (treino || []).findIndex((d) => d.dia === diaSemana);
  const ultimoRecado = temParceiro ? recados.find((r) => r.to === userId) : null;

  const weekStart = getWeekStart(today);
  const weeklyTarget = (treino || []).length || 1;
  const weeklyDone = checks.filter((c) => c.status === "completo" && getWeekStart(c.date) === weekStart).length;

  const bateuProteinaHoje = user.proteinaMeta > 0 ? proteinaTotal >= user.proteinaMeta : true;
  const todayPts =
    (kcalTotal > 0 && kcalTotal <= user.kcalMeta && bateuProteinaHoje ? 1 : 0) +
    (waterHoje >= user.waterMeta ? 1 : 0) +
    (checkEntry?.status === "completo" ? 3 : checkEntry?.status === "parcial" ? 1 : 0);

  const diaLog = mealLog[today] || {};

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding: "calc(env(safe-area-inset-top,0px) + 16px) 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => nav.goTab("perfil")} className="tapable" style={{ width: 38, height: 38, borderRadius: 12, background: `${PURP}20`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: PURP, cursor: "pointer" }}>
          <IconMenu size={18} />
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: -0.2 }}>Olá, {user.nome.split(" ")[0]}! 👋</div>
          <div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>Foco hoje, resultado amanhã.</div>
        </div>
        <button onClick={() => nav.push("ranking")} className="tapable" style={{ position: "relative", width: 38, height: 38, borderRadius: 12, background: `${PURP}20`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: PURP, cursor: "pointer" }}>
          <IconBell size={17} />
          {invitesRecebidos.length > 0 && (
            <span style={{ position: "absolute", top: 4, right: 5, width: 8, height: 8, borderRadius: "50%", background: RED, border: "1.5px solid #0d0118" }} />
          )}
        </button>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {/* Anel de resumo do dia */}
        <div className="fade-in-up" style={{ ...sCard, padding: "18px 8px", marginBottom: 12, display: "flex", justifyContent: "space-around" }}>
          <RingProgress pct={Math.min(100, (kcalTotal / kcalMetaEfetiva) * 100)} size={64} stroke={6} color={PINK} Icon={IconFlame} value={`${kcalTotal}`} label="kcal" onClick={() => nav.goTo("nutricao", "refeicoes-hoje")} />
          <RingProgress pct={Math.min(100, (waterHoje / user.waterMeta) * 100)} size={64} stroke={6} color={CYAN} Icon={IconDroplet} value={`${waterHoje}L`} label="água" />
          <RingProgress pct={Math.min(100, (weeklyDone / weeklyTarget) * 100)} size={64} stroke={6} color={GRN} Icon={IconDumbbell} value={`${weeklyDone}/${weeklyTarget}`} label="treinos" />
          <RingProgress pct={(todayPts / 5) * 100} size={64} stroke={6} color={PURP} Icon={IconStar} value={`${todayPts}/5`} label="hoje" onClick={() => nav.push("ranking")} />
        </div>

        {/* Medidores de alimentacao — quanto ja comeu e quanto ainda pode comer hoje */}
        <div className="fade-in-up" style={{ ...sCard, padding: 16, marginBottom: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <GoalBar label="Calorias" value={kcalTotal} meta={kcalMetaEfetiva} unit=" kcal" color={PINK} direction="ceiling" Icon={IconFlame} />
          <GoalBar label="Proteína" value={proteinaTotal} meta={user.proteinaMeta} unit="g" color={AMB} direction="floor" Icon={IconZap} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>ainda pode comer</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: kcalRestante > 0 ? TEXT : GRN }}>{kcalRestante > 0 ? `${kcalRestante} kcal` : "meta batida"}</div>
            </div>
            <div style={{ width: 1, background: BORDER }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>proteína faltando</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: proteinaRestante > 0 ? TEXT : GRN }}>{proteinaRestante > 0 ? `${proteinaRestante}g` : "meta batida"}</div>
            </div>
          </div>
        </div>

        {/* Atividade extra — minutos hoje + gasto extra + status do treino programado */}
        <div className="fade-in-up" style={{ ...sCard, padding: 16, marginBottom: 12 }}>
          <button onClick={() => nav.push("atividade")} className="tapable" style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
            {minutosMeta > 0 && (
              <RingProgress pct={Math.min(100, (minutosExtraHoje / minutosMeta) * 100)} size={56} stroke={5} color={GRN} Icon={IconDumbbell} value={`${minutosExtraHoje}`} label="min" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 15 }}>🏃</span> Atividade Extra
              </div>
              <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>
                {gastoExtraHoje > 0 ? `🔥 gasto extra: ${gastoExtraHoje} kcal` : "Nenhuma atividade extra registrada hoje ainda."}
              </div>
              {treinoHoje && (
                <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 20, fontSize: 9.5, fontWeight: 700, background: checkEntry?.status === "completo" ? `${GRN}20` : checkEntry?.status === "parcial" ? `${AMB}20` : "#ffffff10", color: checkEntry?.status === "completo" ? GRN : checkEntry?.status === "parcial" ? AMB : SUB }}>
                  treino de hoje: {checkEntry?.status === "completo" ? "completo" : checkEntry?.status === "parcial" ? "parcial" : "pendente"}
                </div>
              )}
            </div>
            <IconChevronRight size={16} style={{ color: SUB, flexShrink: 0 }} />
          </button>

          {sugestaoReposicao && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11.5, color: TEXT, lineHeight: 1.6 }}>
                Gasto extra hoje: <b style={{ color: PINK }}>{sugestaoReposicao.gastoExtra} kcal</b><br />
                Sugerido comer: <b style={{ color: AMB }}>+{sugestaoReposicao.reposicao} kcal</b> <span style={{ color: SUB }}>(meta ajustada: {sugestaoReposicao.metaAjustada} kcal)</span>
              </div>
              {sugestaoReposicao.pisoAtingido && (
                <div style={{ marginTop: 6, fontSize: 10.5, color: AMB }}>⚠️ Seu gasto hoje foi alto — comer abaixo disso compromete recuperação e massa magra.</div>
              )}
              {!metaAplicadaHoje ? (
                <button onClick={() => setMetaAplicadaHoje(true)} className="tapable" style={{ ...sBtn(AMB, true), marginTop: 8 }}>Aplicar hoje</button>
              ) : (
                <div style={{ marginTop: 8, fontSize: 10.5, color: GRN, textAlign: "center" }}>✓ Aplicado só pra hoje — sua meta base não muda.</div>
              )}
            </div>
          )}

          <button onClick={() => nav.push("balanco")} className="tapable" style={{ marginTop: 10, width: "100%", background: "none", border: "none", color: PURP, fontSize: 10.5, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
            Ver balanço energético completo →
          </button>
        </div>

        {/* O Sistema — camada de progressao RPG (aditiva, ve os mesmos dados) */}
        {data.rpg.ready && (
          <button
            onClick={() => nav.push("sistema")}
            className="tapable fade-in-up"
            style={{ display: "block", width: "100%", border: "none", background: "none", padding: 0, marginBottom: 10, cursor: "pointer", textAlign: "left" }}
          >
            <StatusWindow rpg={data.rpg} compact />
          </button>
        )}

        {/* Refeicoes de hoje */}
        <div className="fade-in-up" style={{ ...sCard, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconFlame size={16} style={{ color: PINK }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>Refeições de Hoje</span>
            </div>
            <button onClick={() => nav.goTo("nutricao", "refeicoes-hoje")} style={{ background: "none", border: "none", color: PURP, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Ver todas</button>
          </div>
          {(!refeicoesCfg || refeicoesCfg.length === 0) ? (
            <div style={{ fontSize: 11, color: SUB, textAlign: "center", padding: "6px 0" }}>Nenhuma refeição configurada ainda.</div>
          ) : (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginBottom: 12 }}>
              {refeicoesCfg.map((ref) => {
                const itens = diaLog[ref.id] || [];
                const kcalRef = Array.isArray(itens) ? itens.reduce((s, it) => s + (Number(it.kcal) || 0), 0) : 0;
                const feito = kcalRef > 0;
                return (
                  <button key={ref.id} onClick={() => nav.goTo("nutricao", "refeicoes-hoje")} className="tapable" style={{ flexShrink: 0, width: 92, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 8px", textAlign: "left", cursor: "pointer" }}>
                    <div style={{ fontSize: 18 }}>{ref.emoji}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: TEXT, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ref.nome}</div>
                    <div style={{ fontSize: 9.5, color: SUB, marginTop: 1 }}>{feito ? `${Math.round(kcalRef)} kcal` : ref.horario}</div>
                    <div style={{ marginTop: 5 }}>
                      {feito ? <IconCheck size={13} style={{ color: GRN }} /> : <div style={{ width: 13, height: 13, borderRadius: "50%", border: `1.5px solid ${BORDER}` }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <button onClick={() => nav.push("refeicoes-config")} className="tapable" style={{ width: "100%", background: `linear-gradient(90deg,${CYAN},${PURP})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, padding: "10px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <IconPlus size={13} /> Adicionar refeição
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          {/* Agua */}
          <div className="fade-in-up" style={{ ...sCard, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <IconDroplet size={14} style={{ color: CYAN }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>Água</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{waterHoje}<span style={{ fontSize: 11, color: SUB, fontWeight: 400 }}> / {user.waterMeta}L</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
              <button onClick={() => saveWater(today, Math.max(0, Math.round((waterHoje - 0.1) * 10) / 10))} className="tapable" style={{ width: 26, height: 26, borderRadius: "50%", background: "#ffffff10", border: "none", color: TEXT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconMinus size={12} /></button>
              {editingWaterMl ? (
                <input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  value={waterMlInput}
                  onChange={(e) => setWaterMlInput(e.target.value)}
                  onBlur={confirmWaterMlEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  style={{ ...sInp, flex: 1, minHeight: 28, padding: "6px 8px", textAlign: "center", fontSize: 11 }}
                />
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "stretch", background: `${CYAN}18`, border: `1px solid ${CYAN}40`, borderRadius: 8, overflow: "hidden" }}>
                  <button onClick={() => addWaterQuick(waterMl / 1000)} className="tapable" style={{ flex: 1, background: "none", border: "none", color: CYAN, fontSize: 10.5, fontWeight: 700, padding: "6px 0", cursor: "pointer" }}>+{waterMl}ml</button>
                  <button onClick={() => { setWaterMlInput(String(waterMl)); setEditingWaterMl(true); }} className="tapable" aria-label="Editar quantidade de água" style={{ background: "none", border: "none", borderLeft: `1px solid ${CYAN}40`, color: CYAN, cursor: "pointer", padding: "0 6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconEdit size={11} />
                  </button>
                </div>
              )}
              <button onClick={() => saveWater(today, Math.round((waterHoje + 0.1) * 10) / 10)} className="tapable" style={{ width: 26, height: 26, borderRadius: "50%", background: "#ffffff10", border: "none", color: TEXT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconPlus size={12} /></button>
            </div>
          </div>

          {/* Treino de hoje */}
          <div className="fade-in-up" style={{ ...sCard, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <IconDumbbell size={14} style={{ color: GRN }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>Treino de Hoje</span>
            </div>
            {treinoHoje ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{treinoHoje.emoji} {treinoHoje.tag}</div>
                <div style={{ fontSize: 10, color: SUB, marginTop: 1 }}>{treinoHoje.isCardio ? treinoHoje.cardio : `${treinoHoje.exercicios.length} exercícios`}</div>
                <button onClick={() => nav.goTo("treino", "treino-dia", { dayIndex: treinoHojeIdx })} className="tapable" style={{ width: "100%", marginTop: 10, background: `linear-gradient(90deg,${GRN},${CYAN})`, border: "none", borderRadius: 8, color: "#04160c", fontWeight: 800, fontSize: 11, padding: "8px 0", cursor: "pointer" }}>Iniciar treino</button>
              </>
            ) : (
              <div style={{ fontSize: 11, color: SUB, marginTop: 4 }}>Nada pra {diaSemana} ainda.</div>
            )}
          </div>
        </div>

        {treinoHoje && (
          <div className="fade-in-up" style={{ ...sCard, padding: 14, marginBottom: 10, display: "flex", gap: 7 }}>
            {[["completo", "Completo", GRN], ["parcial", "Parcial", AMB], ["none", "Não fiz", RED]].map(([k, l, c]) => (
              <button
                key={k} onClick={() => { saveCheck(today, k); if (k !== "none") data.rpg.registrarTreinoConcluido(k); }} className="tapable"
                style={{ flex: 1, padding: "8px 2px", background: checkEntry?.status === k ? `${c}25` : "#ffffff08", border: `1px solid ${checkEntry?.status === k ? c : BORDER}`, borderRadius: 9, color: checkEntry?.status === k ? c : SUB, fontSize: 10.5, cursor: "pointer", fontWeight: checkEntry?.status === k ? 700 : 500 }}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Banner motivacional / competicao */}
        {temParceiro && outroUser && myStats && outroStats ? (
          <button onClick={() => nav.push("ranking")} className="tapable fade-in-up" style={{ ...sCard, display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, marginBottom: 10, border: "none", cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${AMB}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconTrophy size={18} style={{ color: AMB }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: TEXT }}>{myStats.pts > outroStats.pts ? "Você está na frente!" : myStats.pts < outroStats.pts ? `${outroUser.nome.split(" ")[0]} está na frente` : "Empatados por enquanto"}</div>
              <div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>{myStats.pts} x {outroStats.pts} pontos · meta {config.metaPontos}</div>
            </div>
            <IconChevronRight size={16} style={{ color: SUB, flexShrink: 0 }} />
          </button>
        ) : (
          <button onClick={() => nav.push("ranking")} className="tapable fade-in-up" style={{ ...sCard, display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, marginBottom: 10, border: "none", cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${PURP}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconTrophy size={18} style={{ color: PURP }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: TEXT }}>Convide alguém pra competir</div>
              <div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>Acompanhem o progresso um do outro</div>
            </div>
            <IconChevronRight size={16} style={{ color: SUB, flexShrink: 0 }} />
          </button>
        )}

        {temParceiro && outroUser && (
          <div className="fade-in-up" style={{ ...sCard, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: outroUser.cor, marginBottom: ultimoRecado ? 8 : 10 }}>💌 Recado pra {outroUser.nome.split(" ")[0]}</div>
            {ultimoRecado && (
              <div style={{ marginBottom: 10, padding: "8px 10px", background: `${user.cor}12`, borderLeft: `2px solid ${user.cor}`, borderRadius: "0 8px 8px 0", fontSize: 12 }}>
                <div style={{ color: SUB, fontSize: 9.5, marginBottom: 2 }}>{outroUser.nome.split(" ")[0]} disse ({ultimoRecado.date}):</div>
                "{ultimoRecado.text}"
              </div>
            )}
            <div style={{ display: "flex", gap: 7 }}>
              <input style={sInp} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Manda um incentivo..." onKeyDown={(e) => { if (e.key === "Enter" && msg.trim()) { sendRecado(msg.trim()); setMsg(""); } }} />
              <button onClick={() => { if (msg.trim()) { sendRecado(msg.trim()); setMsg(""); } }} className="tapable" style={{ ...sBtn(user.cor), display: "flex", alignItems: "center", justifyContent: "center", width: 44, padding: 0, flexShrink: 0 }}>
                <IconSend size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
