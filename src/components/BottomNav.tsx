import type { ReactElement } from "react";
import { BORDER, SUB } from "@/lib/theme";
import { IconHome, IconDumbbell, IconApple, IconUser } from "@/components/icons";
import type { IconProps } from "@/components/icons";

interface NavItem {
  key: string;
  label: string;
  Icon: (p: IconProps) => ReactElement;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "inicio", label: "Início", Icon: IconHome },
  { key: "treino", label: "Treino", Icon: IconDumbbell },
  { key: "nutricao", label: "Nutrição", Icon: IconApple },
  { key: "perfil", label: "Perfil", Icon: IconUser },
];

interface BottomNavProps {
  active: string;
  accent: string;
  onChange: (key: string) => void;
}

export default function BottomNav({ active, accent, onChange }: BottomNavProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        background: "rgba(22,13,40,0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: `1px solid ${BORDER}`,
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom,0px)",
      }}
    >
      {NAV_ITEMS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="tapable"
            aria-label={`Ir para ${label}`}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "9px 4px 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isActive ? accent : SUB,
            }}
          >
            <Icon size={22} style={{ opacity: isActive ? 1 : 0.85 }} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
