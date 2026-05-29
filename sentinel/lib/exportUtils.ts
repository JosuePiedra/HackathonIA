import type { SiniestroCompleto } from "@/lib/types";

export type ExportType = "red" | "top10" | "executive";

const CSV_HEADERS = [
  "id_siniestro", "ramo", "ciudad", "monto_reclamado",
  "score_heuristico", "score_final", "nivel_riesgo",
  "prediccion_ml", "probabilidad_ml",
  "reglas_criticas_activadas", "accion_sugerida",
];

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsvContent(claims: SiniestroCompleto[]): string {
  const rows = claims.map((c) =>
    CSV_HEADERS.map((h) => esc(c[h as keyof SiniestroCompleto])).join(",")
  );
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

export function claimsToCSV(claims: SiniestroCompleto[]): string {
  return buildCsvContent(claims);
}

export function claimsToHTML(claims: SiniestroCompleto[]): string {
  const rows = claims
    .map((c) => `<tr>
      <td>${c.id_siniestro}</td><td>${c.ramo ?? ""}</td>
      <td>${c.ciudad ?? ""}</td><td>${c.monto_reclamado}</td>
      <td>${c.score_final ?? ""}</td><td>${c.nivel_riesgo ?? ""}</td>
      <td>${c.accion_sugerida ?? ""}</td>
    </tr>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Ejecutivo</title></head>
<body><h1>Reporte Ejecutivo</h1>
<table border="1" cellpadding="6">
<thead><tr><th>ID</th><th>Ramo</th><th>Ciudad</th><th>Monto</th><th>Score</th><th>Nivel</th><th>Acción</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`;
}

export function selectByType(claims: SiniestroCompleto[], type: ExportType): SiniestroCompleto[] {
  if (type === "red") return claims.filter((c) => c.nivel_riesgo === "Rojo");
  if (type === "top10")
    return [...claims]
      .filter((c) => c.score_final != null)
      .sort((a, b) => (b.score_final ?? 0) - (a.score_final ?? 0))
      .slice(0, 10);
  return claims;
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
