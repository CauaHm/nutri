import { useState, useEffect } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { loadHistoricoDe } from "@/lib/useBodyComp";
import { calcGorduraNavy, calcMassas, calcTMB, classificarGordura, type MedicaoEntry, type Sexo } from "@/lib/bodycomp";
import { CARD2, SUB, sCard } from "@/lib/theme";
import CompareChart, { type CompareSeries } from "@/components/CompareChart";
import type { ScreenProps } from "@/lib/screenProps";
import type { User } from "@/lib/types";

const num = (v: any): number | null => (v === "" || v === null || v === undefined ? null : Number(v));
const fmt = (v: number | null | undefined, casas = 1): string => (v === null || v === undefined || Number.isNaN(v) ? "—" : v.toFixed(casas));

function calcularAtual(pessoa: User, historico: MedicaoEntry[]) {
  const latest = historico[0];
  if (!latest) return null;
  const sexo = pessoa.sexo as Sexo, altura = num(pessoa.altura), idade = num(pessoa.idade);
  const peso = num(latest.peso);
  const gorduraMedida = latest.gorduraMedida !== "" && latest.gorduraMedida != null ? num(latest.gorduraMedida) : null;
  const pctGordura = gorduraMedida ?? calcGorduraNavy({ sexo, altura, cintura: num(latest.cintura), pescoco: num(latest.pescoco), quadril: num(latest.quadril) });
  const { massaMagra } = calcMassas(peso, pctGordura);
  const tmb = calcTMB({ sexo, peso, altura, idade });
  return { peso, pctGordura, massaMagra, tmb, classificacao: classificarGordura(sexo, pctGordura) };
}

function StatRow({ label, a, b, corA, corB, unidade = "" }: { label: string; a: string; b: string; corA: string; corB: string; unidade?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "1px solid #2a1a45" }}>
      <span style={{ fontWeight: 800, fontSize: 14, color: corA }}>{a}{a !== "—" ? unidade : ""}</span>
      <span style={{ fontSize: 10.5, color: SUB, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontWeight: 800, fontSize: 14, color: corB }}>{b}{b !== "—" ? unidade : ""}</span>
    </div>
  );
}

export default function ComparativoScreen({ data, nav }: ScreenProps) {
  const { user, outroUser, outroId, temParceiro } = data;
  const [historicoParceiro, setHistoricoParceiro] = useState<MedicaoEntry[] | null>(null);
  const [historicoMeu, setHistoricoMeu] = useState<MedicaoEntry[] | null>(null);

  useEffect(() => {
    if (!temParceiro || !outroId) return;
    loadHistoricoDe(user._id).then(setHistoricoMeu);
    loadHistoricoDe(outroId).then(setHistoricoParceiro);
  }, [user._id, outroId, temParceiro]);

  if (!temParceiro || !outroUser) {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Comparativo" accent="⚖️" onBack={nav.pop} />
        <div style={{ padding: 30, textAlign: "center", color: SUB, fontSize: 12 }}>
          Convide alguém pra competição pra ver o comparativo lado a lado.
        </div>
      </div>
    );
  }

  if (historicoMeu === null || historicoParceiro === null) {
    return (
      <div style={{ minHeight: "100%" }}>
        <ScreenHeader title="Comparativo" accent="⚖️" onBack={nav.pop} />
        <div style={{ padding: 30, textAlign: "center", color: SUB, fontSize: 12 }}>Carregando...</div>
      </div>
    );
  }

  const meu = calcularAtual(user, historicoMeu);
  const dele = calcularAtual(outroUser, historicoParceiro);

  const pesoSerieA = Object.assign(
    [...historicoMeu].sort((a, b) => a.id - b.id).filter((h) => h.peso).map((h) => ({ date: h.date, y: num(h.peso) as number })),
    { nome: user.nome.split(" ")[0], color: user.cor }
  ) as CompareSeries;
  const pesoSerieB = Object.assign(
    [...historicoParceiro].sort((a, b) => a.id - b.id).filter((h) => h.peso).map((h) => ({ date: h.date, y: num(h.peso) as number })),
    { nome: outroUser.nome.split(" ")[0], color: outroUser.cor }
  ) as CompareSeries;

  const gordSerieFrom = (hist: MedicaoEntry[], pessoa: User) => [...hist].sort((a, b) => a.id - b.id).map((h) => {
    const g = h.gorduraMedida !== "" && h.gorduraMedida != null ? num(h.gorduraMedida)
      : calcGorduraNavy({ sexo: pessoa.sexo as Sexo, altura: num(pessoa.altura), cintura: num(h.cintura), pescoco: num(h.pescoco), quadril: num(h.quadril) });
    return g !== null ? { date: h.date, y: Math.round(g * 10) / 10 } : null;
  }).filter((p): p is { date: string; y: number } => p !== null);
  const gordSerieA = Object.assign(gordSerieFrom(historicoMeu, user), { nome: user.nome.split(" ")[0], color: user.cor }) as CompareSeries;
  const gordSerieB = Object.assign(gordSerieFrom(historicoParceiro, outroUser), { nome: outroUser.nome.split(" ")[0], color: outroUser.cor }) as CompareSeries;

  return (
    <div style={{ minHeight: "100%", paddingBottom: 60 }}>
      <ScreenHeader title="Comparativo" accent="⚖️" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 26 }}>{user.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: user.cor }}>{user.nome.split(" ")[0]}</div>
            <div style={{ fontSize: 9.5, color: SUB }}>{user.sexo === "F" ? "Feminino" : "Masculino"} · {user.idade || "—"} anos</div>
          </div>
          <div style={{ color: SUB, fontSize: 11, fontWeight: 700 }}>vs</div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 26 }}>{outroUser.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: outroUser.cor }}>{outroUser.nome.split(" ")[0]}</div>
            <div style={{ fontSize: 9.5, color: SUB }}>{outroUser.sexo === "F" ? "Feminino" : "Masculino"} · {outroUser.idade || "—"} anos</div>
          </div>
        </div>

        {(!meu || !dele) && (
          <div style={{ fontSize: 11, color: SUB, textAlign: "center", marginBottom: 12 }}>
            {!meu && "Você"}{!meu && !dele && " e "}{!dele && outroUser.nome.split(" ")[0]} ainda {!meu && !dele ? "não registraram" : "não registrou"} nenhuma medição em Composição Corporal.
          </div>
        )}

        <div style={{ ...sCard, marginBottom: 14, padding: "4px 14px 10px" }}>
          <StatRow label="Peso" a={fmt(meu?.peso)} b={fmt(dele?.peso)} corA={user.cor} corB={outroUser.cor} unidade=" kg" />
          <StatRow label="% Gordura" a={fmt(meu?.pctGordura)} b={fmt(dele?.pctGordura)} corA={user.cor} corB={outroUser.cor} unidade="%" />
          <StatRow label="Classificação" a={meu?.classificacao || "—"} b={dele?.classificacao || "—"} corA={user.cor} corB={outroUser.cor} />
          <StatRow label="Massa Magra" a={fmt(meu?.massaMagra)} b={fmt(dele?.massaMagra)} corA={user.cor} corB={outroUser.cor} unidade=" kg" />
          <StatRow label="TMB" a={fmt(meu?.tmb, 0)} b={fmt(dele?.tmb, 0)} corA={user.cor} corB={outroUser.cor} unidade=" kcal" />
        </div>

        <div style={{ fontSize: 10.5, color: SUB, background: CARD2, borderRadius: 10, padding: "8px 12px", marginBottom: 14, lineHeight: 1.5 }}>
          A classificação de % de gordura é calculada dentro da faixa saudável do sexo de cada um — corpos de homens e mulheres têm referências diferentes, então o número cru sozinho não é uma comparação justa.
        </div>

        <div style={{ ...sCard, padding: 14, marginBottom: 10 }}>
          <CompareChart title="Peso" unit="kg" seriesA={pesoSerieA} seriesB={pesoSerieB} />
        </div>
        <div style={{ ...sCard, padding: 14 }}>
          <CompareChart title="% de Gordura" unit="%" seriesA={gordSerieA} seriesB={gordSerieB} />
        </div>
      </div>
    </div>
  );
}
