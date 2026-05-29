import { NextResponse } from "next/server";
import { generateText, LLM_PROVIDER } from "@/lib/llm";
import { SINIESTRO_COLUMNS } from "@/lib/constants";

function keyMissing(): string | null {
  if (LLM_PROVIDER === "gemini" && !process.env.GEMINI_API_KEY)
    return "GEMINI_API_KEY no configurada en el servidor.";
  if (LLM_PROVIDER === "anthropic" && !process.env.ANTHROPIC_API_KEY)
    return "ANTHROPIC_API_KEY no configurada en el servidor.";
  return null;
}

const ALLOWED = new Set<string>(SINIESTRO_COLUMNS);

/** Heurística por nombre de header → columna destino (fallback robusto). */
function heuristicMatch(header: string): string | null {
  const h = header.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (ALLOWED.has(h)) return h;
  const rules: [RegExp, string][] = [
    [/(siniestro|claim|case)(_?id)?$|^id_siniestro/, "id_siniestro"],
    [/poliz|policy/, "id_poliza"],
    [/asegurad|insured|client/, "id_asegurado"],
    [/veh[íi]cul|vehicle/, "id_vehiculo"],
    [/proveedor|provider|taller/, "id_proveedor"],
    [/ramo|branch|^line$/, "ramo"],
    [/cobertura|coverage/, "cobertura"],
    [/ciudad|city/, "ciudad"],
    [/ocurrenc|occurrence|loss_date/, "fecha_ocurrencia"],
    [/reporte|report/, "fecha_reporte"],
    [/reclamad|claimed/, "monto_reclamado"],
    [/estimad|estimated/, "monto_estimado"],
    [/pagad|paid/, "monto_pagado"],
    [/estado|status/, "estado"],
    [/descrip|description|detalle/, "descripcion"],
    [/document.*complet|docs.*complet/, "documentos_completos"],
    [/etiqueta|label|fraude_sim/, "etiqueta_fraude_simulada"],
  ];
  for (const [re, col] of rules) if (re.test(h)) return col;
  return null;
}

export async function POST(req: Request) {
  let headers: string[] = [];
  let sample: Record<string, string>[] = [];
  try {
    const body = (await req.json()) as { headers?: string[]; sample?: Record<string, string>[] };
    headers = Array.isArray(body.headers) ? body.headers : [];
    sample = Array.isArray(body.sample) ? body.sample.slice(0, 3) : [];
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (headers.length === 0) {
    return NextResponse.json({ error: "Faltan los headers del CSV." }, { status: 400 });
  }

  // 1) Mapeo por IA (si hay key configurada).
  const aiMapping: Record<string, string | null> = {};
  if (!keyMissing()) {
    const system = `Mapeás columnas de un CSV a las columnas de la tabla 'siniestro' de una aseguradora.
Columnas DESTINO válidas: ${SINIESTRO_COLUMNS.join(", ")}.
Para cada header del CSV, elegí la columna destino que mejor corresponda según el NOMBRE del header Y los VALORES de ejemplo. Si ninguna corresponde, usá null. No uses la misma columna destino para dos headers. No inventes columnas fuera de la lista.
Devolvé SOLO un objeto JSON {"<header_del_csv>": "<columna_destino_o_null>", ...}, sin texto ni markdown.`;
    const user = `Headers del CSV: ${JSON.stringify(headers)}

Primeras filas:
${JSON.stringify(sample, null, 2)}`;
    try {
      const raw = await generateText({ system, user, maxTokens: 600, fast: true });
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const m = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : cleaned) as Record<string, unknown>;
      for (const h of headers) {
        const v = parsed[h];
        aiMapping[h] = typeof v === "string" && ALLOWED.has(v) ? v : null;
      }
    } catch {
      /* sin IA → solo heurística */
    }
  }

  // 2) Combinar IA + heurística, sin asignar una misma columna a dos headers.
  const used = new Set<string>();
  const mapping: Record<string, string | null> = {};
  for (const h of headers) {
    const v = aiMapping[h];
    if (v && !used.has(v)) {
      mapping[h] = v;
      used.add(v);
    } else mapping[h] = null;
  }
  for (const h of headers) {
    if (mapping[h]) continue;
    const guess = heuristicMatch(h);
    if (guess && !used.has(guess)) {
      mapping[h] = guess;
      used.add(guess);
    }
  }

  return NextResponse.json({ mapping });
}
