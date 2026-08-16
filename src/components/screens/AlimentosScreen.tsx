import ScreenHeader from "@/components/ScreenHeader";
import { useFoodCatalog } from "@/lib/useFoodCatalog";
import { IconPlus, IconTrash, IconApple } from "@/components/icons";
import { PURP, SUB, BORDER, TEXT, sCard, sBtn } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";

export default function AlimentosScreen({ data, nav }: ScreenProps) {
  const { userId, user } = data;
  const catalog = useFoodCatalog(userId);

  return (
    <div style={{ minHeight: "100%", paddingBottom: 100 }}>
      <ScreenHeader title="Meus Alimentos" accent="🍎" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <button onClick={() => nav.push("adicionar-alimento")} className="tapable" style={{ ...sBtn(user.cor, true), display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 }}>
          <IconPlus size={15} /> Adicionar alimento
        </button>

        {catalog.alimentos.length === 0 ? (
          <div style={{ ...sCard, padding: 20, textAlign: "center", color: SUB, fontSize: 12 }}>
            <IconApple size={28} style={{ color: SUB, marginBottom: 8 }} />
            <div>Nenhum alimento cadastrado ainda.</div>
            <div style={{ marginTop: 4 }}>Tire uma foto do prato ou do rótulo pra cadastrar rapidinho.</div>
          </div>
        ) : (
          <div style={sCard}>
            {catalog.alimentos.map((a, i) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{a.nome}</div>
                  <div style={{ fontSize: 10.5, color: SUB, marginTop: 2 }}>
                    {a.porcaoDesc} · {a.kcalPorcao} kcal · {a.proteinaPorcao}g prot
                    {a.origem === "foto" && <span style={{ color: PURP }}> · 📷 IA</span>}
                  </div>
                </div>
                <button onClick={() => catalog.delAlimento(a.id)} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 4, flexShrink: 0 }}>
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
