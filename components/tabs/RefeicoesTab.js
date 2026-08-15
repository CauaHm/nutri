"use client";
import { useState } from "react";
import { CARD, PINK, PURP, SUB, BORDER, sInp, sLbl, sBtn } from "@/lib/theme";

const EMPTY = { nome: "", emoji: "🍽️", horario: "", kcalAlvo: "", itens: "" };

export default function RefeicoesTab({ data }) {
  const { user, refeicoesCfg, saveRefeicoesCfg } = data;
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState(EMPTY);
  const [addForm, setAddForm] = useState(false);
  const [newRef, setNewRef] = useState(EMPTY);

  if (!refeicoesCfg) return null;

  const startEdit = (r) => {
    setEditId(r.id);
    setEditVal({ ...r, itens: (r.itens || []).join("\n"), kcalAlvo: r.kcalAlvo || "" });
  };
  const confirmEdit = async () => {
    const next = refeicoesCfg.map((r) => (r.id === editId ? {
      ...r, nome: editVal.nome, emoji: editVal.emoji, horario: editVal.horario,
      kcalAlvo: Number(editVal.kcalAlvo) || 0,
      itens: editVal.itens.split("\n").map((s) => s.trim()).filter(Boolean),
    } : r));
    await saveRefeicoesCfg(next);
    setEditId(null);
  };
  const delRef = async (id) => saveRefeicoesCfg(refeicoesCfg.filter((r) => r.id !== id));
  const addRef = async () => {
    if (!newRef.nome) return;
    const r = {
      id: `r${Date.now()}`, nome: newRef.nome, emoji: newRef.emoji || "🍽️", horario: newRef.horario,
      kcalAlvo: Number(newRef.kcalAlvo) || 0,
      itens: newRef.itens.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    await saveRefeicoesCfg([...refeicoesCfg, r]);
    setAddForm(false);
    setNewRef(EMPTY);
  };

  return (
    <>
      <div style={{ color: SUB, fontSize: 11, marginBottom: 12 }}>
        Configure suas refeições do dia — quantas quiser. O kcal comido em cada uma se registra na aba 📊 Hoje.
      </div>
      {refeicoesCfg.map((r) => (
        <div key={r.id} style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 10, overflow: "hidden" }}>
          {editId === r.id ? (
            <div style={{ padding: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                <div><label style={sLbl}>Nome</label><input style={sInp} value={editVal.nome} onChange={(e) => setEditVal((p) => ({ ...p, nome: e.target.value }))} /></div>
                <div><label style={sLbl}>Emoji</label><input style={sInp} value={editVal.emoji} onChange={(e) => setEditVal((p) => ({ ...p, emoji: e.target.value }))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={sLbl}>Horário</label><input style={sInp} value={editVal.horario} onChange={(e) => setEditVal((p) => ({ ...p, horario: e.target.value }))} placeholder="09:00" /></div>
                <div><label style={sLbl}>Kcal alvo</label><input style={sInp} type="number" value={editVal.kcalAlvo} onChange={(e) => setEditVal((p) => ({ ...p, kcalAlvo: e.target.value }))} /></div>
              </div>
              <label style={sLbl}>Sugestões (uma por linha)</label>
              <textarea style={{ ...sInp, minHeight: 80, resize: "vertical" }} value={editVal.itens} onChange={(e) => setEditVal((p) => ({ ...p, itens: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={confirmEdit}>Salvar</button>
                <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setEditId(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{r.emoji} {r.nome}</div>
                  <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>{r.horario}{r.kcalAlvo ? ` · ~${r.kcalAlvo} kcal` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => startEdit(r)} style={{ background: "none", border: "none", color: SUB, cursor: "pointer", fontSize: 14 }}>✏️</button>
                  <button onClick={() => delRef(r.id)} style={{ background: "none", border: "none", color: SUB, cursor: "pointer", fontSize: 14 }}>🗑</button>
                </div>
              </div>
              {r.itens?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {r.itens.map((it, i) => <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, padding: "3px 0", color: SUB }}><span style={{ color: PURP }}>▸</span>{it}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {addForm ? (
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Nova refeição</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
            <div><label style={sLbl}>Nome</label><input style={sInp} value={newRef.nome} onChange={(e) => setNewRef((p) => ({ ...p, nome: e.target.value }))} placeholder="ex: Pré-treino" /></div>
            <div><label style={sLbl}>Emoji</label><input style={sInp} value={newRef.emoji} onChange={(e) => setNewRef((p) => ({ ...p, emoji: e.target.value }))} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><label style={sLbl}>Horário</label><input style={sInp} value={newRef.horario} onChange={(e) => setNewRef((p) => ({ ...p, horario: e.target.value }))} placeholder="09:00" /></div>
            <div><label style={sLbl}>Kcal alvo</label><input style={sInp} type="number" value={newRef.kcalAlvo} onChange={(e) => setNewRef((p) => ({ ...p, kcalAlvo: e.target.value }))} /></div>
          </div>
          <label style={sLbl}>Sugestões (uma por linha, opcional)</label>
          <textarea style={{ ...sInp, minHeight: 80, resize: "vertical" }} value={newRef.itens} onChange={(e) => setNewRef((p) => ({ ...p, itens: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={addRef}>+ Adicionar</button>
            <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setAddForm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button style={sBtn(user.cor, true)} onClick={() => setAddForm(true)}>+ Adicionar refeição</button>
      )}
    </>
  );
}
