import type { SiniestroCompleto } from "@/lib/types";

export interface CatalogResult {
  name: string;
  description: string;
  data: unknown;
}

export type CatalogFn = (claims: SiniestroCompleto[], params?: Record<string, string>) => CatalogResult;

export const CATALOG: Record<string, { description: string; fn: CatalogFn }> = {
  top10_mayor_riesgo: {
    description: "Top 10 siniestros con mayor score de riesgo",
    fn: (claims) => ({
      name: "top10_mayor_riesgo",
      description: "Top 10 siniestros con mayor riesgo",
      data: [...claims]
        .filter((c) => c.score_final != null)
        .sort((a, b) => (b.score_final ?? 0) - (a.score_final ?? 0))
        .slice(0, 10)
        .map((c) => ({
          id: c.id_siniestro,
          ramo: c.ramo,
          ciudad: c.ciudad,
          monto: c.monto_reclamado,
          score_final: c.score_final,
          nivel: c.nivel_riesgo,
          reglas: c.reglas_criticas_activadas,
          accion: c.accion_sugerida,
        })),
    }),
  },

  resumen_ejecutivo: {
    description: "Resumen estadístico ejecutivo del portafolio",
    fn: (claims) => {
      const rojo = claims.filter((c) => c.nivel_riesgo === "Rojo");
      return {
        name: "resumen_ejecutivo",
        description: "Resumen ejecutivo",
        data: {
          total: claims.length,
          rojo: rojo.length,
          amarillo: claims.filter((c) => c.nivel_riesgo === "Amarillo").length,
          verde: claims.filter((c) => c.nivel_riesgo === "Verde").length,
          score_promedio: claims.reduce((s, c) => s + (c.score_final ?? 0), 0) / (claims.length || 1),
          monto_total: claims.reduce((s, c) => s + (c.monto_reclamado || 0), 0),
          monto_expuesto_rojo: rojo.reduce((s, c) => s + (c.monto_reclamado || 0), 0),
        },
      };
    },
  },

  prioridad_revision: {
    description: "Casos críticos que el analista debería revisar primero",
    fn: (claims) => ({
      name: "prioridad_revision",
      description: "Casos prioritarios para revisión",
      data: [...claims]
        .filter((c) => c.nivel_riesgo === "Rojo")
        .sort((a, b) => (b.score_final ?? 0) - (a.score_final ?? 0))
        .slice(0, 15)
        .map((c) => ({
          id: c.id_siniestro,
          score_final: c.score_final,
          probabilidad_ml: c.probabilidad_ml,
          reglas: c.reglas_criticas_activadas,
          accion: c.accion_sugerida,
        })),
    }),
  },
};

export const CATALOG_DESCRIPTIONS = Object.fromEntries(
  Object.entries(CATALOG).map(([k, v]) => [k, v.description])
);
