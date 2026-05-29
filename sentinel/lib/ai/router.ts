import { generateText, LLM_PROVIDER } from "@/lib/llm";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { CATALOG, CATALOG_DESCRIPTIONS } from "@/lib/ai/catalog";
import { loadScoredClaims } from "@/lib/ai/data-access";
import { ETHICAL_MESSAGE } from "@/lib/constants";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface RouterResult {
  answer: string;
  mode: "conversacional" | "catalogo" | "sql_dinamico";
  detail: string;
}

const CONVO_PATTERNS = /^(hola|buenos|gracias|qué podés|qué puedes|quién eres|cuál es tu|ayuda|help)/i;

async function classifyCatalog(question: string): Promise<string | null> {
  const descList = Object.entries(CATALOG_DESCRIPTIONS)
    .map(([k, v]) => `"${k}": ${v}`)
    .join("\n");
  const prompt = `Tenés estas consultas disponibles:
${descList}

Pregunta del usuario: "${question}"

¿Cuál consulta responde mejor la pregunta? Respondé SOLO el nombre exacto de la consulta (sin comillas) o "ninguna" si no aplica.`;

  try {
    const raw = (await generateText({ user: prompt, maxTokens: 50, fast: true })).trim();
    const key = raw.replace(/[^a-z_]/gi, "").toLowerCase();
    return key in CATALOG ? key : null;
  } catch {
    return null;
  }
}

function buildHistory(history: ChatTurn[]): string {
  if (history.length === 0) return "";
  return history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "Analista" : "SENTINEL"}: ${t.content}`)
    .join("\n");
}

export async function routeAndAnswer(
  question: string,
  history: ChatTurn[]
): Promise<RouterResult> {
  // 1. Conversacional
  if (CONVO_PATTERNS.test(question.trim())) {
    const answer = await generateText({
      system: SYSTEM_PROMPT,
      user: `${buildHistory(history)}\nAnalista: ${question}`,
      maxTokens: 512,
    });
    return { answer, mode: "conversacional", detail: "" };
  }

  // 2. Catálogo
  const catalogKey = await classifyCatalog(question);
  if (catalogKey) {
    const claims = await loadScoredClaims();
    const result = CATALOG[catalogKey].fn(claims);
    const dataStr = JSON.stringify(result.data, null, 2);
    const answer = await generateText({
      system: SYSTEM_PROMPT,
      user: `${buildHistory(history)}\nAnalista: ${question}\n\nDatos de la consulta "${result.description}":\n${dataStr}\n\nRespondé en lenguaje natural basándote en estos datos. Incluí el mensaje ético al final.`,
      maxTokens: 1024,
    });
    return { answer, mode: "catalogo", detail: catalogKey };
  }

  // 3. Fallback: respuesta general con LLM
  const claims = await loadScoredClaims();
  const summary = {
    total: claims.length,
    rojo: claims.filter((c) => c.nivel_riesgo === "Rojo").length,
    amarillo: claims.filter((c) => c.nivel_riesgo === "Amarillo").length,
    verde: claims.filter((c) => c.nivel_riesgo === "Verde").length,
    score_promedio: claims.reduce((s, c) => s + (c.score_final ?? 0), 0) / (claims.length || 1),
  };
  const answer = await generateText({
    system: SYSTEM_PROMPT,
    user: `${buildHistory(history)}\nAnalista: ${question}\n\nResumen del portafolio actual: ${JSON.stringify(summary)}\n\nResponde con la información disponible. Incluí: "${ETHICAL_MESSAGE}"`,
    maxTokens: 1024,
  });
  return { answer, mode: "sql_dinamico", detail: "fallback_llm" };
}

export { LLM_PROVIDER };
