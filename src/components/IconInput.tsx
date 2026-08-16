import type { CSSProperties, InputHTMLAttributes, ReactElement, ReactNode } from "react";
import { SUB } from "@/lib/theme";
import type { IconProps } from "@/components/icons";

// Campo com icone embutido, sem label separada em cima — pensado pra telas
// densas (login/cadastro, ações rápidas) onde label + input empilhados
// ocupam espaço e peso visual demais no mobile.

interface IconInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: (p: IconProps) => ReactElement;
  right?: ReactNode;
  style?: CSSProperties;
}

export default function IconInput({ icon: Icon, right, style, ...props }: IconInputProps) {
  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: SUB, display: "flex", pointerEvents: "none" }}>
        <Icon size={16} />
      </div>
      <input
        {...props}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#1e1035",
          border: "1px solid #2a1a45",
          borderRadius: 12,
          padding: `12px ${right ? 42 : 14}px 12px 38px`,
          color: "#ede9f6",
          fontSize: 14,
          minHeight: 46,
          ...style,
        }}
      />
      {right && <div style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)" }}>{right}</div>}
    </div>
  );
}
