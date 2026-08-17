import { useMemo, useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { todayStr } from "@/lib/dates";
import { itensDaRefeicao, somaItens, type MealItem } from "@/lib/points";
import { useFoodCatalog, type Alimento } from "@/lib/useFoodCatalog";
import { useOfflineQueueSnapshot } from "@/lib/useOfflineQueueSnapshot";
import { IconPlus, IconTrash, IconBook, IconChevronRight } from "@/components/icons";
import { PINK, PURP, GRN, AMB, SUB, BORDER, TEXT, CARD2, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";
import type { RefeicaoConfig } from "@/lib/defaults";

const EMPTY_PENDING_SET: ReadonlySet<string | number> = new Set();

interface MealRowProps {
  meal: RefeicaoConfig;
  itens: MealItem[];
  onAdd: (item: Omit<MealItem, "id">) => void;
  onRemove: (itemId: number | string) => void;
  catalog: Alimento[];
  pendingIds: ReadonlySet<string | number>;
}

function MealRow({ meal, itens, onAdd, onRemove, catalog, pendingIds }: MealRowProps) {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<"catalogo" | "livre">("catalogo");
  const [alimentoId, setAlimentoId] = useState("");
  const [qty, setQty] = useState("1");
  const [livre, setLivre] = useState({ nome: "", kcal: "", proteina: "" });

  const totals = somaItens(itens);

  const addCatalogo = () => {
    const alimento = catalog.find((a) => String(a.id) === alimentoId);
    if (!alimento) return;
    const q = Number(qty) || 1;
    onAdd({
      nome: `${alimento.nome}${q !== 1 ? ` (${q}x)` : ""}`,
      kcal: Math.round(alimento.kcalPorcao * q),
      proteina: Math.round(alimento.proteinaPorcao * q * 10) / 10,
      qty: q,
    });
    setQty("1");
  };

  const addLivre = () => {
    if (!livre.nome || !livre.kcal) return;
    onAdd({ nome: livre.nome, kcal: Number(livre.kcal), proteina: Number(livre.proteina) || 0, qty: 1 });
    setLivre({ nome: "", kcal: "", proteina: "" });
  };

  return (
    <div style={{ borderTop: `1px solid ${BORDER}` }}>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{meal.emoji} {meal.nome}</div>
            <div style={{ fontSize: 10, color: SUB }}>{meal.horario}{meal.kcalAlvo ? ` · alvo ~${meal.kcalAlvo} kcal` : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: PINK }}>{Math.round(totals.kcal)} kcal</div>
            {totals.proteina > 0 && <div style={{ fontSize: 10, color: SUB }}>{Math.round(totals.proteina)}g prot</div>}
          </div>
        </div>

        {itens.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {itens.map((it) => (
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, background: "#ffffff06", borderRadius: 7, padding: "5px 8px" }}>
                <span style={{ color: TEXT, display: "flex", alignItems: "center", gap: 5 }}>
                  {pendingIds.has(it.id) && (
                    <span title="Ainda não sincronizado" style={{ width: 6, height: 6, borderRadius: "50%", background: AMB, flexShrink: 0 }} />
                  )}
                  {it.nome} <span style={{ color: SUB }}>· {it.kcal}kcal{it.proteina ? ` · ${it.proteina}g prot` : ""}</span>
                </span>
                <button onClick={() => onRemove(it.id)} style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 2, flexShrink: 0 }}><IconTrash size={13} /></button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setOpen((o) => !o)} className="tapable" style={{ marginTop: 9, width: "100%", background: "#ffffff08", border: "none", borderRadius: 8, color: PURP, fontSize: 11.5, fontWeight: 700, padding: "7px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <IconPlus size={13} /> Adicionar alimento
        </button>

        {open && (
          <div style={{ marginTop: 8, background: CARD2, borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {([["catalogo", "Meus alimentos"], ["livre", "Lançamento livre"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setModo(k)} style={{ flex: 1, padding: "6px 4px", background: modo === k ? `${PURP}25` : "transparent", border: `1px solid ${modo === k ? PURP : BORDER}`, borderRadius: 7, color: modo === k ? PURP : SUB, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
            {modo === "catalogo" ? (
              catalog.length === 0 ? (
                <div style={{ fontSize: 11, color: SUB, textAlign: "center", padding: "6px 0" }}>Nenhum alimento cadastrado ainda.</div>
              ) : (
                <>
                  <select style={sInp} value={alimentoId} onChange={(e) => setAlimentoId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {catalog.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.porcaoDesc || "1 porção"})</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input style={{ ...sInp, flex: 1 }} type="number" step="0.5" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="qtd (porções)" />
                    <button onClick={addCatalogo} style={{ ...sBtn(GRN), flexShrink: 0 }}>Adicionar</button>
                  </div>
                </>
              )
            ) : (
              <>
                <input style={sInp} value={livre.nome} onChange={(e) => setLivre((p) => ({ ...p, nome: e.target.value }))} placeholder="O que você comeu" />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input style={{ ...sInp, flex: 1 }} type="number" value={livre.kcal} onChange={(e) => setLivre((p) => ({ ...p, kcal: e.target.value }))} placeholder="kcal" />
                  <input style={{ ...sInp, flex: 1 }} type="number" value={livre.proteina} onChange={(e) => setLivre((p) => ({ ...p, proteina: e.target.value }))} placeholder="proteína (g)" />
                  <button onClick={addLivre} style={{ ...sBtn(GRN), flexShrink: 0 }}>+</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RefeicoesHojeScreen({ data, nav }: ScreenProps) {
  const { userId, user, refeicoesCfg, mealLog, addFoodToMeal, removeFoodFromMeal } = data;
  const catalog = useFoodCatalog(userId);
  const [dateSel, setDateSel] = useState(todayStr());
  const queue = useOfflineQueueSnapshot();

  const diaLog = mealLog[dateSel] || {};

  // ids de itens ainda na fila offline (intencao addFood pendente) pra esta
  // data — usado so pro indicador visual de pendencia (bolinha), agrupado
  // por refeicao pra nao recalcular em cada MealRow.
  const pendingByMeal = useMemo(() => {
    const map = new Map<string, Set<string | number>>();
    for (const q of queue.items) {
      if (q.payload.kind !== "intent") continue;
      const intent = q.payload.intent;
      if (intent.tipo !== "addFood" || intent.data !== dateSel) continue;
      if (!map.has(intent.mealId)) map.set(intent.mealId, new Set());
      map.get(intent.mealId)!.add(intent.item.id);
    }
    return map;
  }, [queue.items, dateSel]);

  return (
    <div style={{ minHeight: "100%", paddingBottom: 60 }}>
      <ScreenHeader title="Refeições" accent="🔥" subtitle={dateSel} onBack={nav.pop} right={
        <button onClick={() => nav.push("alimentos")} className="tapable" style={{ background: "#ffffff10", border: "none", borderRadius: 9, padding: "7px 10px", color: TEXT, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IconBook size={14} /> Alimentos
        </button>
      } />
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <label style={{ ...sLbl, margin: 0 }}>Data</label>
          <input style={{ ...sInp, maxWidth: 130 }} value={dateSel} onChange={(e) => setDateSel(e.target.value)} placeholder="DD/MM/AAAA" />
          {dateSel !== todayStr() && <button onClick={() => setDateSel(todayStr())} className="tapable" style={{ background: "none", border: "none", color: PURP, fontSize: 11, cursor: "pointer" }}>hoje</button>}
        </div>

        {(!refeicoesCfg || refeicoesCfg.length === 0) ? (
          <div style={{ ...sCard, padding: 18, textAlign: "center" }}>
            <div style={{ color: SUB, fontSize: 12, marginBottom: 10 }}>Nenhuma refeição configurada ainda.</div>
            <button onClick={() => nav.push("refeicoes-config")} className="tapable" style={{ ...sBtn(user.cor), display: "inline-flex", alignItems: "center", gap: 5 }}>Configurar refeições <IconChevronRight size={14} /></button>
          </div>
        ) : (
          <div style={sCard}>
            {refeicoesCfg.map((meal) => (
              <MealRow
                key={meal.id}
                meal={meal}
                itens={itensDaRefeicao(diaLog[meal.id])}
                catalog={catalog.alimentos}
                onAdd={(item) => addFoodToMeal(dateSel, meal.id, item)}
                onRemove={(itemId) => removeFoodFromMeal(dateSel, meal.id, itemId)}
                pendingIds={pendingByMeal.get(meal.id) || EMPTY_PENDING_SET}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
