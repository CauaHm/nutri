import { useState } from "react";
import { CARD, GRN, PINK, SUB, BORDER, corDeTexto, sInp, sLbl, sBtn } from "@/lib/theme";
import type { TabProps } from "@/lib/screenProps";
import type { CompraItem } from "@/lib/defaults";

interface FormState {
  id?: string;
  item: string;
  qtd: string;
  preco: string;
  cat: string;
}

const EMPTY: FormState = { item: "", qtd: "", preco: "", cat: "" };

export default function ComprasTab({ data }: TabProps) {
  const { user, compras, saveCompras } = data;
  const [addForm, setAddForm] = useState(false);
  const [newItem, setNewItem] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<FormState>(EMPTY);

  const cats = [...new Set(compras.map((c) => c.cat).filter(Boolean))];
  const total = compras.reduce((s, c) => s + (Number(c.preco) || 0), 0);

  const addItem = async () => {
    if (!newItem.item) return;
    const c: CompraItem = { id: `c${Date.now()}`, item: newItem.item, qtd: newItem.qtd, preco: Number(newItem.preco) || 0, cat: newItem.cat || "Outro" };
    await saveCompras([...compras, c]);
    setAddForm(false);
    setNewItem(EMPTY);
  };
  const delItem = async (id: string) => saveCompras(compras.filter((c) => c.id !== id));
  const startEdit = (c: CompraItem) => { setEditId(c.id); setEditVal({ ...c, preco: String(c.preco) }); };
  const confirmEdit = async () => {
    const next = compras.map((c) => (c.id === editId ? { ...c, item: editVal.item, qtd: editVal.qtd, preco: Number(editVal.preco) || 0, cat: editVal.cat } : c));
    await saveCompras(next);
    setEditId(null);
  };

  return (
    <>
      <div style={{ background: `${GRN}12`, border: `1px solid ${GRN}40`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: GRN, marginBottom: 4 }}>🛒 Lista Semanal</div>
        <div style={{ fontSize: 11, color: "#86efac" }}>Editável — adicione, edite ou remova itens à vontade.</div>
      </div>
      {cats.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {cats.map((cat) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: SUB }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: corDeTexto(cat) }} />{cat}
            </div>
          ))}
        </div>
      )}
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 14 }}>
        <div style={{ padding: "0 14px" }}>
          {compras.map((c) => (
            editId === c.id ? (
              <div key={c.id} style={{ padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                  <input style={sInp} value={editVal.item} onChange={(e) => setEditVal((p) => ({ ...p, item: e.target.value }))} placeholder="Item" />
                  <input style={sInp} value={editVal.qtd} onChange={(e) => setEditVal((p) => ({ ...p, qtd: e.target.value }))} placeholder="Qtd" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <input style={sInp} type="number" value={editVal.preco} onChange={(e) => setEditVal((p) => ({ ...p, preco: e.target.value }))} placeholder="Preço" />
                  <input style={sInp} value={editVal.cat} onChange={(e) => setEditVal((p) => ({ ...p, cat: e.target.value }))} placeholder="Categoria" />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={confirmEdit}>Salvar</button>
                  <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setEditId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: corDeTexto(c.cat), flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{c.item}</div><div style={{ fontSize: 10, color: SUB }}>{c.qtd}</div></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, color: PINK, fontSize: 14 }}>~R${c.preco}</span>
                  <button onClick={() => startEdit(c)} style={{ background: "none", border: "none", color: SUB, cursor: "pointer" }}>✏️</button>
                  <button onClick={() => delItem(c.id)} style={{ background: "none", border: "none", color: SUB, cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            )
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Total semanal</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: PINK }}>~R${total}</span>
          </div>
        </div>
      </div>
      {addForm ? (
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Novo item</div>
          <label style={sLbl}>Item</label><input style={sInp} value={newItem.item} onChange={(e) => setNewItem((p) => ({ ...p, item: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><label style={sLbl}>Quantidade</label><input style={sInp} value={newItem.qtd} onChange={(e) => setNewItem((p) => ({ ...p, qtd: e.target.value }))} placeholder="1 kg" /></div>
            <div><label style={sLbl}>Preço (R$)</label><input style={sInp} type="number" value={newItem.preco} onChange={(e) => setNewItem((p) => ({ ...p, preco: e.target.value }))} /></div>
          </div>
          <label style={sLbl}>Categoria</label><input style={sInp} value={newItem.cat} onChange={(e) => setNewItem((p) => ({ ...p, cat: e.target.value }))} placeholder="Proteína, Vegetal..." />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={addItem}>+ Adicionar</button>
            <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setAddForm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button style={sBtn(user.cor, true)} onClick={() => setAddForm(true)}>+ Adicionar item</button>
      )}
    </>
  );
}
