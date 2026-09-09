import { useEffect, useRef, useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { IconCheck, IconChevronLeft, IconChevronRight } from "@/components/icons";
import { PINK, PURP, GRN, AMB, RED, SUB, BORDER, TEXT, CARD, CARD2, SHADOW_POP, sCard, sInp, sBtn } from "@/lib/theme";
import { todayStr } from "@/lib/dates";
import { getRestSeconds } from "@/lib/restTimer";
import { buildInitialSession, computeSummary, workingSets, historicoDoExercicio, recordeDoExercicio, repsParaLog, type LiveWorkoutSession, type SessionSummary } from "@/lib/liveWorkout";
import type { ScreenProps } from "@/lib/screenProps";
import type { WeightLog } from "@/lib/useAppData";

export default function LiveWorkoutScreen({ data, nav, rest, params }: ScreenProps) {
  const { user, treino, liveSession, saveLiveSession, saveCheck, saveWeightLog, weightLogs } = data;
  const dayIndex: number | undefined = params?.dayIndex;
  const dia = typeof dayIndex === "number" ? treino?.[dayIndex] : undefined;

  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [notaAberta, setNotaAberta] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const preSessionWeightLogs = useRef<WeightLog[]>(weightLogs);

  // Preencher o peso ja e o sinal de que a serie foi feita — antes so o
  // circulo marcava, e dava pra treinar inteiro sem perceber que nada tinha
  // sido registrado. Agora digitar (ou usar o -/+) propoe concluir a serie,
  // depois de uma pausa pra nao perguntar no meio da digitacao.
  const [proposta, setProposta] = useState<{ setIndex: number; peso: string } | null>(null);
  const [confirmarMarcarTudo, setConfirmarMarcarTudo] = useState(false);
  // Combinacao exercicio+serie+peso que a pessoa ja recusou: nao pergunta de
  // novo pelo mesmo valor (mas volta a perguntar se ela mudar o peso).
  const recusadasRef = useRef<Set<string>>(new Set());
  const propostaTimerRef = useRef<number | null>(null);
  const cancelarProposta = () => {
    if (propostaTimerRef.current) window.clearTimeout(propostaTimerRef.current);
    propostaTimerRef.current = null;
  };

  useEffect(() => cancelarProposta, []);

  // Trocou de exercicio: a pergunta pendente era sobre o anterior.
  useEffect(() => {
    cancelarProposta();
    setProposta(null);
  }, [liveSession?.currentExerciseIndex]);

  const matchesThisDay = liveSession && liveSession.dayIndex === dayIndex;
  const hasOtherSession = liveSession && !matchesThisDay;

  useEffect(() => {
    if (!dia || typeof dayIndex !== "number") return;
    if (matchesThisDay) return;
    if (hasOtherSession && !confirmSwitch) return;
    // ou nao existe sessao nenhuma, ou o usuario confirmou descartar a de outro dia
    saveLiveSession(buildInitialSession(dia, dayIndex, weightLogs));
    if (confirmSwitch) setConfirmSwitch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia, dayIndex, matchesThisDay, hasOtherSession, confirmSwitch]);

  useEffect(() => {
    let sentinel: { release?: () => Promise<void> } | null = null;
    const requestLock = async () => {
      try {
        const nav2 = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
        if (nav2.wakeLock) sentinel = await nav2.wakeLock.request("screen");
      } catch {
        // sem suporte a Wake Lock (ou bateria fraca etc.) — segue sem travar a tela
      }
    };
    requestLock();
    const onVisible = () => { if (document.visibilityState === "visible" && !sentinel) requestLock(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release?.().catch(() => {});
    };
  }, []);

  if (!dia || typeof dayIndex !== "number") {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Treino" onBack={nav.pop} />
        <div style={{ padding: 24, color: SUB, textAlign: "center", fontSize: 12 }}>Esse dia não existe mais.</div>
      </div>
    );
  }

  if (hasOtherSession && !confirmSwitch) {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Treino ao vivo" onBack={nav.pop} />
        <div style={{ padding: 14 }}>
          <div style={{ ...sCard, padding: 16 }}>
            <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.6, marginBottom: 12 }}>
              Você tem um treino em andamento em outro dia ({liveSession?.dayTag}). Iniciar este vai descartar o progresso anterior.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...sBtn(PINK), flex: 1 }} onClick={() => setConfirmSwitch(true)}>Começar mesmo assim</button>
              <button style={{ ...sBtn("#444"), flex: 1 }} onClick={nav.pop}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (summary) {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Resumo do treino" onBack={nav.pop} />
        <div style={{ padding: 14 }}>
          <div style={{ ...sCard, padding: 20, textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 40 }}>{summary.status === "completo" ? "💪" : summary.status === "parcial" ? "👍" : "🙂"}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: TEXT, marginTop: 8 }}>{dia.dia} — {dia.tag}</div>
            <span style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: summary.status === "completo" ? `${GRN}22` : `${AMB}22`, color: summary.status === "completo" ? GRN : AMB }}>
              {summary.status === "completo" ? "Treino completo" : summary.status === "parcial" ? "Treino parcial" : "Sem séries marcadas"}
            </span>
          </div>
          <div style={{ ...sCard, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: BORDER }}>
              <div style={{ background: CARD2, padding: 14, textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: TEXT }}>{Math.max(1, Math.round(summary.durationMs / 60000))} min</div>
                <div style={{ fontSize: 10, color: SUB, marginTop: 2 }}>duração</div>
              </div>
              <div style={{ background: CARD2, padding: 14, textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: TEXT }}>{summary.exercisesCompleted}/{summary.totalExercises}</div>
                <div style={{ fontSize: 10, color: SUB, marginTop: 2 }}>exercícios completos</div>
              </div>
            </div>
          </div>
          {summary.prs.length > 0 && (
            <div style={{ ...sCard, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, marginBottom: 8 }}>🏆 Recordes pessoais</div>
              {summary.prs.map((nome) => (
                <div key={nome} style={{ fontSize: 12.5, color: GRN, padding: "4px 0" }}>🏆 {nome}</div>
              ))}
            </div>
          )}
          <button style={{ ...sBtn(user.cor, true) }} onClick={nav.pop}>Fechar</button>
        </div>
      </div>
    );
  }

  if (!liveSession || liveSession.dayIndex !== dayIndex) return null;

  const session = liveSession;
  const exIndex = session.currentExerciseIndex;
  const exProgress = session.exercises[exIndex];
  const exOriginal = dia.exercicios[exIndex];
  if (!exProgress || !exOriginal) return null;
  const proximoNome = dia.exercicios[exIndex + 1]?.nome;

  const updateSession = (next: LiveWorkoutSession) => saveLiveSession(next);

  const toggleSet = (setIndex: number) => {
    const nextExercises = session.exercises.map((e, i) =>
      i === exIndex ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, done: !s.done } : s)) } : e
    );
    const willBeDone = !exProgress.sets[setIndex].done;
    cancelarProposta();
    setProposta(null);
    updateSession({ ...session, exercises: nextExercises });
    if (willBeDone) {
      rest.start(getRestSeconds(exOriginal, dia), exOriginal.nome, { exId: exOriginal.id, dayIndex });
    }
  };

  // 1,2s depois da ultima mexida no peso — tempo suficiente pra digitar "42,5"
  // inteiro ou dar varios toques no +, sem a pergunta pulando no meio.
  const PAUSA_PROPOSTA_MS = 1200;

  const setWeight = (setIndex: number, weight: string) => {
    const nextExercises = session.exercises.map((e, i) =>
      i === exIndex ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, weight } : s)) } : e
    );
    updateSession({ ...session, exercises: nextExercises });

    cancelarProposta();
    if (!weight.trim() || exProgress.sets[setIndex].done) return;
    const chave = `${exIndex}:${setIndex}:${weight}`;
    if (recusadasRef.current.has(chave)) return;
    propostaTimerRef.current = window.setTimeout(() => setProposta({ setIndex, peso: weight }), PAUSA_PROPOSTA_MS);
  };

  // Passo de 2,5kg nos botoes -/+ : digitar numero em teclado de celular no
  // meio da serie e o pior momento possivel, e 2,5kg e o menor par de anilhas
  // da maioria das academias. Aceita virgula (pt-BR) e nunca desce de zero.
  const ajustarPeso = (setIndex: number, delta: number) => {
    const atual = parseFloat((exProgress.sets[setIndex].weight || "0").replace(",", ".")) || 0;
    const proximo = Math.max(0, Math.round((atual + delta) * 2) / 2);
    setWeight(setIndex, proximo ? String(proximo) : "");
  };

  // Pra quem treinou sem o celular na mao e so quer registrar depois. Nao
  // dispara descanso (nao faria sentido em massa) nem mexe nos pesos: o que
  // estiver preenchido — planejado ou ultima carga — e o que vai pro log.
  const marcarTudo = () => {
    cancelarProposta();
    setProposta(null);
    setConfirmarMarcarTudo(false);
    updateSession({
      ...session,
      exercises: session.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: true })) })),
    });
  };

  const totalSeries = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const seriesPendentes = session.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);

  const goTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(session.exercises.length - 1, nextIndex));
    updateSession({ ...session, currentExerciseIndex: clamped });
  };

  const finalizar = async () => {
    const resumo = computeSummary(session, preSessionWeightLogs.current);
    await saveCheck(todayStr(), resumo.status);
    if (resumo.status !== "none") data.rpg.registrarTreinoConcluido(resumo.status);
    for (const ex of session.exercises) {
      const workingOnly = workingSets(ex.sets);
      const doneWeights = workingOnly.filter((s) => s.done && s.weight).map((s) => parseFloat(s.weight!) || 0);
      if (!doneWeights.length) continue;
      const concluidas = workingOnly.filter((s) => s.done);
      const original = dia.exercicios.find((o) => (o.id !== undefined && o.id === ex.exId) || o.nome === ex.nome);
      await saveWeightLog({ ex: ex.nome, data: todayStr(), kg: String(Math.max(...doneWeights)), sets: String(concluidas.length), reps: repsParaLog(concluidas, original?.proto || "") });
    }
    await saveLiveSession(null);
    setSummary(resumo);
  };

  return (
    <div style={{ minHeight: "100%", paddingBottom: 90 }}>
      <ScreenHeader title={exOriginal.nome} subtitle={`${dia.dia} · ${exIndex + 1}/${session.exercises.length}`} onBack={nav.pop} />

      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {exOriginal.foco && <span style={{ fontSize: 10.5, color: PINK, background: `${PINK}18`, padding: "3px 9px", borderRadius: 20 }}>{exOriginal.foco}</span>}
          <span style={{ fontSize: 10.5, color: PURP, background: `${PURP}18`, padding: "3px 9px", borderRadius: 20 }}>{exOriginal.proto}</span>
          <button
            onClick={() => rest.start(getRestSeconds(exOriginal, dia), exOriginal.nome, { exId: exOriginal.id, dayIndex })}
            className="tapable"
            style={{ marginLeft: "auto", background: `${user.cor}20`, border: "none", borderRadius: 20, color: user.cor, fontSize: 10.5, fontWeight: 700, padding: "5px 11px", cursor: "pointer" }}
          >
            ▶ Descanso
          </button>
        </div>

        {exOriginal.nota && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setNotaAberta((v) => !v)} style={{ background: "none", border: "none", color: SUB, fontSize: 11.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              {notaAberta ? "Ocultar notas" : "Ver notas do exercício"}
            </button>
            {notaAberta && (
              <div style={{ marginTop: 6, fontSize: 11.5, color: SUB, lineHeight: 1.5, padding: "8px 10px", background: "#ffffff08", borderRadius: 9, borderLeft: `2px solid ${PURP}` }}>{exOriginal.nota}</div>
            )}
          </div>
        )}

        {(() => {
          // Cargas anteriores deste exercicio, pra decidir a de hoje sem sair
          // da tela. Usa preSessionWeightLogs (o historico como estava quando
          // a sessao comecou) pra que o log gravado ao finalizar o treino nao
          // apareca aqui como se fosse "anterior".
          const anteriores = historicoDoExercicio(preSessionWeightLogs.current, exOriginal.nome);
          const pr = recordeDoExercicio(preSessionWeightLogs.current, exOriginal.nome);
          if (anteriores.length === 0) {
            return (
              <div style={{ ...sCard, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: SUB }}>
                Primeira vez registrando <strong style={{ color: TEXT }}>{exOriginal.nome}</strong> — o peso de hoje vira a referência das próximas.
              </div>
            );
          }
          return (
            <div style={{ ...sCard, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 9.5, color: SUB, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Últimas cargas</span>
                {pr > 0 && <span style={{ fontSize: 9.5, color: GRN, background: `${GRN}18`, padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>🏆 PR {pr}kg</span>}
              </div>
              <div style={{ display: "flex", gap: 7, overflowX: "auto" }}>
                {anteriores.map((l) => (
                  <div key={l.id} style={{ flexShrink: 0, background: CARD2, borderRadius: 9, padding: "7px 11px", border: `1px solid ${parseFloat(l.kg) === pr ? `${GRN}40` : BORDER}` }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: parseFloat(l.kg) === pr ? GRN : TEXT }}>{l.kg}kg</div>
                    <div style={{ fontSize: 9.5, color: SUB, marginTop: 1 }}>{l.sets}×{l.reps} · {l.data.slice(0, 5)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {rest.timer && (
          <div style={{ ...sCard, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, border: `1px solid ${rest.timer.completed ? GRN : PINK}40` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: SUB, fontWeight: 700, textTransform: "uppercase" }}>{rest.timer.completed ? "Descanso concluído ✓" : "Descanso"} · {rest.timer.label}</div>
              <div style={{ fontWeight: 800, fontSize: 24, color: rest.timer.completed ? GRN : TEXT }}>
                {String(Math.floor(rest.timer.remaining / 60)).padStart(2, "0")}:{String(rest.timer.remaining % 60).padStart(2, "0")}
              </div>
            </div>
            <button onClick={() => rest.adjust(-15)} className="tapable" style={{ background: "#ffffff10", border: "none", borderRadius: 9, color: TEXT, padding: "8px 10px", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>-15s</button>
            <button onClick={() => rest.adjust(15)} className="tapable" style={{ background: "#ffffff10", border: "none", borderRadius: 9, color: TEXT, padding: "8px 10px", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>+15s</button>
            <button onClick={rest.skip} className="tapable" style={{ background: "none", border: "none", color: SUB, fontSize: 11, cursor: "pointer", padding: "8px 4px" }}>Pular</button>
          </div>
        )}

        <div style={{ ...sCard, overflow: "hidden", marginBottom: 14 }}>
          {exProgress.sets.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderBottom: i < exProgress.sets.length - 1 ? `1px solid ${BORDER}` : "none", background: s.done ? `${GRN}08` : "transparent" }}>
              <button
                onClick={() => toggleSet(i)}
                className="tapable"
                aria-label={`Série ${i + 1} ${s.done ? "concluída" : "pendente"}`}
                style={{ width: 34, height: 34, borderRadius: "50%", border: `1.5px solid ${s.done ? GRN : BORDER}`, background: s.done ? `${GRN}22` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                {s.done ? <IconCheck size={16} style={{ color: GRN }} /> : <span style={{ fontSize: 11, color: SUB, fontWeight: 700 }}>{i + 1}</span>}
              </button>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: SUB }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span>Série {i + 1}</span>
                  {s.reps && <span style={{ fontWeight: 800, fontSize: 13, color: TEXT }}>{s.reps} reps</span>}
                </div>
                {s.tipo && s.tipo !== "normal" && (
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: s.tipo === "aquecimento" ? AMB : s.tipo === "reserva" ? PURP : RED }}>
                    {s.tipo === "aquecimento" ? `Aquecimento${s.percentual != null ? ` · ~${s.percentual}%` : ""}` : s.tipo === "reserva" ? `Reserva${s.rir != null ? ` · RIR ${s.rir}` : ""}` : "Até a falha"}
                  </div>
                )}
                {/* So aparece quando o que esta no campo saiu do plano: repetir
                    "planejado 40kg" embaixo de um campo que ja mostra 40 e ruido. */}
                {s.pesoPlanejado && s.pesoPlanejado !== (s.weight || "") && (
                  <div style={{ fontSize: 10, color: SUB, marginTop: 2 }}>planejado: {s.pesoPlanejado}kg</div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <button onClick={() => ajustarPeso(i, -2.5)} className="tapable" aria-label="Diminuir 2,5kg" style={{ width: 28, height: 34, borderRadius: 8, background: "#ffffff10", border: "none", color: TEXT, fontSize: 15, fontWeight: 700, cursor: "pointer", padding: 0 }}>−</button>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={s.weight || ""}
                  onChange={(e) => setWeight(i, e.target.value)}
                  style={{ ...sInp, width: 62, minHeight: 34, padding: "6px 4px", textAlign: "center" }}
                />
                <button onClick={() => ajustarPeso(i, 2.5)} className="tapable" aria-label="Aumentar 2,5kg" style={{ width: 28, height: 34, borderRadius: 8, background: "#ffffff10", border: "none", color: TEXT, fontSize: 15, fontWeight: 700, cursor: "pointer", padding: 0 }}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => goTo(exIndex - 1)} disabled={exIndex === 0} className="tapable" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "#ffffff10", border: "none", borderRadius: 10, color: exIndex === 0 ? SUB : TEXT, padding: "11px 0", cursor: exIndex === 0 ? "default" : "pointer", opacity: exIndex === 0 ? 0.5 : 1 }}>
            <IconChevronLeft size={15} /> Anterior
          </button>
          <button onClick={() => goTo(exIndex + 1)} disabled={exIndex === session.exercises.length - 1} className="tapable" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "#ffffff10", border: "none", borderRadius: 10, color: exIndex === session.exercises.length - 1 ? SUB : TEXT, padding: "11px 0", cursor: exIndex === session.exercises.length - 1 ? "default" : "pointer", opacity: exIndex === session.exercises.length - 1 ? 0.5 : 1 }}>
            Próximo <IconChevronRight size={15} />
          </button>
        </div>

        {proximoNome && <div style={{ fontSize: 11, color: SUB, textAlign: "center", marginBottom: 14 }}>A seguir: {proximoNome}</div>}

        {seriesPendentes > 0 && (
          confirmarMarcarTudo ? (
            <div style={{ ...sCard, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: TEXT, marginBottom: 3 }}>Marcar as {totalSeries} séries do treino como feitas?</div>
              <div style={{ fontSize: 11, color: SUB, marginBottom: 11, lineHeight: 1.5 }}>Vale o treino inteiro, não só este exercício. Os pesos que estão preenchidos vão pro histórico.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...sBtn(GRN), flex: 1 }} onClick={marcarTudo}>Sim, marcar tudo</button>
                <button className="tapable" style={{ flex: 1, background: "#ffffff10", border: "none", borderRadius: 10, minHeight: 40, color: SUB, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }} onClick={() => setConfirmarMarcarTudo(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmarMarcarTudo(true)}
              className="tapable"
              style={{ width: "100%", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#ffffff08", border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 12, fontWeight: 700, padding: "11px 0", cursor: "pointer" }}
            >
              <IconCheck size={15} /> Marcar todas as séries ({seriesPendentes} pendentes)
            </button>
          )
        )}

        <button style={{ ...sBtn(GRN, true) }} onClick={finalizar}>Finalizar treino</button>
      </div>

      {/* Confirmacao de "peso preenchido = serie feita". E uma barra em baixo,
          nao um modal centralizado, pra nao tapar a lista de series — a
          pessoa precisa ver de qual serie a pergunta esta falando. So aparece
          se a serie continuar pendente (se ela marcou no circulo enquanto
          isso, a pergunta se resolveu sozinha). */}
      {proposta && !exProgress.sets[proposta.setIndex]?.done && (
        <div
          className="fade-in-up"
          style={{ position: "fixed", left: 10, right: 10, bottom: "calc(env(safe-area-inset-bottom,0px) + 12px)", zIndex: 30, background: CARD, border: `1px solid ${GRN}55`, borderRadius: 14, boxShadow: SHADOW_POP, padding: 14 }}
        >
          <div style={{ fontSize: 12.5, color: TEXT, marginBottom: 3 }}>
            <strong>Série {proposta.setIndex + 1}</strong> com <strong>{proposta.peso}kg</strong>
          </div>
          <div style={{ fontSize: 11.5, color: SUB, marginBottom: 11 }}>Marcar como concluída e começar o descanso?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="tapable"
              style={{ ...sBtn(GRN), flex: 1 }}
              onClick={() => { const i = proposta.setIndex; setProposta(null); toggleSet(i); }}
            >
              Sim, concluir
            </button>
            {/* Neutro de proposito: sBtn() sempre vira gradiente ate o roxo, e
                aqui as duas opcoes ficariam com o mesmo peso visual — ruim
                num dialogo em que uma marca a serie e a outra nao. */}
            <button
              className="tapable"
              style={{ flex: 1, background: "#ffffff10", border: "none", borderRadius: 10, minHeight: 40, color: SUB, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              onClick={() => {
                recusadasRef.current.add(`${exIndex}:${proposta.setIndex}:${proposta.peso}`);
                setProposta(null);
              }}
            >
              Ainda não
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
