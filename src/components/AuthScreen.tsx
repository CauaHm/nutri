import { useState } from "react";
import IconInput from "@/components/IconInput";
import { IconMail, IconLock, IconEye, IconEyeOff, IconUserPlus, IconDumbbell, IconCheck } from "@/components/icons";
import { BG, PINK, PURP, RED, GRN, SUB, TEXT, sBtn } from "@/lib/theme";
import type { AuthApi } from "@/lib/useAuth";

const ERROS: Record<string, string> = {
  email_invalido: "E-mail inválido.",
  senha_curta: "A senha precisa ter pelo menos 6 caracteres.",
  email_em_uso: "Já existe uma conta com esse e-mail.",
  credenciais_invalidas: "E-mail ou senha incorretos.",
  campos_faltando: "Preencha e-mail e senha.",
  token_invalido: "Esse link de recuperação é inválido ou já expirou. Peça um novo.",
};

// Link do email de recuperacao aponta pra raiz do app com ?reset=<token> —
// nao ha router nenhum aqui (SPA sem rotas), entao a deteccao e so ler a
// query string uma vez no mount e ja tirar da URL em seguida (evita reusar
// um token consumido se a pessoa atualizar a pagina depois).
function tokenDaUrl(): string | null {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search).get("reset");
  if (token) window.history.replaceState({}, "", window.location.pathname);
  return token;
}

interface AuthScreenProps {
  auth: AuthApi;
}

export default function AuthScreen({ auth }: AuthScreenProps) {
  const [resetToken] = useState(tokenDaUrl);
  const [modo, setModo] = useState<"login" | "cadastro" | "esqueci" | "redefinir">(resetToken ? "redefinir" : "login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  const irPara = (m: typeof modo) => { setModo(m); setErro(null); setPedidoEnviado(false); };

  const submeter = async () => {
    if (loading) return;
    setErro(null);
    setLoading(true);

    if (modo === "esqueci") {
      if (!email) {
        setLoading(false);
        setErro("Digite seu e-mail.");
        return;
      }
      await auth.forgotPassword({ email });
      setLoading(false);
      setPedidoEnviado(true);
      return;
    }

    if (modo === "redefinir") {
      if (senha !== senha2) {
        setLoading(false);
        setErro("As senhas não coincidem.");
        return;
      }
      const r = await auth.resetPassword({ token: resetToken || "", senha });
      setLoading(false);
      if (!r.ok) setErro((r.error && ERROS[r.error]) || "Não deu pra redefinir. Tenta de novo.");
      return;
    }

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
          <div style={{ fontSize: 21, fontWeight: 800, color: TEXT }}>
            {modo === "login" && "Bem-vindo de volta"}
            {modo === "cadastro" && "Crie sua conta"}
            {modo === "esqueci" && "Recuperar senha"}
            {modo === "redefinir" && "Criar nova senha"}
          </div>
          <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>
            {modo === "login" && "Continue sua rotina de onde parou."}
            {modo === "cadastro" && "Comece a acompanhar treino, dieta e metas."}
            {modo === "esqueci" && "Digite seu e-mail — mandamos um link pra você criar uma senha nova."}
            {modo === "redefinir" && "Escolha uma senha nova pra sua conta."}
          </div>
        </div>

        {modo === "esqueci" && pedidoEnviado ? (
          <div style={{ textAlign: "center", padding: "8px 4px 4px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${GRN}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <IconCheck size={22} style={{ color: GRN }} />
            </div>
            <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
              Se esse e-mail tiver uma conta cadastrada, um link de recuperação chega em instantes. Confira também a caixa de spam.
            </div>
            <button onClick={() => irPara("login")} className="tapable" style={sBtn(PINK, true)}>
              Voltar pro login
            </button>
          </div>
        ) : (
          <>
            {modo === "cadastro" && (
              <IconInput icon={IconUserPlus} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            )}

            {modo !== "redefinir" && (
              <IconInput icon={IconMail} type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" onKeyDown={(e) => e.key === "Enter" && submeter()} />
            )}

            {modo !== "esqueci" && (
              <IconInput
                icon={IconLock}
                type={verSenha ? "text" : "password"}
                placeholder={modo === "cadastro" ? "Crie uma senha (mín. 6 caracteres)" : modo === "redefinir" ? "Nova senha (mín. 6 caracteres)" : "Senha"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                onKeyDown={(e) => e.key === "Enter" && modo !== "redefinir" && submeter()}
                right={
                  <button type="button" onClick={() => setVerSenha((v) => !v)} style={{ background: "none", border: "none", color: SUB, cursor: "pointer", display: "flex" }}>
                    {verSenha ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                }
              />
            )}

            {modo === "redefinir" && (
              <IconInput
                icon={IconLock}
                type={verSenha ? "text" : "password"}
                placeholder="Confirme a nova senha"
                value={senha2}
                onChange={(e) => setSenha2(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && submeter()}
              />
            )}

            {erro && <div style={{ color: RED, fontSize: 12, marginBottom: 8, textAlign: "center" }}>{erro}</div>}

            <button onClick={submeter} disabled={loading} className="tapable" style={{ ...sBtn(PINK, true), marginTop: 6, opacity: loading ? 0.7 : 1 }}>
              {loading
                ? "Um instante..."
                : modo === "login"
                ? "Entrar"
                : modo === "cadastro"
                ? "Criar cadastro"
                : modo === "esqueci"
                ? "Enviar link de recuperação"
                : "Redefinir senha"}
            </button>
          </>
        )}

        {modo !== "redefinir" && !(modo === "esqueci" && pedidoEnviado) && (
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: SUB }}>
            {modo === "login" && (
              <>
                Ainda não tem conta?{" "}
                <button onClick={() => irPara("cadastro")} style={{ background: "none", border: "none", color: PURP, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
                  Criar cadastro
                </button>
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => irPara("esqueci")} style={{ background: "none", border: "none", color: SUB, cursor: "pointer", fontSize: 12, padding: 0 }}>
                    Esqueceu a senha?
                  </button>
                </div>
              </>
            )}
            {modo === "cadastro" && (
              <>
                Já tem conta?{" "}
                <button onClick={() => irPara("login")} style={{ background: "none", border: "none", color: PURP, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
                  Entrar
                </button>
              </>
            )}
            {modo === "esqueci" && (
              <button onClick={() => irPara("login")} style={{ background: "none", border: "none", color: PURP, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
                Voltar pro login
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
