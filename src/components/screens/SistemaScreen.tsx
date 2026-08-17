import ScreenHeader from "@/components/ScreenHeader";
import StatusWindow from "@/components/StatusWindow";
import SystemPanel from "@/components/SystemPanel";
import XPToast from "@/components/XPToast";
import {
  IconCheck, IconDumbbell, IconShield, IconApple, IconDroplet, IconZap,
  IconTarget, IconCrown, IconAward, IconTrophy,
} from "@/components/icons";
import { TITULOS, RANKS, type TituloKey } from "@/lib/rpg";
import { daysBetween, todayStr } from "@/lib/dates";
import { CARD2, TEXT, SUB, BORDER, CYAN, GRN, AMB, PURP, sCard } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";
import type { MissaoInstance } from "@/lib/missoes";

const MISSAO_ICON: Record<MissaoInstance["tipo"], (p: any) => React.ReactElement> = {
  treino: IconDumbbell,
  recuperacao: IconShield,
  nutricao: IconApple,
  agua: IconDroplet,
  bonus: IconZap,
};

function MissaoRow({ m }: { m: MissaoInstance }) {
  const Icon = MISSAO_ICON[m.tipo];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${BORDER}` }}>
      <div className={m.cumprida ? "mission-check-pulse" : undefined} style={{ width: 30, height: 30, borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${m.cumprida ? GRN : BORDER}`, background: m.cumprida ? `${GRN}1f` : "transparent", color: m.cumprida ? GRN : SUB }}>
        {m.cumprida ? <IconCheck size={15} /> : <Icon size={14} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: m.cumprida ? TEXT : TEXT, textDecoration: m.cumprida && m.xp === 0 ? "none" : undefined }}>{m.titulo}</div>
        <div style={{ fontSize: 10.5, color: SUB, marginTop: 1, lineHeight: 1.4 }}>{m.descricao}</div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: m.cumprida ? GRN : SUB, flexShrink: 0 }}>+{m.xp}</div>
    </div>
  );
}

export default function SistemaScreen({ data, nav }: ScreenProps) {
  const { rpg } = data;
  const today = todayStr();

  const rankDef = RANKS.find((r) => r.key === rpg.rank) || RANKS[0];

  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="O Sistema" accent="🖥️" onBack={nav.pop} />
      <XPToast entries={rpg.toasts} onDone={rpg.dismissToast} />

      <div style={{ padding: 14 }}>
        <div style={{ marginBottom: 14 }}>
          <StatusWindow rpg={rpg} />
        </div>

        {/* Missões de hoje */}
        <SystemPanel accentColor={rankDef.color} style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: TEXT, letterSpacing: 0.4 }}>MISSÕES DE HOJE</span>
            <span style={{ fontSize: 10, color: SUB }}>{rpg.missoesHoje.filter((m) => m.cumprida).length}/{rpg.missoesHoje.length}</span>
          </div>

          {rpg.redencaoAtiva && (
            <div style={{ marginTop: 8, padding: "9px 11px", borderRadius: 2, border: `1px solid ${PURP}55`, background: `${PURP}12`, fontSize: 11, color: TEXT, lineHeight: 1.5 }}>
              <b style={{ color: PURP }}>Missão de Redenção ativa</b> — ontem ficou zerado, e tudo bem. Hoje vale o dobro de XP. Se foi por doença ou lesão, pausar continua sendo a decisão certa — isso aqui é só um empurrão pra retomar no seu ritmo, não uma cobrança.
            </div>
          )}

          {!rpg.redencaoAtiva && !rpg.protetorDisponivel && (
            <div style={{ marginTop: 8, fontSize: 10.5, color: SUB, lineHeight: 1.4 }}>
              Seu protetor de ofensiva foi usado recentemente — ele recarrega depois de 14 dias limpos seguidos.
            </div>
          )}

          <div>
            {rpg.missoesHoje.map((m) => (
              <MissaoRow key={m.id} m={m} />
            ))}
          </div>
        </SystemPanel>

        {/* Raid da semana */}
        {rpg.raidDaSemana ? (
          <SystemPanel accentColor={CYAN} style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <IconTarget size={15} style={{ color: CYAN }} />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: TEXT }}>RAID: {rpg.raidDaSemana.nome.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 11, color: SUB, lineHeight: 1.5, marginBottom: 10 }}>{rpg.raidDaSemana.descricao}</div>
            <div style={{ height: 8, background: "#ffffff10", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
              <div className="xp-bar-fill" style={{ width: `${Math.min(100, (rpg.raidDaSemana.progresso / rpg.raidDaSemana.alvo) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${CYAN}99, ${CYAN})` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: SUB }}>
              <span>{rpg.raidDaSemana.progresso} / {rpg.raidDaSemana.alvo} missões combinadas</span>
              {rpg.raidDaSemana.concluida ? <span style={{ color: GRN, fontWeight: 700 }}>Concluído — +{rpg.raidDaSemana.recompensaXp} XP</span> : <span>recompensa: {rpg.raidDaSemana.recompensaXp} XP</span>}
            </div>
            {rpg.raidParceiro?.ready && (
              <div style={{ fontSize: 10, color: SUB, marginTop: 6 }}>Contribuição do parceiro essa semana: {rpg.raidParceiro.missoesEstaSemanaConcluidas} missões.</div>
            )}
          </SystemPanel>
        ) : (
          <div style={{ ...sCard, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.5 }}>Convide um parceiro pra desbloquear os raids semanais cooperativos.</div>
          </div>
        )}

        {/* Teste de ascensão */}
        {rpg.testeAscensao && (
          <SystemPanel accentColor={AMB} style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <IconCrown size={15} style={{ color: AMB }} />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: TEXT }}>TESTE DE ASCENSÃO — RANK {rpg.testeAscensao.rankAlvo}</span>
            </div>
            <div style={{ fontSize: 11, color: SUB, marginBottom: 8 }}>
              Prazo: {Math.max(0, daysBetween(today, rpg.testeAscensao.expiraEm))} dia(s) restante(s).
            </div>
            {rpg.testeAscensao.criterios.map((c) => (
              <div key={c.tipo} style={{ fontSize: 11.5, color: TEXT, padding: "4px 0" }}>• {c.label}</div>
            ))}
          </SystemPanel>
        )}

        {!rpg.testeAscensao && rpg.ultimoResultadoAscensao && (
          <div style={{ ...sCard, padding: 14, marginBottom: 14, border: `1px solid ${rpg.ultimoResultadoAscensao.resultado === "sucesso" ? GRN : BORDER}` }}>
            {rpg.ultimoResultadoAscensao.resultado === "sucesso" ? (
              <div style={{ fontSize: 12, color: GRN, fontWeight: 700 }}>Ascensão pro Rank {rpg.ultimoResultadoAscensao.rankAlvo} concluída — parabéns.</div>
            ) : (
              <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.5 }}>
                O teste pro Rank {rpg.ultimoResultadoAscensao.rankAlvo} não fechou dessa vez — sem problema nenhum, o rank atual continua exatamente onde estava. Assim que der, um novo teste é gerado automaticamente. Tente de novo quando fizer sentido pra você.
              </div>
            )}
          </div>
        )}

        {/* Galeria de títulos */}
        <SystemPanel accentColor={PURP} style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <IconTrophy size={15} style={{ color: PURP }} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: TEXT }}>TÍTULOS</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {TITULOS.map((t) => {
              const desbloqueado = rpg.titulosDesbloqueados.includes(t.key as TituloKey);
              return (
                <div
                  key={t.key}
                  style={{
                    background: CARD2, borderRadius: 2, padding: "10px 10px", border: `1px solid ${desbloqueado ? `${AMB}55` : BORDER}`,
                    opacity: desbloqueado ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <IconAward size={13} style={{ color: desbloqueado ? AMB : SUB, filter: desbloqueado ? "none" : "grayscale(1)" }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: desbloqueado ? TEXT : SUB, letterSpacing: 0.3 }}>{desbloqueado ? t.nome : "???"}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: SUB, lineHeight: 1.4 }}>{t.descricao}</div>
                </div>
              );
            })}
          </div>
        </SystemPanel>
      </div>
    </div>
  );
}
