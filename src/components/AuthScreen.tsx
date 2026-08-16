import { useState } from "react";
import IconInput from "@/components/IconInput";
import { IconMail, IconLock, IconEye, IconEyeOff, IconUserPlus, IconDumbbell } from "@/components/icons";
import { BG, PINK, PURP, RED, SUB, TEXT, sBtn } from "@/lib/theme";
import type { AuthApi } from "@/lib/useAuth";

const ERROS: Record<string, string> = {
  email_invalido: "E-mail inválido.",
  senha_curta: "A senha precisa ter pelo menos 6 caracteres.",
  email_em_uso: "Já existe uma conta com esse e-mail.",
  credenciais_invalidas: "E-mail ou senha incorretos.",
  campos_faltando: "Preencha e-mail e senha.",
};

interface AuthScreenProps {
  auth: AuthApi;
}

export default function AuthScreen({ auth }: AuthScreenProps) {
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const submeter = async () => {
    if (loading) return;
    setErro(null);
    setLoading(true);
    const r = modo === "login" ? await auth.login({ email, senha }) : await auth.signup({ email, senha, nome });
    setLoading(false);
    if (!r.ok) setErro((r.error && ERROS[r.error]) || "Não deu pra continuar. Tenta de novo.");
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
          <div style={{ fontSize: 21, fontWeight: 800, color: TEXT }}>{modo === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</div>
          <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>{modo === "login" ? "Continue sua rotina de onde parou." : "Comece a acompanhar treino, dieta e metas."}</div>
        </div>

        {modo === "cadastro" && (
          <IconInput icon={IconUserPlus} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        )}
        <IconInput icon={IconMail} type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <IconInput
          icon={IconLock}
          type={verSenha ? "text" : "password"}
          placeholder={modo === "cadastro" ? "Crie uma senha (mín. 6 caracteres)" : "Senha"}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete={modo === "login" ? "current-password" : "new-password"}
          onKeyDown={(e) => e.key === "Enter" && submeter()}
          right={
            <button type="button" onClick={() => setVerSenha((v) => !v)} style={{ background: "none", border: "none", color: SUB, cursor: "pointer", display: "flex" }}>
              {verSenha ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          }
        />

        {erro && <div style={{ color: RED, fontSize: 12, marginBottom: 8, textAlign: "center" }}>{erro}</div>}

        <button onClick={submeter} disabled={loading} className="tapable" style={{ ...sBtn(PINK, true), marginTop: 6, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Um instante..." : modo === "login" ? "Entrar" : "Criar cadastro"}
        </button>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: SUB }}>
          {modo === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <button onClick={() => { setModo(modo === "login" ? "cadastro" : "login"); setErro(null); }} style={{ background: "none", border: "none", color: PURP, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
            {modo === "login" ? "Criar cadastro" : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
