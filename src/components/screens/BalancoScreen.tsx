import { useMemo, useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { todayStr, parseDate, formatDate, getWeekStart, weekdayPT } from "@/lib/dates";
import { useBodyComp } from "@/lib/useBodyComp";
import { calcTMB, calcTDEE, NAF_OPTIONS } from "@/lib/bodycomp";
import { addDays } from "@/lib/rpg";
import {
  balancoDoDia, balancoPeriodo, datesDoPeriodo, tdeeReal, perdaRealNoPeriodo,
  KCAL_POR_KG, type BalancoDia, type PesoEntry,
} from "@/lib/balanco";
import { IconChevronLeft, IconChevronRight, IconFlame } from "@/components/icons";
import { CARD2, PINK, GRN, AMB, SUB, BORDER, TEXT, sCard, sBtn } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";

const num = (v: any): number | null => (v === "" || v === null || v === undefined ? null : Number(v));

function primeiroDiaDoMes(dateStr: string): string {
  const d = parseDate(dateStr);
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
}
function diasNoMes(dateStr: string): number {
  const d = parseDate(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function addMonths(dateStr: string, delta: number): string {
  const d = parseDate(dateStr);
  return formatDate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}
function mesLabel(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

const WEEKDAY_ABBR = ["D", "S", "T", "Q", "Q", "S", "S"];

// Cor do saldo — nunca "quanto mais negativo, melhor": compara com o saldo
// planejado (kcalMeta - gasto base) e sinaliza fora da faixa pra QUALQUER
// lado, nao so pra cima. Sem dado = cinza (nao e "ruim", e ausencia).
function corSaldo(saldo: number, completo: boolean, saldoPlanejado: number): string {
  if (!completo) return SUB;
  const desvio = Math.abs(saldo - saldoPlanejado);
  return desvio <= 300 ? GRN : AMB;
}

// Barra divergente centrada no zero — usada no card de hoje.
function BarraDivergente({ saldo, escala }: { saldo: number; escala: number }) {
  const pct = Math.min(100, (Math.abs(saldo) / escala) * 100);
  const cor = saldo <= 0 ? GRN : AMB;
  return (
    <div style={{ position: "relative", height: 10, background: "#ffffff10", borderRadius: 5, marginTop: 10 }}>
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: BORDER }} />
      <div
        style={{
          position: "absolute", top: 0, bottom: 0, borderRadius: 5, background: cor,
          ...(saldo <= 0 ? { right: "50%", width: `${pct / 2}%` } : { left: "50%", width: `${pct / 2}%` }),
        }}
      />
    </div>
  );
}

function GraficoSemana({ dias, saldoPlanejado }: { dias: BalancoDia[]; saldoPlanejado: number }) {
  const W = 320, H = 130, PAD_B = 18, PAD_T = 8, MID = (H - PAD_T - PAD_B) / 2 + PAD_T;
  const maxAbs = Math.max(300, ...dias.map((d) => Math.abs(d.saldo)));
  const barW = (W - 20) / dias.length;
  const scaleH = (H - PAD_T - PAD_B) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <pattern id="hachuraSemana" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="5" stroke={SUB} strokeWidth="1.5" />
        </pattern>
      </defs>
      <line x1="8" x2={W - 8} y1={MID} y2={MID} stroke={BORDER} strokeWidth="1" />
      {dias.map((d, i) => {
        const cx = 12 + barW * i + barW / 2;
        const diaSemanaIdx = parseDate(d.date).getDay();
        if (!d.completo) {
          return (
            <g key={d.date}>
              <rect x={cx - barW * 0.28} y={MID - 3} width={barW * 0.56} height={6} rx={2} fill="url(#hachuraSemana)" opacity={0.6} />
              <text x={cx} y={H - 4} fontSize="8" fill={SUB} textAnchor="middle">{WEEKDAY_ABBR[diaSemanaIdx]}</text>
            </g>
          );
        }
        const h = Math.max(2, (Math.abs(d.saldo) / maxAbs) * scaleH);
        const cor = corSaldo(d.saldo, d.completo, saldoPlanejado);
        const y = d.saldo <= 0 ? MID - h : MID;
        return (
          <g key={d.date}>
            <rect x={cx - barW * 0.28} y={y} width={barW * 0.56} height={h} rx={2} fill={cor} />
            <text x={cx} y={H - 4} fontSize="8" fill={SUB} textAnchor="middle">{WEEKDAY_ABBR[diaSemanaIdx]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function GradeMes({ dias, saldoPlanejado }: { dias: BalancoDia[]; saldoPlanejado: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {dias.map((d) => {
        const cor = corSaldo(d.saldo, d.completo, saldoPlanejado);
        const intensidade = d.completo ? Math.min(1, Math.abs(d.saldo - saldoPlanejado) / 800 + 0.35) : 1;
        return (
          <div
            key={d.date}
            title={d.completo ? `${d.date}: saldo ${d.saldo > 0 ? "+" : ""}${d.saldo} kcal` : `${d.date}: sem registro`}
            style={{
              aspectRatio: "1", borderRadius: 4,
              background: d.completo ? cor : "#ffffff08",
              opacity: d.completo ? intensidade : 1,
              border: d.completo ? "none" : `1px dashed ${BORDER}`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function BalancoScreen({ data, nav, auth }: ScreenProps) {
  const { user, mealLog, atividades } = data;
  const bc = useBodyComp(user);

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const today = todayStr();
  const peso = bc.ready ? num(bc.historico[0]?.peso) : null;
  const tmb = bc.ready ? calcTMB({ sexo: user.sexo, peso, altura: num(user.altura), idade: num(user.idade) }) : null;
  const modoGasto = bc.config.modoGasto;
  const tdeeBase = bc.ready
    ? (modoGasto === "preciso" ? (tmb ? tmb * 1.2 : 0) : (calcTDEE(tmb, bc.config.naf) || 0))
    : 0;
  const saldoPlanejado = tdeeBase > 0 ? user.kcalMeta - tdeeBase : 0;

  const pesos: PesoEntry[] = useMemo(
    () => bc.historico.filter((h) => num(h.peso) !== null).map((h) => ({ date: h.date, peso: num(h.peso) as number })),
    [bc.historico]
  );

  const hoje = useMemo(() => balancoDoDia(today, mealLog, atividades, tdeeBase), [today, mealLog, atividades, tdeeBase]);
  const projecaoHojeKg = Math.abs(hoje.saldo) / KCAL_POR_KG;

  const weekStart = useMemo(() => addDays(getWeekStart(today), weekOffset * 7), [today, weekOffset]);
  const weekDates = useMemo(() => datesDoPeriodo(weekStart, 7), [weekStart]);
  const semana = useMemo(() => balancoPeriodo(weekDates, mealLog, atividades, tdeeBase), [weekDates, mealLog, atividades, tdeeBase]);

  const monthStart = useMemo(() => addMonths(primeiroDiaDoMes(today), monthOffset), [today, monthOffset]);
  const monthDates = useMemo(() => datesDoPeriodo(monthStart, diasNoMes(monthStart)), [monthStart]);
  const mes = useMemo(() => balancoPeriodo(monthDates, mealLog, atividades, tdeeBase), [monthDates, mealLog, atividades, tdeeBase]);
  const perdaRealMes = useMemo(() => perdaRealNoPeriodo(pesos, monthDates[0], monthDates[monthDates.length - 1]), [pesos, monthDates]);

  const RECONCILIACAO_JANELA_DIAS = 60;
  const reconciliacaoDates = useMemo(() => datesDoPeriodo(addDays(today, -(RECONCILIACAO_JANELA_DIAS - 1)), RECONCILIACAO_JANELA_DIAS), [today]);
  const reconciliacao = useMemo(() => tdeeReal(reconciliacaoDates, mealLog, pesos, tmb), [reconciliacaoDates, mealLog, pesos, tmb]);

  const aplicarTdeeReal = async () => {
    if (!reconciliacao.confiavel || !tdeeBase) return;
    const ajusteAtual = user.kcalMeta - tdeeBase;
    const novaKcalMeta = Math.round(reconciliacao.valor + ajusteAtual);
    await auth.updateProfile({ kcalMeta: novaKcalMeta });
  };

  if (!bc.ready) {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Balanço Energético" onBack={nav.pop} />
        <div style={{ color: SUB, fontSize: 12, textAlign: "center", padding: "30px 0" }}>Carregando...</div>
      </div>
    );
  }

  if (!peso || !tmb) {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Balanço Energético" onBack={nav.pop} />
        <div style={{ padding: 14 }}>
          <div style={{ ...sCard, padding: 18, textAlign: "center" }}>
            <div style={{ color: SUB, fontSize: 12, marginBottom: 10 }}>Cadastre peso, altura e idade em Composição Corporal pra calcular seu gasto e ver o balanço.</div>
            <button onClick={() => nav.push("composicao")} className="tapable" style={sBtn(user.cor)}>Ir pra Composição Corporal</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%", paddingBottom: 40 }}>
      <ScreenHeader title="Balanço Energético" accent="⚖️" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <div style={{ background: `${PINK}12`, border: `1px solid ${PINK}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: "#f5b8ee", lineHeight: 1.6 }}>
          Tudo aqui é aproximação — TDEE, METs e a conversão de 7700 kcal/kg errram. Use como direção, não como fato medido.
          {" "}Gasto base atual: <b>{Math.round(tdeeBase)} kcal</b> ({modoGasto === "preciso" ? "Modo Preciso — TMB × 1.2" : `Modo Estimativa — ${NAF_OPTIONS.find((n) => n.key === bc.config.naf)?.label}`}).
        </div>

        {/* Hoje */}
        <div style={{ ...sCard, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, marginBottom: 10 }}>Hoje</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>ingerido</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{hoje.ingestao}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>gasto</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{hoje.gasto}</div>
              {hoje.gastoExtra > 0 && <div style={{ fontSize: 8.5, color: PINK }}>+{hoje.gastoExtra} extra</div>}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>saldo</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: hoje.completo ? corSaldo(hoje.saldo, true, saldoPlanejado) : SUB }}>
                {hoje.completo ? `${hoje.saldo > 0 ? "+" : ""}${hoje.saldo}` : "—"}
              </div>
            </div>
          </div>
          <BarraDivergente saldo={hoje.completo ? hoje.saldo : 0} escala={Math.max(500, Math.abs(saldoPlanejado) * 2 || 1000)} />
          {hoje.completo ? (
            <div style={{ marginTop: 10, fontSize: 11, color: SUB, textAlign: "center" }}>
              ≈ {projecaoHojeKg.toFixed(2)} kg de {hoje.saldo <= 0 ? "gordura (déficit)" : "superávit"} hoje — aproximação, não fato medido.
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 11, color: SUB, textAlign: "center" }}>Registre suas refeições de hoje pra ver o saldo.</div>
          )}
        </div>

        {/* Semana */}
        <div style={{ ...sCard, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={() => setWeekOffset((w) => w - 1)} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 4 }}><IconChevronLeft size={16} /></button>
            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>Semana de {weekStart}{weekOffset === 0 ? " (atual)" : ""}</div>
            <button onClick={() => setWeekOffset((w) => Math.min(0, w + 1))} className="tapable" style={{ background: "none", border: "none", color: weekOffset === 0 ? "#3a2a55" : SUB, cursor: weekOffset === 0 ? "default" : "pointer", padding: 4 }} disabled={weekOffset === 0}><IconChevronRight size={16} /></button>
          </div>
          <GraficoSemana dias={semana.dias} saldoPlanejado={saldoPlanejado} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>total acumulado</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: semana.diasCompletos > 0 ? corSaldo(semana.total, true, saldoPlanejado * semana.diasCompletos) : SUB }}>
                {semana.diasCompletos > 0 ? `${semana.total > 0 ? "+" : ""}${semana.total} kcal` : "sem dados"}
              </div>
              {semana.diasCompletos > 0 && <div style={{ fontSize: 8.5, color: SUB }}>≈ {semana.perdaEstimadaKg.toFixed(2)} kg</div>}
            </div>
            <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>média diária</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: semana.diasCompletos > 0 ? corSaldo(semana.media, true, saldoPlanejado) : SUB }}>
                {semana.diasCompletos > 0 ? `${semana.media > 0 ? "+" : ""}${Math.round(semana.media)} kcal` : "—"}
              </div>
              <div style={{ fontSize: 8.5, color: SUB }}>{semana.diasCompletos}/7 dias completos</div>
            </div>
          </div>
          {semana.diasCompletos < 7 && <div style={{ fontSize: 10, color: SUB, marginTop: 8, textAlign: "center" }}>Dias sem refeição registrada (hachurados) ficam de fora das médias — ausência não é ingestão zero.</div>}
        </div>

        {/* Mes */}
        <div style={{ ...sCard, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={() => setMonthOffset((m) => m - 1)} className="tapable" style={{ background: "none", border: "none", color: SUB, cursor: "pointer", padding: 4 }}><IconChevronLeft size={16} /></button>
            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, textTransform: "capitalize" }}>{mesLabel(monthStart)}</div>
            <button onClick={() => setMonthOffset((m) => Math.min(0, m + 1))} className="tapable" style={{ background: "none", border: "none", color: monthOffset === 0 ? "#3a2a55" : SUB, cursor: monthOffset === 0 ? "default" : "pointer", padding: 4 }} disabled={monthOffset === 0}><IconChevronRight size={16} /></button>
          </div>
          <GradeMes dias={mes.dias} saldoPlanejado={saldoPlanejado} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 9.5, color: SUB }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: GRN, display: "inline-block" }} /> na faixa planejada</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: AMB, display: "inline-block" }} /> fora da faixa</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#ffffff08", border: `1px dashed ${BORDER}`, display: "inline-block" }} /> sem dado</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>perda estimada (saldo)</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: TEXT }}>{mes.diasCompletos > 0 ? `≈ ${mes.perdaEstimadaKg.toFixed(2)} kg` : "—"}</div>
              <div style={{ fontSize: 8.5, color: SUB }}>{mes.diasCompletos}/{monthDates.length} dias completos</div>
            </div>
            <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9.5, color: SUB }}>perda real (balança)</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: PINK }}>{perdaRealMes !== null ? `${perdaRealMes >= 0 ? "-" : "+"}${Math.abs(perdaRealMes).toFixed(2)} kg` : "sem pesagem"}</div>
            </div>
          </div>
          {mes.diasCompletos > 0 && perdaRealMes !== null && (
            <div style={{ marginTop: 8, fontSize: 10.5, color: SUB, textAlign: "center", lineHeight: 1.5 }}>
              A diferença entre estimado e real é a informação mais valiosa aqui — mostra se o gasto base está bem calibrado pra você.
            </div>
          )}
        </div>

        {/* Reconciliacao de TDEE */}
        <div style={{ ...sCard, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, marginBottom: 4 }}>Seu gasto real (últimos {RECONCILIACAO_JANELA_DIAS} dias)</div>
          {reconciliacao.confiavel ? (
            <>
              <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.6, marginBottom: 10 }}>
                Calculado a partir do que você comeu e como seu peso variou nesse período — mais confiável que qualquer fórmula fixa.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, color: SUB }}>estimado (fórmula)</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: TEXT }}>{Math.round(tdeeBase)} kcal</div>
                </div>
                <div style={{ background: CARD2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, color: SUB }}>real (medido)</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: PINK }}>{reconciliacao.valor} kcal</div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: AMB, textAlign: "center", marginBottom: 10 }}>
                Seu gasto real está ~{Math.abs(Math.round(((reconciliacao.valor - tdeeBase) / tdeeBase) * 100))}% {reconciliacao.valor >= tdeeBase ? "acima" : "abaixo"} da estimativa.
              </div>
              <button onClick={aplicarTdeeReal} className="tapable" style={sBtn(GRN, true)}>Aplicar às minhas metas</button>
            </>
          ) : (
            <div style={{ fontSize: 11.5, color: SUB, lineHeight: 1.6 }}>
              <IconFlame size={13} style={{ color: SUB, marginRight: 4, verticalAlign: -2 }} />
              {reconciliacao.motivo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
