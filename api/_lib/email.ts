// Envio de e-mail transacional (por enquanto so recuperacao de senha) via
// API HTTP da Resend (https://resend.com) — sem SDK, so fetch, pra nao
// adicionar mais uma dependencia so por causa de um POST. Sem
// RESEND_API_KEY/EMAIL_FROM configuradas (dev local, ou quem ainda nao
// configurou em producao), o link cai no console do servidor em vez de
// email de verdade — mesmo espirito do fallback de VAPID em push.ts.

interface SendPasswordResetInput {
  to: string;
  nome: string;
  resetUrl: string;
}

export interface SendResult {
  sent: boolean;
  skipped?: string;
}

function emailHtml(nome: string, resetUrl: string): string {
  const primeiroNome = (nome || "").split(" ")[0] || "";
  return `
<div style="background:#0d0118;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:420px;margin:0 auto;background:#160d28;border-radius:16px;padding:32px 28px;border:1px solid #2a1a45;">
    <div style="font-size:18px;font-weight:800;background:linear-gradient(90deg,#e040fb,#a855f7);-webkit-background-clip:text;background-clip:text;color:#e040fb;margin-bottom:20px;">Rotina & Metas</div>
    <p style="color:#ede9f6;font-size:14px;line-height:1.5;margin:0 0 8px;">Oi${primeiroNome ? `, ${primeiroNome}` : ""}!</p>
    <p style="color:#ede9f6;font-size:14px;line-height:1.5;margin:0 0 20px;">Pediram a redefinição da senha da sua conta. Se foi você, toque no botão abaixo pra escolher uma senha nova. O link expira em 1 hora.</p>
    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#e040fb,#a855f7);color:#fff;font-weight:700;font-size:13px;text-decoration:none;padding:12px 20px;border-radius:10px;">Redefinir minha senha</a>
    <p style="color:#7c6a9a;font-size:11px;line-height:1.5;margin:24px 0 0;">Se não foi você quem pediu, é só ignorar este e-mail — sua senha continua a mesma.</p>
  </div>
</div>`.trim();
}

export async function sendPasswordResetEmail({ to, nome, resetUrl }: SendPasswordResetInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn("[email] RESEND_API_KEY/EMAIL_FROM nao configuradas — email de recuperacao nao enviado. Link de reset:", resetUrl);
    return { sent: false, skipped: "email_not_configured" };
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: "Redefinir sua senha — Rotina & Metas",
        html: emailHtml(nome, resetUrl),
      }),
    });
    if (!r.ok) {
      console.error("[email] Resend recusou o envio:", r.status, await r.text().catch(() => ""));
      return { sent: false, skipped: "send_failed" };
    }
    return { sent: true };
  } catch (err: any) {
    console.error("[email] falha ao chamar a Resend:", err?.message || err);
    return { sent: false, skipped: "send_failed" };
  }
}
