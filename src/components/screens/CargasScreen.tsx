import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { todayStr } from "@/lib/dates";
import { IconTrash } from "@/components/icons";
import { PINK, GRN, SUB, BORDER, TEXT, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";

export default function CargasScreen({ data, nav }: ScreenProps) {
  const { treino, weightLogs, saveWeightLog, delWeightLog } = data;
  const [selEx, setSelEx] = useState("");
  const [logData, setLogData] = useState(todayStr());
  const [logKg, setLogKg] = useState("");
  const [logSets, setLogSets] = useState("3");
  const [logReps, setLogReps] = useState("8");
  const [saved, setSaved] = useState(false);

  const allExNames = [...new Set((treino || []).flatMap((d) => d.exercicios.map((e) => e.nome)))];
  const curWLogs = weightLogs.filter((l) => l.ex === selEx);
  const maxKg = curWLogs.length ? Math.max(...curWLogs.map((l) => parseFloat(l.kg) || 0)) : 0;

  return (
    <div style={{ minHeight: "100%", paddingBottom: 60 }}>
      <ScreenHeader title="Cargas & Recordes" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <div style={{ ...sCard, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: 14 }}>
            <label style={sLbl}>Exercício</label>
            <select value={selEx} onChange={(e) => setSelEx(e.target.value)} style={sInp}>
              <option value="">Selecione...</option>
              {allExNames.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
            </select>
            <label style={sLbl}>Data</label>
            <input style={sInp} type="text" value={logData} onChange={(e) => setLogData(e.target.value)} placeholder="DD/MM/AAAA" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
              <div><label style={sLbl}>Kg</label><input style={sInp} type="number" value={logKg} onChange={(e) => setLogKg(e.target.value)} placeholder="40" /></div>
              <div><label style={sLbl}>Séries</label><input style={sInp} type="number" value={logSets} onChange={(e) => setLogSets(e.target.value)} /></div>
              <div><label style={sLbl}>Reps</label><input style={sInp} type="number" value={logReps} onChange={(e) => setLogReps(e.target.value)} /></div>
            </div>
            <button
              style={{ ...sBtn(saved ? "#059669" : PINK, true), marginTop: 12 }}
              onClick={() => {
                if (!logKg || !selEx) return;
                saveWeightLog({ ex: selEx, data: logData, kg: logKg, sets: logSets, reps: logReps });
                setSaved(true); setLogKg("");
                setTimeout(() => setSaved(false), 1200);
              }}
            >
              {saved ? "✓ Salvo!" : "Salvar"}
            </button>
          </div>
        </div>
        {selEx && curWLogs.length > 0 && (
          <div style={{ ...sCard }}>
            <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 13, color: TEXT }}>Histórico — {selEx} {maxKg > 0 && <span style={{ color: GRN, fontSize: 11, marginLeft: 8 }}>🏆 PR: {maxKg}kg</span>}</div>
            {curWLogs.map((l) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: PINK }}>{l.kg}kg</span>
                    {parseFloat(l.kg) === maxKg && <span style={{ fontSize: 10, color: GRN, background: "#0f1a10", padding: "1px 6px", borderRadius: 10 }}>🏆 PR</span>}
                  </div>
                  <div style={{ fontSize: 10, color: SUB }}>{l.sets}×{l.reps} · {l.data}</div>
                </div>
                <button style={{ background: "none", border: "none", color: SUB, cursor: "pointer" }} onClick={() => delWeightLog(l.id)}><IconTrash size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
