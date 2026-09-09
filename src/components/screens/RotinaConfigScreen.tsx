import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { CARD2, PINK, GRN, RED, PURP, SUB, BORDER, TEXT, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import { IconPlus, IconTrash, IconCheck } from "@/components/icons";
import { corDaCategoria, CATEGORIAS, META_OFENSIVA_PADRAO, type RotinaTarefa, type RotinaCategoria } from "@/lib/rotina";
import type { ScreenProps } from "@/lib/screenProps";

const DIAS_CURTOS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DIAS_NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function novaTarefa(dono: string): RotinaTarefa {
  return {
    id: `rt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    titulo: "",
    dias: [1, 2, 3, 4, 5],
    inicio: "19:00",
    fim: "",
    categoria: "foco",
    ancora: "",
    minimo: "",
    nota: "",
    essencial: true,
    avisar: false,
    dono,
    ativo: true,
    ordem: Date.now(),
  };
}

export default function RotinaConfigScreen({ data, nav }: ScreenProps) {
  const { rotina, user, outroUser, temParceiro } = data;
  const [editando, setEditando] = useState<RotinaTarefa | null>(null);
  const acento = user.cor || PINK;

  const salvar = async (t: RotinaTarefa) => {
    if (!t.titulo.trim()) return;
    const limpa: RotinaTarefa = {
      ...t,
      titulo: t.titulo.trim(),
      fim: t.fim?.trim() || undefined,
      ancora: t.ancora?.trim() || undefined,
      minimo: t.minimo?.trim() || undefined,
      nota: t.nota?.trim() || undefined,
    };
    const existe = rotina.tarefas.some((x) => x.id === limpa.id);
    const next = existe ? rotina.tarefas.map((x) => (x.id === limpa.id ? limpa : x)) : [...rotina.tarefas, limpa];
    await rotina.salvarTarefas(next);
    // Primeira tarefa criada e o que liga o cronometro dos 60 dias.
    if (!rotina.config.inicio) await rotina.salvarConfig({ inicio: rotina.hoje });
    setEditando(null);
  };

  const excluir = async (id: string) => {
    await rotina.salvarTarefas(rotina.tarefas.filter((x) => x.id !== id));
    setEditando(null);
  };

  const donoLabel = (dono: string) => (dono === "ambos" ? "Os dois" : dono === user._id ? user.nome.split(" ")[0] : outroUser?.nome.split(" ")[0] || "Parceira");

  // ------------------------------------------------------ formulario -----
  if (editando) {
    const t = editando;
    const set = (p: Partial<RotinaTarefa>) => setEditando({ ...t, ...p });
    const toggleDia = (d: number) => set({ dias: t.dias.includes(d) ? t.dias.filter((x) => x !== d) : [...t.dias, d].sort() });

    return (
      <div style={{ paddingBottom: 40 }}>
        <ScreenHeader title={rotina.tarefas.some((x) => x.id === t.id) ? "Editar meta" : "Nova meta"} onBack={() => setEditando(null)} />
        <div style={{ padding: 16 }}>
          <label style={sLbl}>O que é</label>
          <input value={t.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="ex: Bloco de estudo" style={sInp} autoFocus />

          <label style={sLbl}>Dias da semana</label>
          <div style={{ display: "flex", gap: 6 }}>
            {DIAS_CURTOS.map((d, i) => {
              const on = t.dias.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => toggleDia(i)}
                  className="tapable"
                  aria-label={DIAS_NOMES[i]}
                  style={{ flex: 1, minHeight: 40, borderRadius: 9, cursor: "pointer", fontWeight: 800, fontSize: 12, background: on ? acento : CARD2, color: on ? "#0d0118" : SUB, border: `1px solid ${on ? acento : BORDER}` }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={sLbl}>Começa</label>
              <input value={t.inicio} onChange={(e) => set({ inicio: e.target.value })} placeholder="18:30" style={sInp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={sLbl}>Termina (opcional)</label>
              <input value={t.fim || ""} onChange={(e) => set({ fim: e.target.value })} placeholder="21:00" style={sInp} />
            </div>
          </div>

          <label style={sLbl}>Categoria</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(Object.keys(CATEGORIAS) as RotinaCategoria[]).map((c) => {
              const on = t.categoria === c;
              const cor = corDaCategoria(c);
              return (
                <button key={c} onClick={() => set({ categoria: c })} className="tapable" style={{ padding: "8px 13px", minHeight: 38, borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 12, background: on ? `${cor}22` : CARD2, color: on ? cor : SUB, border: `1px solid ${on ? cor : BORDER}` }}>
                  {CATEGORIAS[c].label}
                </button>
              );
            })}
          </div>

          <label style={sLbl}>Âncora — “quando eu X, eu vou Y”</label>
          <input value={t.ancora || ""} onChange={(e) => set({ ancora: e.target.value })} placeholder="Quando eu chegar em casa, eu sento e abro o material." style={sInp} />
          <div style={{ fontSize: 10, color: SUB, marginTop: 4, lineHeight: 1.45 }}>
            É a frase que tira a decisão da força de vontade e passa pro ambiente. Vale escrever.
          </div>

          <label style={sLbl}>Versão mínima (dia ruim)</label>
          <input value={t.minimo || ""} onChange={(e) => set({ minimo: e.target.value })} placeholder="5 minutos. Só abrir e começar." style={sInp} />
          <div style={{ fontSize: 10, color: SUB, marginTop: 4, lineHeight: 1.45 }}>
            Concluir pelo mínimo conta como feito e mantém a ofensiva viva.
          </div>

          <label style={sLbl}>Regra / observação</label>
          <input value={t.nota || ""} onChange={(e) => set({ nota: e.target.value })} placeholder="Celular em outro cômodo. Nada de reels." style={sInp} />

          <label style={sLbl}>De quem é</label>
          <div style={{ display: "flex", gap: 6 }}>
            {["ambos", user._id, ...(outroUser ? [outroUser._id] : [])].map((d) => {
              const on = t.dono === d;
              return (
                <button key={d} onClick={() => set({ dono: d })} className="tapable" style={{ flex: 1, minHeight: 40, borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 11.5, background: on ? `${PURP}25` : CARD2, color: on ? PURP : SUB, border: `1px solid ${on ? PURP : BORDER}` }}>
                  {donoLabel(d)}
                </button>
              );
            })}
          </div>

          <div style={{ ...sCard, padding: 4, marginTop: 16 }}>
            {[
              { k: "essencial" as const, on: t.essencial, titulo: "Segura o fechamento do dia", desc: "Desligue para recompensas (lazer, jantar) — elas ficam no dia, mas não travam a ofensiva." },
              { k: "avisar" as const, on: t.avisar, titulo: `Avisar ${outroUser?.nome.split(" ")[0] || "sua dupla"} ao concluir`, desc: "Manda uma notificação na hora em que você marcar como feito." },
            ].map(({ k, on, titulo, desc }) => (
              <button key={k} onClick={() => set({ [k]: !on } as Partial<RotinaTarefa>)} className="tapable" style={{ width: "100%", textAlign: "left", display: "flex", gap: 11, alignItems: "flex-start", padding: 11, background: "none", border: "none", cursor: "pointer" }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 1, background: on ? GRN : "transparent", border: on ? "none" : `1.5px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#0d0118" }}>
                  {on && <IconCheck size={14} />}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT }}>{titulo}</div>
                  <div style={{ fontSize: 10.5, color: SUB, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => salvar(t)} className="tapable" style={{ ...sBtn(acento, true), minHeight: 46, marginTop: 18, fontSize: 13.5 }}>
            Salvar meta
          </button>
          {rotina.tarefas.some((x) => x.id === t.id) && (
            <button onClick={() => excluir(t.id)} className="tapable" style={{ width: "100%", marginTop: 8, background: `${RED}14`, border: `1px solid ${RED}33`, borderRadius: 10, minHeight: 42, color: RED, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <IconTrash size={14} /> Excluir
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------- lista ------
  const porDia = DIAS_NOMES.map((nome, i) => ({
    nome,
    idx: i,
    tarefas: rotina.tarefas
      .filter((t) => t.dias.includes(i))
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
  })).filter((g) => g.tarefas.length > 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      <ScreenHeader
        title="Montar a rotina"
        subtitle={`${rotina.tarefas.length} metas · meta de ${rotina.config.meta} dias`}
        onBack={nav.pop}
        right={
          <button onClick={() => setEditando(novaTarefa("ambos"))} className="tapable" aria-label="Nova meta" style={{ background: `${acento}22`, border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: acento, cursor: "pointer" }}>
            <IconPlus size={18} />
          </button>
        }
      />

      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ ...sCard, padding: 13 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: TEXT, marginBottom: 5 }}>A contagem dos 60 dias</div>
          <div style={{ fontSize: 11, color: SUB, lineHeight: 1.5 }}>
            {rotina.config.inicio
              ? <>Começou em <b style={{ color: TEXT }}>{rotina.config.inicio}</b>. A ofensiva conta os dias em que todas as metas essenciais foram fechadas.</>
              : <>Ainda não começou. A primeira meta salva liga o cronômetro.</>}
          </div>
          {rotina.config.inicio && (
            <button
              onClick={() => rotina.salvarConfig({ inicio: rotina.hoje })}
              className="tapable"
              style={{ marginTop: 10, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 9, padding: "8px 12px", minHeight: 38, color: SUB, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}
            >
              Recomeçar a contagem hoje
            </button>
          )}
          {rotina.config.meta !== META_OFENSIVA_PADRAO && (
            <div style={{ fontSize: 10, color: SUB, marginTop: 8 }}>Meta atual: {rotina.config.meta} dias.</div>
          )}
        </div>
      </div>

      {porDia.map(({ nome, idx, tarefas }) => (
        <div key={idx} style={{ padding: "16px 16px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: SUB, marginBottom: 7, paddingLeft: 2 }}>{nome}</div>
          <div style={{ ...sCard, padding: 0 }}>
            {tarefas.map((t, i) => {
              const cor = corDaCategoria(t.categoria);
              return (
                <button
                  key={t.id}
                  onClick={() => setEditando({ ...t, fim: t.fim || "", ancora: t.ancora || "", minimo: t.minimo || "", nota: t.nota || "" })}
                  className="tapable"
                  style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "none", border: "none", borderTop: i === 0 ? "none" : `1px solid ${BORDER}`, cursor: "pointer" }}
                >
                  <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.titulo}</div>
                    <div style={{ fontSize: 10, color: SUB, marginTop: 2 }}>
                      {t.fim ? `${t.inicio}–${t.fim}` : t.inicio} · {donoLabel(t.dono)}
                      {!t.essencial && " · recompensa"}
                      {t.avisar && temParceiro && " · avisa"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ padding: "18px 16px 0" }}>
        <button onClick={() => setEditando(novaTarefa("ambos"))} className="tapable" style={{ ...sBtn(acento, true), minHeight: 46, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <IconPlus size={16} /> Nova meta
        </button>
      </div>
    </div>
  );
}
