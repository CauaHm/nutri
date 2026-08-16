import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";
import { getSessionUser } from "../_lib/authSession";

// Le uma foto de alimento (ou de rotulo nutricional) + descricao opcional e
// devolve valores nutricionais estruturados pra cadastrar no catalogo.
// Precisa de ANTHROPIC_API_KEY configurada (conta de API separada do plano
// Claude Pro do claude.ai — ver README). Sem a chave, devolve 501 e o
// cliente cai pro fluxo manual/claude.ai.

const FOOD_SCHEMA = {
  type: "object",
  properties: {
    nome: { type: "string", description: "Nome do alimento ou prato identificado" },
    porcaoDesc: { type: "string", description: "Descrição da porção a que os valores se referem, ex: '1 prato (300g)' ou '100g'" },
    kcal: { type: "number", description: "Calorias totais dessa porção" },
    proteinaG: { type: "number", description: "Proteína em gramas dessa porção" },
    carboG: { type: "number", description: "Carboidrato em gramas dessa porção" },
    gorduraG: { type: "number", description: "Gordura em gramas dessa porção" },
    confianca: { type: "string", enum: ["alta", "media", "baixa"], description: "alta se leu de um rótulo/tabela nutricional visível; media/baixa se foi estimativa visual" },
    observacao: { type: "string", description: "Nota curta de uma frase sobre como o valor foi obtido" },
  },
  required: ["nome", "porcaoDesc", "kcal", "proteinaG", "carboG", "gorduraG", "confianca", "observacao"],
  additionalProperties: false,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(501).json({ error: "no_api_key" });
    return;
  }

  const { imageBase64, imageMediaType, descricao } = req.body || {};
  if (!imageBase64 || !imageMediaType) {
    res.status(400).json({ error: "missing_image" });
    return;
  }

  const client = new Anthropic();

  const promptTexto = [
    "Você é um nutricionista analisando uma foto enviada pelo usuário — pode ser um prato de comida, um alimento avulso, ou uma tabela nutricional/rótulo de embalagem.",
    "Se for uma tabela nutricional ou rótulo, leia os valores exatos impressos (marque confiança 'alta').",
    "Se for uma foto do alimento/prato sem rótulo, estime kcal/macros com base em porções típicas e no que a pessoa descreveu (marque confiança 'media' ou 'baixa').",
    descricao ? `Descrição / peso informado pela pessoa: "${descricao}"` : "A pessoa não deu nenhuma descrição adicional — estime pela imagem.",
    "Responda só com os dados estruturados pedidos.",
  ].join("\n");

  let response;
  try {
    response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: FOOD_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: imageMediaType, data: imageBase64 } },
            { type: "text", text: promptTexto },
          ],
        },
      ],
    });
  } catch (err: any) {
    res.status(502).json({ error: "api_error", message: err?.message || String(err) });
    return;
  }

  if ((response as any).stop_reason === "refusal") {
    res.status(422).json({ error: "refusal" });
    return;
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    res.status(502).json({ error: "empty_response" });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    res.status(502).json({ error: "parse_error" });
    return;
  }

  res.status(200).json({ alimento: parsed });
}
