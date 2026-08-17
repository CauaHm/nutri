import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { todayStr } from "@/lib/dates";
import { useBodyComp } from "@/lib/useBodyComp";
import { TIPOS_ATIVIDADE, INTENSIDADES, calcKcalAtividade, infoDoTipo, type TipoAtividade, type Intensidade } from "@/lib/atividades";
import { IconTrash, IconFlame } from "@/components/icons";
import { CARD2, PINK, AMB, SUB, BORDER, TEXT, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";

const num = (v: string): number | null => (v === "" || v === null || v === undefined ? null : Number(v));

export default function AtividadeScreen({ data, nav }: ScreenProps) {
  const { user, atividades, addAtividade, removeAtividade } = data;
  const bc = useBodyComp(user);

  const [date, setDate] = useState(todayStr());
  const [tipo, setTipo] = useState<TipoAtividade>("corrida");
  const [duracaoMin, setDuracaoMin] = useState("");
  const [distanciaKm, setDistanciaKm] = useState("");
  const [intensidade, setIntensidade] = useState<Intensidade>("moderada");
  const [nota, setNota] = useState("");

  const info = infoDoTipo(tipo);
  const peso = bc.ready ? num(String(bc.historico[0]?.peso ?? "")) : null;
  const duracao = Number(duracaoMin) || 0;
  const distancia = distanciaKm ? Number(distanciaKm) : undefined;

  const kcalPreview = peso && duracao > 0
    ? calcKcalAtividade({ tipo, duracaoMin: duracao, intensidade, distanciaKm: distancia, pesoKg: peso })
    : 0;

  const podeRegistrar = bc.ready && !!peso && duracao > 0;

  const registrar = () => {
    if (!podeRegistrar || !peso) return;
    addAtividade({ date, tipo, duracaoMin: duracao, distanciaKm: distancia, intensidade, kcalEstimado: kcalPreview, nota: nota.trim() || undefined });
    setDuracaoMin("");
    setDistanciaKm("");
    setNota("");
  };

  const doDia = atividades.filter((a) => a.date === date);
  const totalDoDia = doDia.reduce((s, a) => s + a.kcalEstimado, 0);

  return (
    <div style={{ minHeight: "100%", paddingBottom: 60 }}>
      <ScreenHeader title="Atividade Extra" accent="🏃" subtitle={date} onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        {bc.ready && (
          <div style={{ background: `${PINK}12`, border: `1px solid ${PINK}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: "#f5b8ee", lineHeight: 1.6 }}>
            {bc.config.modoGasto === "preciso"
              ? "Modo Preciso ativo: registre toda atividade do dia, inclusive o treino programado — o gasto do dia é TMB × 1.2 + tudo que você registrar aqui."
              : "Modo Estimativa ativo: registre apenas o que foi além do seu treino planejado — sua rotina normal já está no fator de atividade."}
          </div>
        )}

        {bc.ready && !peso && (
          <div style={{ background: `${AMB}15`, border: `1px solid ${AMB}40`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 11.5, color: AMB, lineHeight: 1.6 }}>
            ⚠️ Cadastre seu peso em Nutrição → Composição Corporal primeiro — sem ele não dá pra estimar o gasto calórico da atividade.
          </div>
        )}

        <div style={{ ...sCard, padding: 14, marginBottom: 14 }}>
          <label style={sLbl}>Data</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={{ ...sInp, maxWidth: 140 }} value={date} onChange={(e) => setDate(e.target.value)} placeholder="DD/MM/AAAA" />
            {date !== todayStr() && <button onClick={() => setDate(todayStr())} className="tapable" style={{ background: "none", border: "none", color: PINK, fontSize: 11, cursor: "pointer" }}>hoje</button>}
          </div>

          <label style={sLbl}>Tipo</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TIPOS_ATIVIDADE.map((t) => (
              <button
                key={t.key} onClick={() => setTipo(t.key)} className="tapable"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", background: tipo === t.key ? `${PINK}25` : "#ffffff08", border: `1px solid ${tipo === t.key ? PINK : BORDER}`, borderRadius: 20, color: tipo === t.key ? PINK : SUB, fontSize: 11.5, fontWeight: tipo === t.key ? 700 : 400, cursor: "pointer" }}
              >
                <span>{t.emoji}</span>{t.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: info.aceitaDistancia ? "1fr 1fr" : "1fr", gap: 8 }}>
            <div><label style={sLbl}>Duração (min)</label><input style={sInp} type="number" value={duracaoMin} onChange={(e) => setDuracaoMin(e.target.value)} placeholder="45" /></div>
            {info.aceitaDistancia && (
              <div><label style={sLbl}>Distância (km) — opcional</label><input style={sInp} type="number" step="0.1" value={distanciaKm} onChange={(e) => setDistanciaKm(e.target.value)} placeholder="ex: 10" /></div>
            )}
          </div>
          {info.aceitaDistancia && distanciaKm && (
            <div style={{ fontSize: 10, color: SUB, marginTop: -6, marginBottom: 6 }}>Com distância informada, o ritmo (km/h) escolhe o esforço automaticamente — mais preciso que a intensidade abaixo.</div>
          )}

          <label style={sLbl}>Intensidade</label>
          <div style={{ display: "flex", gap: 6 }}>
            {INTENSIDADES.map((i) => (
              <button key={i.key} onClick={() => setIntensidade(i.key)} className="tapable" style={{ flex: 1, padding: "8px 4px", background: intensidade === i.key ? `${PINK}25` : "#ffffff08", border: `1px solid ${intensidade === i.key ? PINK : BORDER}`, borderRadius: 8, color: intensidade === i.key ? PINK : SUB, fontSize: 11, fontWeight: intensidade === i.key ? 700 : 400, cursor: "pointer" }}>{i.label}</button>
            ))}
          </div>

          <label style={sLbl}>Nota — opcional</label>
          <input style={sInp} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="ex: corrida no parque" />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, padding: "10px 12px", background: CARD2, borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: SUB, display: "flex", alignItems: "center", gap: 5 }}><IconFlame size={14} style={{ color: PINK }} /> estimativa</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: PINK }}>{kcalPreview > 0 ? `~${kcalPreview} kcal` : "—"}</span>
          </div>

          <button style={{ ...sBtn(podeRegistrar ? PINK : "#444", true), marginTop: 12, opacity: podeRegistrar ? 1 : 0.6 }} disabled={!podeRegistrar} onClick={registrar}>
            Registrar atividade
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>Registradas em {date}</div>
          {totalDoDia > 0 && <div style={{ fontSize: 11.5, color: PINK, fontWeight: 700 }}>{totalDoDia} kcal no total</div>}
        </div>

        {doDia.length === 0 ? (
          <div style={{ color: SUB, fontSize: 12, textAlign: "center", padding: "16px 0" }}>Nenhuma atividade registrada nesse dia ainda.</div>
        ) : (
          <div style={sCard}>
            {doDia.map((a) => {
              const t = infoDoTipo(a.tipo);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 18 }}>{t.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: TEXT }}>{t.label} · {a.duracaoMin}min{a.distanciaKm ? ` · ${a.distanciaKm}km` : ""}</div>
                    <div style={{ fontSize: 10.5, color: SUB }}>{a.kcalEstimado} kcal · {INTENSIDADES.find((i) => i.key === a.intensidade)?.label}{a.nota ? ` · ${a.nota}` : ""}</div>
                  </div>
                  <button onClick={() => removeAtividade(a.id)} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 4 }}><IconTrash size={14} /></button>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
