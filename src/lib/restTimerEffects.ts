// Feedback de conclusao do timer de descanso — sem dependencia nova nem
// asset de audio: som via AudioContext/OscillatorNode, vibracao, e
// notificacao so se a permissao ja foi concedida (pedida uma unica vez,
// depois do primeiro uso real do timer, nunca no primeiro acesso ao app).

let ctx: AudioContext | null = null;

// Precisa rodar dentro do mesmo gesto de clique que inicia o timer, pra
// destravar o AudioContext no Safari/iOS antes do beep tocar sozinho depois.
export function unlockAudio(): void {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ctx && Ctor) ctx = new Ctor();
    if (ctx && ctx.state === "suspended") ctx.resume();
  } catch {
    // sem suporte a Web Audio: segue sem som
  }
}

function beep(freq: number, startOffset: number, duration = 0.15): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t0 = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function fireRestComplete(label: string): void {
  try {
    navigator.vibrate?.([200, 80, 200]);
  } catch {
    // sem suporte a vibracao
  }
  try {
    unlockAudio();
    beep(880, 0);
    beep(1046, 0.18);
  } catch {
    // sem suporte a audio
  }
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Descanso concluído!", { body: `${label} — hora da próxima série`, icon: "/icon-192.png", tag: "rest-timer" });
    }
  } catch {
    // sem suporte a Notification
  }
}

// So pede permissao na 1a vez que a pessoa usa o timer de verdade, nunca
// insiste de novo (mesmo se negar) — Notification.permission so fica
// "default" antes da 1a decisao do usuario.
export function maybeRequestNotifPermission(userId?: string | null): void {
  if (typeof Notification === "undefined" || !userId || Notification.permission !== "default") return;
  const key = `rm_notif_asked_${userId}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // sem localStorage: segue sem pedir (evita pedir toda vez)
    return;
  }
  Notification.requestPermission().catch(() => {});
}
