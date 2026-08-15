"use client";
import ScreenHeader from "@/components/ScreenHeader";
import { IconFlame, IconCalendar, IconActivity, IconBook, IconShoppingBag, IconApple, IconScale, IconChevronRight } from "@/components/icons";
import { PINK, CYAN, GRN, AMB, PURP, SUB, TEXT, sCard } from "@/lib/theme";

const CARDS = [
  { screen: "refeicoes-hoje", title: "Refeições de Hoje", desc: "Registrar o que você comeu", Icon: IconFlame, color: PINK },
  { screen: "alimentos", title: "Meus Alimentos", desc: "Cadastrar por foto ou à mão", Icon: IconApple, color: "#f472b6" },
  { screen: "refeicoes-config", title: "Configurar Refeições", desc: "Horários e sugestões do dia", Icon: IconCalendar, color: AMB },
  { screen: "composicao", title: "Composição Corporal", desc: "Medidas, % gordura, macros e plano", Icon: IconActivity, color: PURP },
  { screen: "comparativo", title: "Comparativo", desc: "Você x seu parceiro de treino", Icon: IconScale, color: "#60a5fa" },
  { screen: "historico", title: "Histórico", desc: "Calorias e água por semana", Icon: IconCalendar, color: CYAN },
  { screen: "receitas", title: "Receitas", desc: "Ideias rápidas e baratas", Icon: IconBook, color: GRN },
  { screen: "compras", title: "Lista de Compras", desc: "O que comprar essa semana", Icon: IconShoppingBag, color: "#fb923c" },
];

export default function NutricaoScreen({ nav }) {
  return (
    <div style={{ minHeight: "100%", paddingBottom: 110 }}>
      <ScreenHeader title="Nutrição" subtitle="Alimentação, corpo e planejamento" />
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {CARDS.map(({ screen, title, desc, Icon, color }) => (
          <button key={screen} onClick={() => nav.push(screen)} className="tapable fade-in-up" style={{ ...sCard, display: "flex", alignItems: "center", gap: 13, width: "100%", padding: 15, border: "none", cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={21} style={{ color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: TEXT }}>{title}</div>
              <div style={{ fontSize: 11, color: SUB, marginTop: 1 }}>{desc}</div>
            </div>
            <IconChevronRight size={17} style={{ color: SUB, flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
