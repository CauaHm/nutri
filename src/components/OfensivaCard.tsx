import { CARD2, PINK, GRN, AMB, RED, PURP, SUB, BORDER, TEXT, sCard } from "@/lib/theme";
import { IconStreak, IconShield, IconTarget } from "@/components/icons";
import type { Ofensiva, ResumoDia } from "@/lib/rotina";

// O "X na parede" do protocolo, em pixel: a corrente de dias fechados
// precisa ser a primeira coisa que aparece e a mais facil de ler. O
// resultado real do estudo/treino demora meses; essa grade e a recompensa
// imediata que segura o loop enquanto isso.

const CELULA = 13;
const GAP = 4;

function corDoDia(r: ResumoDia | null, acento: string): string {
  if (!r) return "#ffffff08";
  switch (r.status) {
    case "fechado": return acento;
    case "parcial": return `${AMB}55`;
    case "falhou": return `${RED}33`;
    default: return "#ffffff08";
  }
}

interface GradeProps {
  serie: ResumoDia[];
  meta: number;
  acento: string;
}

/** Grade dos ultimos `meta` dias — mais antigo em cima/esquerda, hoje no fim. */
function Grade({ serie, meta, acento }: GradeProps) {
  // serie vem com hoje no indice 0; a grade le no sentido do tempo.
  const dias = serie.slice(0, meta).reverse();
  const vazios = Math.max(0, meta - dias.length);
  const celulas: (ResumoDia | null)[] = [...Array(vazios).fill(null), ...dias];

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(10, ${CELULA}px)`, gap: GAP, justifyContent: "center" }}>
      {celulas.map((r, i) => {
        const ehHoje = i === celulas.length - 1 && !!r;
        return (
          <div
            key={r?.data || `vazio-${i}`}
            title={r ? `${r.data} — ${r.essenciaisFeitos}/${r.essenciaisTotal}` : "ainda não chegou"}
            style={{
              width: CELULA,
              height: CELULA,
              borderRadius: 3.5,
              background: corDoDia(r, acento),
              border: ehHoje ? `1.5px solid ${TEXT}` : r?.status === "falhou" ? `1px solid ${RED}44` : "1px solid transparent",
              boxShadow: r?.status === "fechado" ? `0 0 8px -2px ${acento}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

interface TileProps {
  label: string;
  valor: number;
  acento: string;
  icone: "chama" | "alvo";
  sub?: string;
}

function Tile({ label, valor, acento, icone, sub }: TileProps) {
  return (
    <div style={{ flex: 1, background: CARD2, borderRadius: 12, border: `1px solid ${BORDER}`, padding: "11px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: acento, marginBottom: 2 }}>
        {icone === "chama" ? <IconStreak size={14} /> : <IconTarget size={14} />}
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: SUB }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 27, fontWeight: 800, color: TEXT, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{valor}</span>
        <span style={{ fontSize: 11, color: SUB, fontWeight: 600 }}>{valor === 1 ? "dia" : "dias"}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

interface Props {
  ofensiva: Ofensiva;
  ofensivaDupla: Ofensiva | null;
  serie: ResumoDia[];
  serieDupla: ResumoDia[];
  acento: string;
  nomeParceiro?: string | null;
}

export default function OfensivaCard({ ofensiva, ofensivaDupla, serie, serieDupla, acento, nomeParceiro }: Props) {
  const { atual, recorde, meta, faltam, emRisco, perdoados, hojeFechado } = ofensiva;
  const pct = Math.min(100, (atual / meta) * 100);
  // 21 dias = o ponto do protocolo onde o gatilho comeca a puxar sozinho.
  const marcoPct = Math.min(100, (21 / meta) * 100);

  return (
    <div style={{ ...sCard, padding: 14 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Tile
          label="Sua ofensiva"
          valor={atual}
          acento={acento}
          icone="chama"
          sub={recorde > atual ? `recorde: ${recorde}` : atual > 0 ? "seu recorde é agora" : "comece hoje"}
        />
        {ofensivaDupla && (
          <Tile
            label="Da dupla"
            valor={ofensivaDupla.atual}
            acento={GRN}
            icone="alvo"
            sub={`só conta quando os dois fecham`}
          />
        )}
      </div>

      {/* --- barra dos 60 dias, com o marco da semana 3 --- */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
          <span style={{ fontSize: 10.5, color: SUB, fontWeight: 700 }}>
            {atual} de {meta} dias
          </span>
          <span style={{ fontSize: 10.5, color: faltam === 0 ? GRN : SUB, fontWeight: 700 }}>
            {faltam === 0 ? "meta batida 🏁" : `faltam ${faltam}`}
          </span>
        </div>
        <div style={{ position: "relative", height: 8, background: CARD2, borderRadius: 99, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${acento}, ${PURP})`, borderRadius: 99, transition: "width 500ms cubic-bezier(.22,.8,.3,1)" }} />
          <div style={{ position: "absolute", left: `${marcoPct}%`, top: -1, bottom: -1, width: 2, background: atual >= 21 ? "#ffffff55" : "#ffffff22" }} />
        </div>
        <div style={{ fontSize: 9.5, color: SUB, marginTop: 4 }}>
          {atual >= 21
            ? "Passou da semana 3 — é aqui que o gatilho começa a puxar sozinho."
            : `A marca dos 21 dias é onde o hábito começa a puxar sozinho. Faltam ${Math.max(0, 21 - atual)}.`}
        </div>
      </div>

      {/* --- a grade: um quadrado por dia --- */}
      <Grade serie={serie} meta={meta} acento={acento} />

      {ofensivaDupla && serieDupla.length > 0 && (
        <>
          <div style={{ fontSize: 9.5, color: SUB, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 6px", textAlign: "center" }}>
            Os dois no mesmo dia
          </div>
          <Grade serie={serieDupla} meta={meta} acento={GRN} />
        </>
      )}

      {/* --- legenda + estado --- */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { c: acento, t: "fechado" },
          { c: `${AMB}55`, t: "parcial" },
          { c: `${RED}33`, t: "perdido" },
        ].map(({ c, t }) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2.5, background: c }} />
            <span style={{ fontSize: 9.5, color: SUB }}>{t}</span>
          </div>
        ))}
      </div>

      {emRisco && (
        <div style={{ marginTop: 12, background: `${RED}18`, border: `1px solid ${RED}44`, borderRadius: 10, padding: "9px 11px", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <IconShield size={15} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 11, color: TEXT, lineHeight: 1.45 }}>
            <b>Ontem ficou aberto.</b> Um dia perdido é ruído — a ofensiva continua. Dois seguidos zeram.
            {" "}Hoje vale até a versão mínima.
          </div>
        </div>
      )}

      {!emRisco && perdoados > 0 && (
        <div style={{ marginTop: 12, background: `${AMB}14`, border: `1px solid ${AMB}33`, borderRadius: 10, padding: "8px 11px", display: "flex", gap: 8, alignItems: "center" }}>
          <IconShield size={14} style={{ color: AMB, flexShrink: 0 }} />
          <div style={{ fontSize: 10.5, color: SUB, lineHeight: 1.4 }}>
            {perdoados === 1 ? "1 dia perdoado" : `${perdoados} dias perdoados`} nessa sequência. O escudo volta a cada 7 dias fechados.
          </div>
        </div>
      )}

      {!emRisco && !hojeFechado && perdoados === 0 && (
        <div style={{ marginTop: 12, fontSize: 10.5, color: SUB, textAlign: "center", lineHeight: 1.45 }}>
          {nomeParceiro
            ? `Feche o dia pra somar +1 — e ${nomeParceiro} recebe o aviso na hora.`
            : "Feche todas as metas essenciais de hoje pra somar +1."}
        </div>
      )}

      {hojeFechado && (
        <div style={{ marginTop: 12, background: `${GRN}16`, border: `1px solid ${GRN}3a`, borderRadius: 10, padding: "9px 11px", textAlign: "center" }}>
          <span style={{ fontSize: 11.5, color: GRN, fontWeight: 700 }}>Dia fechado. +1 na ofensiva 🔥</span>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 9.5, color: PINK, opacity: 0.7, textAlign: "center" }}>
        {atual >= meta ? "Pacto cumprido." : `${meta} dias é a mediana pra um hábito virar automático.`}
      </div>
    </div>
  );
}
