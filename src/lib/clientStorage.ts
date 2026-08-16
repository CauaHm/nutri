// Cliente fino sobre /api/kv/[key] — mesma ideia do window.storage.get/set
// original, so que persistindo de verdade no Redis do lado do servidor,
// entao Cauã e Rhebecca compartilham os mesmos dados de qualquer aparelho.

export async function kvGet<T = any>(key: string, fallback: T | null = null): Promise<T | null> {
  const r = await fetch(`/api/kv/${encodeURIComponent(key)}`, { cache: "no-store" });
  if (!r.ok) return fallback;
  const { value } = await r.json();
  return value === null || value === undefined ? fallback : value;
}

export async function kvSet(key: string, value: any): Promise<void> {
  await fetch(`/api/kv/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
}

export async function kvGetMany(keys: string[]): Promise<Record<string, any>> {
  const r = await fetch(`/api/kv/many`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys }),
  });
  if (!r.ok) return {};
  const { values } = await r.json();
  return values;
}
