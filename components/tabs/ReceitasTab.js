"use client";
import { useState } from "react";
import { CARD, PINK, PURP, GRN, SUB, BORDER, sInp, sLbl, sBtn } from "@/lib/theme";

const EMPTY = { nome: "", tempo: "", custo: "", ing: "", passos: "", dica: "" };

export default function ReceitasTab({ data }) {
  const { user, receitas, saveReceitas } = data;
  const [aberta, setAberta] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState(EMPTY);
  const [addForm, setAddForm] = useState(false);
  const [newRec, setNewRec] = useState(EMPTY);

  const startEdit = (r) => {
    setEditId(r.id);
    setEditVal({ ...r, ing: r.ing.join("\n"), passos: r.passos.join("\n") });
  };
  const confirmEdit = async () => {
    const next = receitas.map((r) => (r.id === editId ? {
      ...r, nome: editVal.nome, tempo: editVal.tempo, custo: editVal.custo, dica: editVal.dica,
      ing: editVal.ing.split("\n").map((s) => s.trim()).filter(Boolean),
      passos: editVal.passos.split("\n").map((s) => s.trim()).filter(Boolean),
    } : r));
    await saveReceitas(next);
    setEditId(null);
  };
  const delRec = async (id) => saveReceitas(receitas.filter((r) => r.id !== id));
  const addRec = async () => {
    if (!newRec.nome) return;
    const r = {
      id: `rc${Date.now()}`, nome: newRec.nome, tempo: newRec.tempo, custo: newRec.custo, dica: newRec.dica,
      ing: newRec.ing.split("\n").map((s) => s.trim()).filter(Boolean),
      passos: newRec.passos.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    await saveReceitas([...receitas, r]);
    setAddForm(false);
    setNewRec(EMPTY);
  };

  return (
    <>
      <div style={{ color: SUB, fontSize: 12, marginBottom: 12 }}>Receitas simples e gostosas 🍳 — compartilhadas entre vocês dois.</div>
      {receitas.map((r) => (
        <div key={r.id} style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 10, overflow: "hidden" }}>
          {editId === r.id ? (
            <div style={{ padding: 14 }}>
              <label style={sLbl}>Nome</label><input style={sInp} value={editVal.nome} onChange={(e) => setEditVal((p) => ({ ...p, nome: e.target.value }))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={sLbl}>Tempo</label><input style={sInp} value={editVal.tempo} onChange={(e) => setEditVal((p) => ({ ...p, tempo: e.target.value }))} /></div>
                <div><label style={sLbl}>Custo</label><input style={sInp} value={editVal.custo} onChange={(e) => setEditVal((p) => ({ ...p, custo: e.target.value }))} /></div>
              </div>
              <label style={sLbl}>Ingredientes (um por linha)</label>
              <textarea style={{ ...sInp, minHeight: 70, resize: "vertical" }} value={editVal.ing} onChange={(e) => setEditVal((p) => ({ ...p, ing: e.target.value }))} />
              <label style={sLbl}>Modo de fazer (um passo por linha)</label>
              <textarea style={{ ...sInp, minHeight: 90, resize: "vertical" }} value={editVal.passos} onChange={(e) => setEditVal((p) => ({ ...p, passos: e.target.value }))} />
              <label style={sLbl}>Dica</label><input style={sInp} value={editVal.dica} onChange={(e) => setEditVal((p) => ({ ...p, dica: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={confirmEdit}>Salvar</button>
                <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setEditId(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between" }} onClick={() => setAberta(aberta === r.id ? null : r.id)}>
                <div><div style={{ fontWeight: 800, fontSize: 13 }}>{r.nome}</div><div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>⏱ {r.tempo} · {r.custo}</div></div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={(e) => { e.stopPropagation(); startEdit(r); }} style={{ background: "none", border: "none", color: SUB, cursor: "pointer", fontSize: 14 }}>✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); delRec(r.id); }} style={{ background: "none", border: "none", color: SUB, cursor: "pointer", fontSize: 14 }}>🗑</button>
                  <span style={{ color: SUB }}>{aberta === r.id ? "▲" : "▼"}</span>
                </div>
              </div>
              {aberta === r.id && (
                <div style={{ padding: "0 14px 14px" }}>
                  <div style={{ fontSize: 11, color: PURP, fontWeight: 700, marginBottom: 4 }}>INGREDIENTES</div>
                  {r.ing.map((i, ii) => <div key={ii} style={{ display: "flex", gap: 8, fontSize: 11, padding: "3px 0" }}><span style={{ color: PURP }}>▸</span>{i}</div>)}
                  <div style={{ fontSize: 11, color: PINK, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>MODO DE FAZER</div>
                  {r.passos.map((p, pi) => <div key={pi} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 11 }}><span style={{ color: PINK, fontWeight: 700, minWidth: 18 }}>{pi + 1}.</span>{p}</div>)}
                  {r.dica && <div style={{ marginTop: 8, padding: "6px 10px", background: `${GRN}12`, borderLeft: `2px solid ${GRN}`, borderRadius: "0 6px 6px 0", fontSize: 11, color: "#86efac" }}>💡 {r.dica}</div>}
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {addForm ? (
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Nova receita</div>
          <label style={sLbl}>Nome</label><input style={sInp} value={newRec.nome} onChange={(e) => setNewRec((p) => ({ ...p, nome: e.target.value }))} placeholder="🍳 Nome da receita" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><label style={sLbl}>Tempo</label><input style={sInp} value={newRec.tempo} onChange={(e) => setNewRec((p) => ({ ...p, tempo: e.target.value }))} placeholder="10 min" /></div>
            <div><label style={sLbl}>Custo</label><input style={sInp} value={newRec.custo} onChange={(e) => setNewRec((p) => ({ ...p, custo: e.target.value }))} placeholder="~R$5" /></div>
          </div>
          <label style={sLbl}>Ingredientes (um por linha)</label>
          <textarea style={{ ...sInp, minHeight: 70, resize: "vertical" }} value={newRec.ing} onChange={(e) => setNewRec((p) => ({ ...p, ing: e.target.value }))} />
          <label style={sLbl}>Modo de fazer (um passo por linha)</label>
          <textarea style={{ ...sInp, minHeight: 90, resize: "vertical" }} value={newRec.passos} onChange={(e) => setNewRec((p) => ({ ...p, passos: e.target.value }))} />
          <label style={sLbl}>Dica (opcional)</label><input style={sInp} value={newRec.dica} onChange={(e) => setNewRec((p) => ({ ...p, dica: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={addRec}>+ Adicionar</button>
            <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setAddForm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button style={sBtn(user.cor, true)} onClick={() => setAddForm(true)}>+ Adicionar receita</button>
      )}
    </>
  );
}
