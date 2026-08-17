import SystemPanel from "@/components/SystemPanel";
import { IconStar, IconFlame, IconDumbbell, IconActivity, IconShield, IconApple, IconDroplet } from "@/components/icons";
import { RANKS, type Atributos } from "@/lib/rpg";
import { TEXT, SUB, BORDER, CYAN, RED, GRN, PURP, AMB } from "@/lib/theme";
import type { RPGApi } from "@/lib/useRPG";

interface StatusWindowProps {
  rpg: RPGApi;
  compact?: boolean;
}

const ATRIBUTOS_DEF = [
  { key: "FOR" as const, label: "Força", cor: RED, Icon: IconDumbbell },
  { key: "RES" as const, label: "Resistência", cor: GRN, Icon: IconActivity },
  { key: "DIS" as const, label: "Disciplina", cor: PURP, Icon: IconShield },
  { key: "NUT" as const, label: "Nutrição", cor: AMB, Icon: IconApple },
  { key: "VIT" as const, label: "Vitalidade", cor: CYAN, Icon: IconDroplet },
];

function XPBar({ pct, cor }: { pct: number; cor: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ position: "relative", height: 10, background: "#ffffff10", borderRadius: 2, overflow: "hidden", border: `1px solid ${BORDER}` }}>
      <div className="xp-bar-fill" style={{ width: `${clamped}%`, height: "100%", background: `linear-gradient(90deg, ${cor}99, ${cor})` }}>
        <div
          className="xp-bar-glow"
          style={{ position: "absolute", right: 0, top: -2, bottom: -2, width: 6, background: cor, boxShadow: `0 0 10px 2px ${cor}`, transform: `translateX(${clamped === 0 ? 0 : 3}px)` }}
        />
      </div>
    </div>
  );
}

function AtributoBar({ label, value, cor, Icon }: { label: string; value: number; cor: string; Icon: (p: any) => React.ReactElement }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={12} style={{ color: cor }} />
          <span style={{ fontSize: 10.5, color: SUB, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: TEXT }}>{value}</span>
      </div>
      <div style={{ height: 5, background: "#ffffff0f", borderRadius: 2, overflow: "hidden" }}>
        <div className="xp-bar-fill" style={{ width: `${Math.min(100, value)}%`, height: "100%", background: cor }} />
      </div>
    </div>
  );
}

export default function StatusWindow({ rpg, compact }: StatusWindowProps) {
  const rankDef = RANKS.find((r) => r.key === rpg.rank) || RANKS[0];
  const pct = rpg.xpProximo > 0 ? (rpg.xpAtual / rpg.xpProximo) * 100 : 0;

  return (
    <SystemPanel accentColor={rankDef.color} style={{ padding: compact ? "12px 14px" : "16px 16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 2,
              border: `1px solid ${rankDef.color}88`, color: rankDef.color, fontSize: 11, fontWeight: 800, letterSpacing: 0.8,
            }}
          >
            {rankDef.label}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: TEXT, fontSize: 12.5, fontWeight: 700 }}>
            <IconStar size={13} style={{ color: AMB }} /> Nv. {rpg.nivel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: rpg.ofensiva > 0 ? "#fb923c" : SUB, fontSize: 12, fontWeight: 700 }}>
          <IconFlame size={13} /> {rpg.ofensiva}
        </div>
      </div>

      <div style={{ marginBottom: compact ? 0 : 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 9.5, color: SUB, textTransform: "uppercase", letterSpacing: 0.6 }}>XP</span>
          <span style={{ fontSize: 9.5, color: SUB }}>{rpg.xpAtual} / {rpg.xpProximo}</span>
        </div>
        <XPBar pct={pct} cor={rankDef.color} />
      </div>

      {compact && rpg.nutricaoAbaixoDoMinimo && (
        <div
          className="fade-in-up"
          style={{ marginTop: 12, padding: "9px 11px", borderRadius: 2, border: `1px solid ${AMB}55`, background: `${AMB}12`, fontSize: 11, color: AMB, lineHeight: 1.5 }}
        >
          Hoje ficou abaixo do mínimo seguro de calorias — sem XP de nutrição hoje. Sem culpa: amanhã é um novo dia pra recalibrar.
        </div>
      )}

      {!compact && (
        <div style={{ marginTop: 4 }}>
          {ATRIBUTOS_DEF.map(({ key, label, cor, Icon }) => (
            <AtributoBar key={key} label={label} value={(rpg.atributos as Atributos)[key]} cor={cor} Icon={Icon} />
          ))}
        </div>
      )}
    </SystemPanel>
  );
}
