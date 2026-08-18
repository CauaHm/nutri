import { useState, useEffect, useCallback } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { IconBell } from "@/components/icons";
import { SUB, BORDER, TEXT, PURP, GRN, AMB, sCard, sInp, sLbl } from "@/lib/theme";
import { mergeNotificacoes, type NotificacoesConfig, type TipoNotificacao } from "@/lib/notificacoes";
import { usePushNotifications } from "@/lib/usePushNotifications";
import type { ScreenProps } from "@/lib/screenProps";

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

function horaDoHHMM(hhmm: string): string {
  return (hhmm || "00:00").split(":")[0].padStart(2, "0");
}
function comHora(hh: string): string {
  return `${hh}:00`;
}

interface TipoInfo {
  key: Exclude<TipoNotificacao, never>;
  emoji: string;
  label: string;
  desc: string;
}

const TIPOS_SIMPLES: TipoInfo[] = [
  { key: "fimDeRodada", emoji: "🏆", label: "Fim de rodada", desc: "avisa os dois quando alguém bate a meta e a rodada termina" },
  { key: "refeicao", emoji: "🍽️", label: "Refeição atrasada", desc: "lembrete se uma refeição configurada passou 1h sem registro" },
  { key: "pesagem", emoji: "⚖️", label: "Pesagem semanal", desc: "lembrete toda segunda de manhã se faz mais de 7 dias sem medição" },
  { key: "parceiroPR", emoji: "💪", label: "PR do parceiro", desc: "avisa quando seu parceiro bate um recorde pessoal" },
  { key: "parceiroRanking", emoji: "📈", label: "Ultrapassagem no ranking", desc: "avisa se o parceiro passar você no placar da rodada" },
  { key: "badge", emoji: "🏅", label: "Título desbloqueado", desc: "avisa quando seu parceiro desbloqueia um título em \"O Sistema\"" },
];

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      {([[false, "Off"], [true, "On"]] as const).map(([v, l]) => (
        <button
          key={l}
          onClick={() => !disabled && onChange(v)}
          disabled={disabled}
          className="tapable"
          style={{
            padding: "5px 10px", borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.4 : 1,
            background: on === v ? (v ? `${GRN}30` : "#ffffff10") : "#ffffff08",
            border: `1px solid ${on === v ? (v ? GRN : SUB) : BORDER}`,
            color: on === v ? (v ? GRN : TEXT) : SUB,
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function NotificacoesScreen({ data, nav, auth }: ScreenProps) {
  const { user } = data;
  const push = usePushNotifications();
  const [prefs, setPrefs] = useState<NotificacoesConfig>(() => mergeNotificacoes(user.notificacoes));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPrefs(mergeNotificacoes(user.notificacoes)); }, [user.notificacoes]);

  const patchPrefs = useCallback(async (partial: Partial<NotificacoesConfig>) => {
    setSaving(true);
    try {
      await fetch("/api/push/prefs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(partial) });
      await auth.refresh();
    } finally {
      setSaving(false);
    }
  }, [auth]);

  const negado = push.permission === "denied";

  // Pedir permissao SO acontece aqui, no gesto explicito de ligar um tipo —
  // nunca no carregamento da tela. Se negar/nao suportar, o toggle continua
  // desligado (nao flipa a UI de forma otimista).
  const handleToggleTipo = useCallback(async (tipo: TipoNotificacao, ligar: boolean) => {
    if (ligar && push.permission !== "granted") {
      const ok = await push.subscribe();
      if (!ok) return;
    }
    const next: NotificacoesConfig = { ...prefs, [tipo]: { ...(prefs as any)[tipo], on: ligar } };
    setPrefs(next);
    await patchPrefs({ [tipo]: (next as any)[tipo] } as Partial<NotificacoesConfig>);
  }, [prefs, push, patchPrefs]);

  const handleHoraAgua = useCallback((idx: number, hh: string) => {
    const horarios = prefs.agua.horarios.map((h, i) => (i === idx ? comHora(hh) : h));
    const next = { ...prefs, agua: { ...prefs.agua, horarios } };
    setPrefs(next);
    patchPrefs({ agua: next.agua });
  }, [prefs, patchPrefs]);

  const addHoraAgua = useCallback(() => {
    if (prefs.agua.horarios.length >= 10) return;
    const horarios = [...prefs.agua.horarios, "12:00"];
    const next = { ...prefs, agua: { ...prefs.agua, horarios } };
    setPrefs(next);
    patchPrefs({ agua: next.agua });
  }, [prefs, patchPrefs]);

  const removeHoraAgua = useCallback((idx: number) => {
    const horarios = prefs.agua.horarios.filter((_, i) => i !== idx);
    const next = { ...prefs, agua: { ...prefs.agua, horarios } };
    setPrefs(next);
    patchPrefs({ agua: next.agua });
  }, [prefs, patchPrefs]);

  const handleHoraTreino = useCallback((hh: string) => {
    const next = { ...prefs, treino: { ...prefs.treino, horario: comHora(hh) } };
    setPrefs(next);
    patchPrefs({ treino: next.treino });
  }, [prefs, patchPrefs]);

  const handleQuietHours = useCallback((campo: "inicio" | "fim", hh: string) => {
    const next = { ...prefs, quietHours: { ...prefs.quietHours, [campo]: comHora(hh) } };
    setPrefs(next);
    patchPrefs({ quietHours: next.quietHours });
  }, [prefs, patchPrefs]);

  return (
    <div style={{ minHeight: "100%", paddingBottom: 60 }}>
      <ScreenHeader title="Notificações" accent="🔔" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        {negado && (
          <div style={{ background: `${AMB}12`, border: `1px solid ${AMB}30`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 11.5, color: AMB, lineHeight: 1.6, display: "flex", gap: 8 }}>
            <IconBell size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Notificações bloqueadas neste navegador. Pra ativar: nas configurações do site (ícone de cadeado/informações na barra de endereço) → Notificações → permitir. Depois volte aqui e ligue o que quiser.</span>
          </div>
        )}
        {!push.suportado && (
          <div style={{ background: `${SUB}12`, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 11.5, color: SUB, lineHeight: 1.6 }}>
            Este navegador/aparelho não suporta notificações push.
          </div>
        )}

        {/* Água */}
        <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>💧 Água</span>
            <Toggle on={prefs.agua.on} onChange={(v) => handleToggleTipo("agua", v)} disabled={negado} />
          </div>
          <div style={{ padding: "0 14px 14px", fontSize: 10.5, color: SUB, lineHeight: 1.5 }}>lembrete pra beber água nos horários abaixo, se ainda não bateu a meta do dia</div>
          {prefs.agua.on && (
            <div style={{ padding: "0 14px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {prefs.agua.horarios.map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <select style={{ ...sInp, width: 72, padding: "6px 8px" }} value={horaDoHHMM(h)} onChange={(e) => handleHoraAgua(i, e.target.value)}>
                    {HORAS.map((hh) => <option key={hh} value={hh}>{hh}h</option>)}
                  </select>
                  {prefs.agua.horarios.length > 1 && (
                    <button onClick={() => removeHoraAgua(i)} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", fontSize: 13 }}>✕</button>
                  )}
                </div>
              ))}
              {prefs.agua.horarios.length < 10 && (
                <button onClick={addHoraAgua} className="tapable" style={{ background: "none", border: `1px dashed ${BORDER}`, borderRadius: 9, color: PURP, fontSize: 11, fontWeight: 700, padding: "6px 10px", cursor: "pointer" }}>+ horário</button>
              )}
            </div>
          )}
        </div>

        {/* Treino */}
        <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>🏋️ Treino</span>
            <Toggle on={prefs.treino.on} onChange={(v) => handleToggleTipo("treino", v)} disabled={negado} />
          </div>
          <div style={{ padding: "0 14px 14px", fontSize: 10.5, color: SUB, lineHeight: 1.5 }}>lembrete no horário abaixo, só em dias com treino programado e se ainda não fez check-in</div>
          {prefs.treino.on && (
            <div style={{ padding: "0 14px 14px" }}>
              <select style={{ ...sInp, width: 90, padding: "6px 8px" }} value={horaDoHHMM(prefs.treino.horario)} onChange={(e) => handleHoraTreino(e.target.value)}>
                {HORAS.map((hh) => <option key={hh} value={hh}>{hh}h</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Demais tipos */}
        <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
          {TIPOS_SIMPLES.map((t, i) => (
            <div key={t.key} style={{ padding: "10px 14px", borderTop: i === 0 ? "none" : `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{t.emoji} {t.label}</span>
                <Toggle on={(prefs as any)[t.key].on} onChange={(v) => handleToggleTipo(t.key, v)} disabled={negado} />
              </div>
              <div style={{ fontSize: 10.5, color: SUB, lineHeight: 1.5, marginTop: 3 }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {/* Horario silencioso */}
        <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: TEXT }}>🌙 Horário silencioso</div>
          <div style={{ padding: "0 14px 14px", fontSize: 10.5, color: SUB, lineHeight: 1.5 }}>nenhuma notificação chega nesse intervalo (nem depois, quando o intervalo acaba — só a próxima que já bateria naturalmente)</div>
          <div style={{ padding: "0 14px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <label style={sLbl}>De</label>
              <select style={{ ...sInp, width: 90, padding: "6px 8px" }} value={horaDoHHMM(prefs.quietHours.inicio)} onChange={(e) => handleQuietHours("inicio", e.target.value)}>
                {HORAS.map((hh) => <option key={hh} value={hh}>{hh}h</option>)}
              </select>
            </div>
            <div>
              <label style={sLbl}>Até</label>
              <select style={{ ...sInp, width: 90, padding: "6px 8px" }} value={horaDoHHMM(prefs.quietHours.fim)} onChange={(e) => handleQuietHours("fim", e.target.value)}>
                {HORAS.map((hh) => <option key={hh} value={hh}>{hh}h</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: SUB, textAlign: "center", padding: "4px 0" }}>
          {saving ? "salvando..." : "no máximo 4 notificações por dia, pra não virar spam"}
        </div>
      </div>
    </div>
  );
}
