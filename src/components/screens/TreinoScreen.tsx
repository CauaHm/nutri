import { useState } from "react";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ScreenHeader from "@/components/ScreenHeader";
import { IconChevronRight, IconGrip, IconActivity } from "@/components/icons";
import { SUB, BORDER, TEXT, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";
import type { TreinoDia } from "@/lib/defaults";
import type { User } from "@/lib/types";

interface SortableDayProps {
  id: string;
  d: TreinoDia;
  i: number;
  reorder: boolean;
  user: User;
  onOpen: (i: number) => void;
}

function SortableDay({ id, d, i, reorder, user, onOpen }: SortableDayProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <div ref={setNodeRef} style={{ ...style, ...sCard, marginBottom: 9, padding: 0 }} className={isDragging ? undefined : "fade-in-up"}>
      <div
        onClick={() => !reorder && onOpen(i)}
        className={reorder ? undefined : "tapable"}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: reorder ? "default" : "pointer" }}
      >
        {reorder && (
          <div {...attributes} {...listeners} style={{ color: SUB, flexShrink: 0, touchAction: "none", cursor: "grab", padding: 4, margin: -4 }}>
            <IconGrip size={16} />
          </div>
        )}
        <span style={{ fontSize: 22, flexShrink: 0 }}>{d.emoji || "🏋️"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: TEXT }}>{d.dia}</div>
          <div style={{ fontSize: 11, color: SUB }}>{d.tag}</div>
        </div>
        <span style={{ background: `${user.cor}22`, color: user.cor, fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>{d.isCardio ? "CARDIO" : `${d.exercicios.length} ex.`}</span>
        {!reorder && <IconChevronRight size={16} style={{ color: SUB, flexShrink: 0 }} />}
      </div>
    </div>
  );
}

export default function TreinoScreen({ data, nav }: ScreenProps) {
  const { user, treino, saveTreino } = data;
  const [reorder, setReorder] = useState(false);
  const [addForm, setAddForm] = useState(false);
  const [newDia, setNewDia] = useState({ dia: "", tag: "", emoji: "🏋️" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!treino) return null;

  const ids = treino.map((_, i) => `dia-${i}`);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    saveTreino(arrayMove(treino, oldIndex, newIndex));
  };

  const addDiaFn = async () => {
    if (!newDia.dia) return;
    const next = [...treino, { dia: newDia.dia, tag: newDia.tag, emoji: newDia.emoji || "🏋️", isCardio: false, cardio: "", info: "", exercicios: [] }];
    await saveTreino(next);
    setAddForm(false);
    setNewDia({ dia: "", tag: "", emoji: "🏋️" });
  };

  return (
    <div style={{ minHeight: "100%", paddingBottom: 110 }}>
      <ScreenHeader
        title="Treino"
        subtitle={`${treino.length} dias cadastrados`}
        right={
          <button onClick={() => setReorder((r) => !r)} className="tapable" style={{ background: reorder ? `${user.cor}25` : "#ffffff10", border: `1px solid ${reorder ? user.cor : "transparent"}`, borderRadius: 9, padding: "7px 11px", color: reorder ? user.cor : SUB, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {reorder ? "Pronto" : "Reordenar"}
          </button>
        }
      />

      <div style={{ padding: 14 }}>
        <button onClick={() => nav.push("treino-cargas")} className="tapable" style={{ ...sCard, display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", marginBottom: 10, border: `1px solid ${BORDER}`, cursor: "pointer" }}>
          <IconActivity size={18} style={{ color: user.cor }} />
          <span style={{ flex: 1, textAlign: "left", fontWeight: 700, fontSize: 13, color: TEXT }}>Cargas & Recordes</span>
          <IconChevronRight size={16} style={{ color: SUB }} />
        </button>

        <button onClick={() => nav.push("atividade")} className="tapable" style={{ ...sCard, display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", marginBottom: 14, border: `1px solid ${BORDER}`, cursor: "pointer" }}>
          <span style={{ fontSize: 18 }}>🏃</span>
          <span style={{ flex: 1, textAlign: "left", fontWeight: 700, fontSize: 13, color: TEXT }}>Atividade Extra</span>
          <IconChevronRight size={16} style={{ color: SUB }} />
        </button>

        {reorder && <div style={{ color: SUB, fontSize: 11, marginBottom: 10 }}>Segure e arraste pelo ⣿ pra mudar a ordem dos dias.</div>}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {treino.map((d, i) => (
              <SortableDay key={ids[i]} id={ids[i]} d={d} i={i} reorder={reorder} user={user} onOpen={(idx) => nav.push("treino-dia", { dayIndex: idx })} />
            ))}
          </SortableContext>
        </DndContext>

        {addForm ? (
          <div style={{ ...sCard, padding: 14, marginTop: 4 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: TEXT }}>Novo dia de treino</div>
            {([["dia", "Dia da semana (ex: Segunda)"], ["tag", "Tipo (ex: Pernas)"], ["emoji", "Emoji (ex: 🦵)"]] as const).map(([k, l]) => (
              <div key={k}><label style={sLbl}>{l}</label><input style={sInp} value={newDia[k] || ""} onChange={(e) => setNewDia((p) => ({ ...p, [k]: e.target.value }))} placeholder={l} /></div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={{ ...sBtn(user.cor), flex: 1 }} onClick={addDiaFn}>Criar</button>
              <button style={{ ...sBtn("#444"), flex: 1 }} onClick={() => setAddForm(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button style={{ ...sBtn(user.cor, true), marginTop: 4 }} onClick={() => setAddForm(true)}>+ Adicionar dia de treino</button>
        )}
      </div>
    </div>
  );
}
