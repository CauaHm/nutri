import { useState } from "react";
import IconInput from "@/components/IconInput";
import { IconMail, IconUserPlus, IconDumbbell } from "@/components/icons";
import { BG, PINK, PURP, RED, SUB, TEXT, sBtn } from "@/lib/theme";
import type { AuthApi } from "@/lib/useAuth";

// Entrar so precisa do e-mail: nao ha senha neste app (ver api/auth/[action].ts).
const ERROS: Record<string, string> = {
  email_invalido: "Digite um e-mail válido.",
  email_em_uso: "Já existe uma conta com esse e-mail — é só entrar.",
  conta_nao_encontrada: "Não achei nenhuma conta com esse e-mail.",
};

interface AuthScreenProps {
  auth: AuthApi;
}

export default function AuthScreen({ auth }: AuthScreenProps) {
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Errou o e-mail no login? O caminho util e criar a conta, nao repetir —
  // entao o atalho aparece junto do erro em vez de so a mensagem.
  const [ofereceCadastro, setOfereceCadastro] = useState(false);

  const irPara = (m: typeof modo) => { setModo(m); setErro(null); setOfereceCadastro(false); };

  const submeter = async () => {
    if (loading) return;
    setErro(null);
    setOfereceCadastro(false);
    setLoading(true);
    const r = modo === "login" ? await auth.login({ email }) : await auth.signup({ email, nome });
    setLoading(false);
    if (!r.ok) {
      setErro((r.error && ERROS[r.error]) || "Não deu pra continuar. Tenta de novo.");
      setOfereceCadastro(modo === "login" && r.error === "conta_nao_encontrada");
    }
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg,${PINK},${PURP})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 24px -8px ${PINK}80`, marginBottom: 14 }}>
            <IconDumbbell size={30} style={{ color: "#fff" }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, background: `linear-gradient(90deg,${PINK},${PURP})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Rotina & Metas</div>
          <div style={{ fontSize: 11.5, color: SUB, marginTop: 2 }}>Treino, dieta e metas — a dois</div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: TEXT }}>
            {modo === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </div>
          <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>
            {modo === "login" ? "Só o e-mail e você já entra." : "Comece a acompanhar treino, dieta e metas."}
          </div>
        </div>

        {modo === "cadastro" && (
          <IconInput icon={IconUserPlus} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        )}

        <IconInput
          icon={IconMail}
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          onKeyDown={(e) => e.key === "Enter" && submeter()}
        />

        {erro && (
          <div style={{ color: RED, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
            {erro}
            {ofereceCadastro && (
              <>
                {" "}
                <button onClick={() => irPara("cadastro")} style={{ background: "none", border: "none", color: PURP, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
                  Criar uma?
                </button>
              </>
            )}
          </div>
        )}

        <button onClick={submeter} disabled={loading} className="tapable" style={{ ...sBtn(PINK, true), marginTop: 6, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Um instante..." : modo === "login" ? "Entrar" : "Criar cadastro"}
        </button>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: SUB }}>
          {modo === "login" ? (
            <>
              Ainda não tem conta?{" "}
              <button onClick={() => irPara("cadastro")} style={{ background: "none", border: "none", color: PURP, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
                Criar cadastro
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button onClick={() => irPara("login")} style={{ background: "none", border: "none", color: PURP, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
