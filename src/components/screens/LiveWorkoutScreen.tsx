import { useEffect, useRef, useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { IconCheck, IconChevronLeft, IconChevronRight } from "@/components/icons";
import { PINK, PURP, GRN, AMB, RED, SUB, BORDER, TEXT, CARD2, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import { todayStr } from "@/lib/dates";
import { getRestSeconds } from "@/lib/restTimer";
import { buildInitialSession, computeSummary, parseRepsFromProto, workingSets, type LiveWorkoutSession, type SessionSummary } from "@/lib/liveWorkout";
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
    updateSession({ ...session, exercises: nextExercises });
    if (willBeDone) {
      rest.start(getRestSeconds(exOriginal, dia), exOriginal.nome, { exId: exOriginal.id, dayIndex });
    }
  };

  const setWeight = (setIndex: number, weight: string) => {
    const nextExercises = session.exercises.map((e, i) =>
      i === exIndex ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, weight } : s)) } : e
    );
    updateSession({ ...session, exercises: nextExercises });
  };

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
      const doneCount = workingOnly.filter((s) => s.done).length;
      const original = dia.exercicios.find((o) => (o.id !== undefined && o.id === ex.exId) || o.nome === ex.nome);
      await saveWeightLog({ ex: ex.nome, data: todayStr(), kg: String(Math.max(...doneWeights)), sets: String(doneCount), reps: parseRepsFromProto(original?.proto || "") });
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
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: i < exProgress.sets.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <button
                onClick={() => toggleSet(i)}
                className="tapable"
                aria-label={`Série ${i + 1} ${s.done ? "concluída" : "pendente"}`}
                style={{ width: 34, height: 34, borderRadius: "50%", border: `1.5px solid ${s.done ? GRN : BORDER}`, background: s.done ? `${GRN}22` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                {s.done ? <IconCheck size={16} style={{ color: GRN }} /> : <span style={{ fontSize: 11, color: SUB, fontWeight: 700 }}>{i + 1}</span>}
              </button>
              <div style={{ flex: 1, fontSize: 12, color: SUB }}>
                Série {i + 1}
                {s.tipo && s.tipo !== "normal" && (
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: s.tipo === "aquecimento" ? AMB : s.tipo === "reserva" ? PURP : RED }}>
                    {s.tipo === "aquecimento" ? `Aquecimento${s.percentual != null ? ` · ~${s.percentual}%` : ""}` : s.tipo === "reserva" ? `Reserva${s.rir != null ? ` · RIR ${s.rir}` : ""}` : "Até a falha"}
                  </div>
                )}
              </div>
              <input
                type="number"
                inputMode="decimal"
                placeholder="kg"
                value={s.weight || ""}
                onChange={(e) => setWeight(i, e.target.value)}
                style={{ ...sInp, width: 80, textAlign: "center" }}
              />
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

        <button style={{ ...sBtn(GRN, true) }} onClick={finalizar}>Finalizar treino</button>
      </div>
    </div>
  );
}
