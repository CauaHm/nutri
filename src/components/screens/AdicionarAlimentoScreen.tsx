import { useRef, useState, type ChangeEvent } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { useFoodCatalog } from "@/lib/useFoodCatalog";
import { PURP, GRN, AMB, SUB, BORDER, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import type { ScreenProps } from "@/lib/screenProps";

interface FormState {
  nome: string;
  porcaoDesc: string;
  kcal: string;
  proteina: string;
  carbo: string;
  gordura: string;
}

const EMPTY_FORM: FormState = { nome: "", porcaoDesc: "", kcal: "", proteina: "", carbo: "", gordura: "" };

type Status = "idle" | "analisando" | "erro" | "sem_api" | "ok";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdicionarAlimentoScreen({ data, nav }: ScreenProps) {
  const { userId, user } = data;
  const catalog = useFoodCatalog(userId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [modo, setModo] = useState<"foto" | "manual">("foto");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erroMsg, setErroMsg] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confianca, setConfianca] = useState<string | null>(null);

  const escolherFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    setStatus("idle");
  };

  const analisar = async () => {
    if (!imgFile) return;
    setStatus("analisando");
    try {
      const base64 = await fileToBase64(imgFile);
      const r = await fetch("/api/food/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, imageMediaType: imgFile.type || "image/jpeg", descricao }),
      });
      if (r.status === 501) { setStatus("sem_api"); return; }
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setErroMsg(body.error === "refusal" ? "A IA não conseguiu analisar essa imagem." : "Não deu pra analisar agora.");
        setStatus("erro");
        return;
      }
      const { alimento } = await r.json();
      setForm({
        nome: alimento.nome, porcaoDesc: alimento.porcaoDesc,
        kcal: String(alimento.kcal), proteina: String(alimento.proteinaG),
        carbo: String(alimento.carboG), gordura: String(alimento.gorduraG),
      });
      setConfianca(alimento.confianca);
      setStatus("ok");
    } catch {
      setErroMsg("Não deu pra analisar agora — verifique sua conexão.");
      setStatus("erro");
    }
  };

  const salvar = async () => {
    if (!form.nome || !form.kcal) return;
    await catalog.addAlimento({
      nome: form.nome,
      porcaoDesc: form.porcaoDesc || "1 porção",
      kcalPorcao: Number(form.kcal) || 0,
      proteinaPorcao: Number(form.proteina) || 0,
      carboPorcao: Number(form.carbo) || 0,
      gorduraPorcao: Number(form.gordura) || 0,
      origem: modo === "foto" && status === "ok" ? "foto" : "manual",
    });
    nav.pop();
  };

  const formVisivel = modo === "manual" || status === "ok" || status === "sem_api" || status === "erro";

  return (
    <div style={{ minHeight: "100%", paddingBottom: 60 }}>
      <ScreenHeader title="Novo Alimento" onBack={nav.pop} />
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {([["foto", "📷 Analisar foto"], ["manual", "✏️ Manual"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setModo(k)} style={{ flex: 1, padding: "9px 4px", background: modo === k ? `${PURP}25` : "#ffffff08", border: `1px solid ${modo === k ? PURP : BORDER}`, borderRadius: 9, color: modo === k ? PURP : SUB, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{l}</button>
          ))}
        </div>

        {modo === "foto" && (
          <div style={{ ...sCard, padding: 14, marginBottom: 14 }}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={escolherFoto} style={{ display: "none" }} />
            {imgPreview ? (
              <img src={imgPreview} alt="Foto do alimento" style={{ width: "100%", borderRadius: 10, marginBottom: 10, maxHeight: 260, objectFit: "cover" }} />
            ) : (
              <button onClick={() => fileRef.current?.click()} className="tapable" style={{ width: "100%", padding: "34px 0", background: "#ffffff08", border: `1px dashed ${BORDER}`, borderRadius: 10, color: SUB, fontSize: 12, cursor: "pointer", marginBottom: 10 }}>
                📷 Tirar foto do alimento ou da tabela nutricional
              </button>
            )}
            {imgPreview && (
              <button onClick={() => fileRef.current?.click()} className="tapable" style={{ width: "100%", background: "none", border: `1px solid ${BORDER}`, borderRadius: 9, color: SUB, fontSize: 11, padding: "8px 0", cursor: "pointer", marginBottom: 10 }}>Trocar foto</button>
            )}

            <label style={sLbl}>Descrição / peso (opcional, ajuda a IA)</label>
            <input style={sInp} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="ex: prato com 200g de arroz e 150g de frango" />

            <button onClick={analisar} disabled={!imgFile || status === "analisando"} className="tapable" style={{ ...sBtn(status === "analisando" ? "#555" : user.cor, true), marginTop: 12, opacity: !imgFile ? 0.5 : 1 }}>
              {status === "analisando" ? "Analisando..." : "Analisar com IA"}
            </button>

            {status === "sem_api" && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: `${AMB}12`, border: `1px solid ${AMB}40`, borderRadius: 9, fontSize: 11.5, color: AMB, lineHeight: 1.6 }}>
                Análise automática não está configurada nesse app ainda (falta a chave da API da Anthropic no servidor — veja o README). Você pode analisar a foto direto no Claude e preencher os valores abaixo à mão.
                <button onClick={() => window.open("https://claude.ai/new", "_blank")} className="tapable" style={{ ...sBtn(AMB, true), marginTop: 8 }}>Abrir claude.ai pra analisar</button>
              </div>
            )}
            {status === "erro" && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: `${AMB}12`, border: `1px solid ${AMB}40`, borderRadius: 9, fontSize: 11.5, color: AMB }}>{erroMsg} Preencha os valores manualmente abaixo, se quiser.</div>
            )}
            {status === "ok" && confianca && confianca !== "alta" && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: `${PURP}12`, borderRadius: 9, fontSize: 11, color: "#c4b5fd" }}>🔎 Confiança {confianca === "media" ? "média" : "baixa"} — é uma estimativa, ajuste os valores se souber melhor.</div>
            )}
          </div>
        )}

        {formVisivel && (
          <div style={sCard}>
            <div style={{ padding: 14 }}>
              <label style={sLbl}>Nome do alimento</label>
              <input style={sInp} value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="ex: Peito de frango grelhado" />
              <label style={sLbl}>Porção de referência</label>
              <input style={sInp} value={form.porcaoDesc} onChange={(e) => setForm((p) => ({ ...p, porcaoDesc: e.target.value }))} placeholder="ex: 100g, ou 1 unidade" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={sLbl}>Kcal</label><input style={sInp} type="number" value={form.kcal} onChange={(e) => setForm((p) => ({ ...p, kcal: e.target.value }))} /></div>
                <div><label style={sLbl}>Proteína (g)</label><input style={sInp} type="number" value={form.proteina} onChange={(e) => setForm((p) => ({ ...p, proteina: e.target.value }))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={sLbl}>Carboidrato (g)</label><input style={sInp} type="number" value={form.carbo} onChange={(e) => setForm((p) => ({ ...p, carbo: e.target.value }))} /></div>
                <div><label style={sLbl}>Gordura (g)</label><input style={sInp} type="number" value={form.gordura} onChange={(e) => setForm((p) => ({ ...p, gordura: e.target.value }))} /></div>
              </div>
              <button onClick={salvar} className="tapable" style={{ ...sBtn(GRN, true), marginTop: 12 }}>Salvar no catálogo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
