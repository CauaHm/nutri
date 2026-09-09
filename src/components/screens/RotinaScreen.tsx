import { useState } from "react";
import { CARD2, PINK, GRN, AMB, PURP, SUB, BORDER, TEXT, sCard, sBtn } from "@/lib/theme";
import { IconEdit, IconCheck, IconZap, IconClock, IconPlay, IconListCheck, IconChevronRight } from "@/components/icons";
import OfensivaCard from "@/components/OfensivaCard";
import RotinaTarefaSheet from "@/components/RotinaTarefaSheet";
import FocoTimer from "@/components/FocoTimer";
import { nomeDoDia, corDaCategoria, entradaDe, contaComoFeito, tarefasDoDia, CATEGORIAS, type RotinaTarefa, type RotinaStatusEntrada } from "@/lib/rotina";
import type { ScreenProps } from "@/lib/screenProps";

// Aba Rotina — a tela que o app abre pra responder "o que eu faço agora".
// A ordem dos blocos e deliberada: AGORA (mata a decisao) -> OFENSIVA (a
// recompensa visivel) -> o dia inteiro -> a parceira. Nada de decisao no
// topo da tela.

function Marcador({ status, cor }: { status: RotinaStatusEntrada | null; cor: string }) {
  const feito = status === "feito" || status === "outro_horario";
  const minimo = status === "minimo";
  const naoFeito = status === "nao_feito";
  return (
    <div
      style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: feito ? cor : minimo ? `${AMB}22` : "transparent",
        border: feito ? "none" : `1.5px solid ${minimo ? AMB : naoFeito ? "#f8717155" : BORDER}`,
        color: feito ? "#0d0118" : minimo ? AMB : SUB,
      }}
    >
      {feito ? <IconCheck size={15} /> : minimo ? <IconZap size={13} /> : naoFeito ? <span style={{ fontSize: 13, lineHeight: 1 }}>–</span> : null}
    </div>
  );
}

export default function RotinaScreen({ data, nav }: ScreenProps) {
  const { rotina, user, outroUser, temParceiro, userId } = data;
  const [aberta, setAberta] = useState<RotinaTarefa | null>(null);
  const [foco, setFoco] = useState<RotinaTarefa | null>(null);

  const acento = user.cor || PINK;
  const hoje = rotina.hoje;
  const diaNome = nomeDoDia(hoje);

  const marcar = (t: RotinaTarefa, status: RotinaStatusEntrada, extra?: { motivo?: string; horarioReal?: string }) => {
    rotina.marcar(t.id, status, extra);
    setAberta(null);
    setFoco(null);
  };

  if (!rotina.ready) return null;

  // ---------------------------------------------------------- vazio ------
  if (rotina.tarefas.length === 0) {
    return (
      <div style={{ paddingBottom: 110 }}>
        <div style={{ padding: "calc(env(safe-area-inset-top,0px) + 18px) 16px 8px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: -0.4 }}>Rotina</div>
          <div style={{ fontSize: 11.5, color: SUB, marginTop: 2 }}>Nenhuma rotina montada ainda.</div>
        </div>
        <div style={{ padding: "8px 16px" }}>
          <div style={{ ...sCard, padding: 16 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT, marginBottom: 6 }}>Comece pela rotina pronta</div>
            <div style={{ fontSize: 12, color: SUB, lineHeight: 1.55, marginBottom: 14 }}>
              Carrega a semana inteira já montada — fretado, água, estudo, academia, casa, cardio de domingo e a
              revisão semanal — com âncora e versão mínima em cada bloco. Tudo editável depois.
            </div>
            <button onClick={() => rotina.aplicarSeed()} className="tapable" style={{ ...sBtn(acento, true), minHeight: 46, fontSize: 13.5 }}>
              Usar essa rotina e começar os 60 dias
            </button>
            <button onClick={() => nav.push("rotina-config")} className="tapable" style={{ width: "100%", marginTop: 8, background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, minHeight: 42, color: SUB, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Montar do zero
            </button>
          </div>
        </div>
      </div>
    );
  }

  const agora = rotina.agora;
  const proxima = rotina.proxima;
  const destaque = agora || proxima;
  const corDestaque = destaque ? corDaCategoria(destaque.categoria) : acento;
  const podeFocar = (t: RotinaTarefa) => t.categoria === "foco" || t.categoria === "mente";

  const tarefasParceiro = outroUser ? tarefasDoDia(rotina.tarefas, hoje, outroUser._id) : [];

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* ---------------- header ---------------- */}
      <div style={{ padding: "calc(env(safe-area-inset-top,0px) + 18px) 16px 6px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: -0.4 }}>{diaNome}</div>
          <div style={{ fontSize: 11.5, color: SUB, marginTop: 1 }}>
            {rotina.resumoHoje.essenciaisFeitos} de {rotina.resumoHoje.essenciaisTotal} metas do dia
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={() => nav.push("rotina-revisao")} className="tapable" aria-label="Revisão da semana" style={{ position: "relative", width: 36, height: 36, borderRadius: 11, background: `${PURP}20`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: PURP, cursor: "pointer" }}>
            <IconListCheck size={17} />
            {rotina.precisaRevisar && <span style={{ position: "absolute", top: 4, right: 5, width: 7, height: 7, borderRadius: "50%", background: AMB, border: "1.5px solid #0d0118" }} />}
          </button>
          <button onClick={() => nav.push("rotina-config")} className="tapable" aria-label="Editar rotina" style={{ width: 36, height: 36, borderRadius: 11, background: `${PURP}20`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: PURP, cursor: "pointer" }}>
            <IconEdit size={16} />
          </button>
        </div>
      </div>

      {/* ---------------- banner da revisão de domingo ---------------- */}
      {rotina.precisaRevisar && (
        <div style={{ padding: "8px 16px 0" }}>
          <button
            onClick={() => nav.push("rotina-revisao")}
            className="tapable"
            style={{ width: "100%", textAlign: "left", background: `${AMB}14`, border: `1px solid ${AMB}44`, borderRadius: 12, padding: "11px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: AMB }}>Revisão da semana</div>
              <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>
                {rotina.pendencias.length} {rotina.pendencias.length === 1 ? "meta ficou" : "metas ficaram"} sem resposta. 10 minutos e acabou.
              </div>
            </div>
            <IconChevronRight size={17} style={{ color: AMB }} />
          </button>
        </div>
      )}

      {/* ---------------- AGORA ---------------- */}
      <div style={{ padding: "12px 16px 0" }}>
        {destaque ? (
          <div className="fade-in-up" style={{ ...sCard, padding: 16, borderColor: `${corDestaque}44`, background: `linear-gradient(160deg, ${corDestaque}14, #160d28 55%)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: corDestaque, boxShadow: agora ? `0 0 8px ${corDestaque}` : "none" }} />
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: corDestaque }}>
                {agora ? "Agora" : "A seguir"}
              </span>
              <span style={{ fontSize: 10.5, color: SUB, display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
                <IconClock size={11} /> {destaque.fim ? `${destaque.inicio} – ${destaque.fim}` : destaque.inicio}
              </span>
            </div>

            <div style={{ fontSize: 19, fontWeight: 800, color: TEXT, letterSpacing: -0.4, lineHeight: 1.2 }}>{destaque.titulo}</div>
            {destaque.ancora && (
              <div style={{ fontSize: 12, color: SUB, lineHeight: 1.5, marginTop: 7 }}>{destaque.ancora}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {podeFocar(destaque) && (
                <button onClick={() => setFoco(destaque)} className="tapable" style={{ flex: 1, ...sBtn(corDestaque), minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 13 }}>
                  <IconPlay size={15} /> 5 minutos
                </button>
              )}
              <button
                onClick={() => marcar(destaque, "feito")}
                className="tapable"
                style={{ flex: 1, background: `${GRN}1c`, border: `1px solid ${GRN}55`, borderRadius: 10, minHeight: 46, color: GRN, fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <IconCheck size={16} /> Feito
              </button>
            </div>
            <button onClick={() => setAberta(destaque)} className="tapable" style={{ width: "100%", marginTop: 8, background: "none", border: "none", color: SUB, fontSize: 11, cursor: "pointer" }}>
              Outras opções
            </button>
          </div>
        ) : (
          <div style={{ ...sCard, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: GRN }}>Dia fechado 🔥</div>
            <div style={{ fontSize: 11.5, color: SUB, marginTop: 4, lineHeight: 1.5 }}>
              Todas as metas de hoje marcadas. Agora é a parte boa — sem culpa.
            </div>
          </div>
        )}
      </div>

      {/* ---------------- OFENSIVA ---------------- */}
      <div style={{ padding: "12px 16px 0" }}>
        <OfensivaCard
          ofensiva={rotina.ofensiva}
          ofensivaDupla={rotina.ofensivaDupla}
          serie={rotina.serie}
          serieDupla={rotina.ofensivaDupla ? rotina.serie.map((d, i) => {
            const p = rotina.serieParceiro[i];
            if (!p) return d;
            const ambos = d.status === "fechado" && p.status === "fechado";
            return { ...d, status: ambos ? "fechado" as const : d.status === "futuro" || p.status === "futuro" ? "futuro" as const : d.feitos + p.feitos > 0 ? "parcial" as const : "falhou" as const };
          }) : []}
          acento={acento}
          nomeParceiro={outroUser?.nome.split(" ")[0] || null}
        />
      </div>

      {/* ---------------- O DIA ---------------- */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: SUB, marginBottom: 8, paddingLeft: 2 }}>
          O dia inteiro
        </div>
        <div style={{ ...sCard, padding: 0 }}>
          {rotina.doDia.map((t, i) => {
            const e = entradaDe(rotina.log, hoje, t.id);
            const cor = corDaCategoria(t.categoria);
            const feito = contaComoFeito(e);
            return (
              <button
                key={t.id}
                onClick={() => setAberta(t)}
                className="tapable"
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 11,
                  padding: "12px 13px", background: "none", border: "none",
                  borderTop: i === 0 ? "none" : `1px solid ${BORDER}`, cursor: "pointer",
                  opacity: feito ? 0.55 : 1,
                }}
              >
                <span
                  onClick={(ev) => { ev.stopPropagation(); feito ? rotina.desmarcar(t.id) : marcar(t, "feito"); }}
                  role="button"
                  aria-label={feito ? `Desmarcar ${t.titulo}` : `Marcar ${t.titulo}`}
                >
                  <Marcador status={e?.status || null} cor={cor} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, textDecoration: feito ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.titulo}
                  </div>
                  <div style={{ fontSize: 10.5, color: SUB, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: cor, fontWeight: 700 }}>{CATEGORIAS[t.categoria].label}</span>
                    <span>·</span>
                    <span>{t.fim ? `${t.inicio}–${t.fim}` : t.inicio}</span>
                    {!t.essencial && <><span>·</span><span style={{ color: PURP }}>recompensa</span></>}
                  </div>
                </div>
                {t.avisar && temParceiro && (
                  <span title="Avisa sua dupla ao concluir" style={{ fontSize: 9, color: PINK, fontWeight: 700, background: `${PINK}18`, borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>avisa</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- PARCEIRA ---------------- */}
      {temParceiro && outroUser && rotina.resumoHojeParceiro && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: SUB, marginBottom: 8, paddingLeft: 2 }}>
            {outroUser.nome.split(" ")[0]} hoje
          </div>
          <div style={{ ...sCard, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: `${outroUser.cor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {outroUser.emoji || "🙂"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>
                  {rotina.resumoHojeParceiro.essenciaisFeitos} de {rotina.resumoHojeParceiro.essenciaisTotal} metas
                </div>
                <div style={{ fontSize: 10.5, color: rotina.resumoHojeParceiro.status === "fechado" ? GRN : SUB, marginTop: 1 }}>
                  {rotina.resumoHojeParceiro.status === "fechado" ? "fechou o dia 🔥" : "dia em andamento"}
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: CARD2, border: `2px solid ${outroUser.cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: outroUser.cor }}>
                {Math.round(rotina.resumoHojeParceiro.progresso * 100)}%
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {tarefasParceiro.map((t) => {
                const feito = contaComoFeito(entradaDe(rotina.logParceiro, hoje, t.id));
                return (
                  <span
                    key={t.id}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: "4px 8px", borderRadius: 7,
                      background: feito ? `${GRN}1c` : CARD2,
                      color: feito ? GRN : SUB,
                      border: `1px solid ${feito ? `${GRN}44` : BORDER}`,
                      textDecoration: feito ? "line-through" : "none",
                    }}
                  >
                    {t.titulo}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- sheets ---------------- */}
      {aberta && (
        <RotinaTarefaSheet
          tarefa={aberta}
          entrada={entradaDe(rotina.log, hoje, aberta.id)}
          onFechar={() => setAberta(null)}
          onMarcar={(status, extra) => marcar(aberta, status, extra)}
          onDesmarcar={() => { rotina.desmarcar(aberta.id); setAberta(null); }}
          onFoco={podeFocar(aberta) ? () => { setFoco(aberta); setAberta(null); } : undefined}
        />
      )}

      {foco && (
        <FocoTimer
          tarefa={foco}
          onFechar={() => setFoco(null)}
          onConcluir={(status) => marcar(foco, status)}
        />
      )}

      {/* Rodapé silencioso: lembra a regra que segura tudo, sem virar sermão. */}
      <div style={{ padding: "18px 24px 0", textAlign: "center", fontSize: 10, color: SUB, opacity: 0.65, lineHeight: 1.5 }}>
        Um dia perdido é ruído. Dois seguidos são o começo do fim.
        {userId ? "" : ""}
      </div>
    </div>
  );
}
