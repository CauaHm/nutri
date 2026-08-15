"use client";
import { useState } from "react";
import { getWeekStart } from "@/lib/dates";
import { totaisDoDia } from "@/lib/points";
import { CARD, PINK, CYAN, GRN, RED, SUB, BORDER } from "@/lib/theme";

function groupByWeek(entries, getDate) {
  const byWeek = {};
  entries.forEach((e) => {
    const ws = getWeekStart(getDate(e));
    if (!byWeek[ws]) byWeek[ws] = [];
    byWeek[ws].push(e);
  });
  return Object.keys(byWeek)
    .sort((a, b) => getWeekStart(b).localeCompare(a))
    .map((wk) => ({ wk, dias: byWeek[wk] }));
}

export default function HistTab({ data }) {
  const { user, mealLog, waters, delWater } = data;
  const [semAberta, setSemAberta] = useState({});

  const kcalEntries = Object.keys(mealLog)
    .map((date) => ({ date, kcal: totaisDoDia(mealLog, date).kcal }))
    .filter((e) => e.kcal > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const calWeeks = groupByWeek(kcalEntries, (e) => e.date);
  const waterWeeks = groupByWeek(waters, (e) => e.date);

  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 14, color: PINK, marginBottom: 10 }}>🔥 Calorias por Semana</div>
      {calWeeks.length === 0 && <div style={{ color: SUB, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Nenhum registro ainda.</div>}
      {calWeeks.map(({ wk, dias }) => {
        const total = dias.reduce((s, l) => s + l.kcal, 0);
        const ab = semAberta[`c${wk}`] !== false;
        return (
          <div key={wk} style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setSemAberta((p) => ({ ...p, [`c${wk}`]: !ab }))}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{wk}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: PINK, fontWeight: 700 }}>{total.toLocaleString()} kcal</span><span style={{ color: SUB }}>{ab ? "▲" : "▼"}</span></div>
            </div>
            {ab && dias.map((l) => (
              <div key={l.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderTop: `1px solid ${BORDER}` }}>
                <div><span style={{ fontWeight: 700, color: l.kcal <= user.kcalMeta ? GRN : RED, fontSize: 14 }}>{l.kcal} kcal</span><span style={{ color: SUB, fontSize: 11, marginLeft: 8 }}>{l.date}</span></div>
              </div>
            ))}
          </div>
        );
      })}

      <div style={{ fontWeight: 700, fontSize: 14, color: CYAN, margin: "20px 0 10px" }}>💧 Água por Semana</div>
      {waterWeeks.length === 0 && <div style={{ color: SUB, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Nenhum registro ainda.</div>}
      {waterWeeks.map(({ wk, dias }) => {
        const media = (dias.reduce((s, l) => s + l.liters, 0) / dias.length).toFixed(1);
        const ab = semAberta[`w${wk}`] !== false;
        return (
          <div key={wk} style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setSemAberta((p) => ({ ...p, [`w${wk}`]: !ab }))}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{wk}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: CYAN, fontWeight: 700 }}>Média {media}L</span><span style={{ color: SUB }}>{ab ? "▲" : "▼"}</span></div>
            </div>
            {ab && dias.map((l) => (
              <div key={l.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderTop: `1px solid ${BORDER}` }}>
                <div><span style={{ fontWeight: 700, color: l.liters >= user.waterMeta ? GRN : RED, fontSize: 14 }}>{l.liters}L</span><span style={{ color: SUB, fontSize: 11, marginLeft: 8 }}>{l.date}</span></div>
                <button style={{ background: "none", border: "none", color: SUB, cursor: "pointer", fontSize: 12 }} onClick={() => delWater(l.date)}>🗑</button>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
