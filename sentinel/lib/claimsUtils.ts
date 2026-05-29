import type {
  SiniestroCompleto,
  ClaimsStats,
  FilterState,
  GraphData,
  GraphNode,
  GraphLink,
  ProveedorStats,
  RamoStats,
  HistogramBucket,
} from "@/lib/types";

export function computeStats(claims: SiniestroCompleto[]): ClaimsStats {
  const verde = claims.filter((c) => c.nivel_riesgo === "Verde").length;
  const amarillo = claims.filter((c) => c.nivel_riesgo === "Amarillo").length;
  const rojo = claims.filter((c) => c.nivel_riesgo === "Rojo").length;
  const sinScore = claims.filter((c) => c.score_final == null).length;
  const scored = claims.filter((c) => c.score_final != null);
  const monto_total = claims.reduce((s, c) => s + (c.monto_reclamado || 0), 0);
  const monto_rojo = claims
    .filter((c) => c.nivel_riesgo === "Rojo")
    .reduce((s, c) => s + (c.monto_reclamado || 0), 0);
  return {
    total: claims.length,
    verde,
    amarillo,
    rojo,
    sinScore,
    score_final_promedio:
      scored.length > 0
        ? scored.reduce((s, c) => s + (c.score_final ?? 0), 0) / scored.length
        : 0,
    score_heuristico_promedio:
      scored.length > 0
        ? scored.reduce((s, c) => s + (c.score_heuristico ?? 0), 0) / scored.length
        : 0,
    probabilidad_ml_promedio:
      scored.length > 0
        ? scored.reduce((s, c) => s + (c.probabilidad_ml ?? 0), 0) / scored.length
        : 0,
    monto_total,
    monto_rojo,
    ahorro_potencial: monto_rojo * 0.35,
  };
}

export function filterClaims(
  claims: SiniestroCompleto[],
  f: FilterState
): SiniestroCompleto[] {
  return claims.filter((c) => {
    if (f.nivel_riesgo.length > 0 && c.nivel_riesgo && !f.nivel_riesgo.includes(c.nivel_riesgo))
      return false;
    if (f.ramos.length > 0 && c.ramo && !f.ramos.includes(c.ramo)) return false;
    if (f.ciudades.length > 0 && c.ciudad && !f.ciudades.includes(c.ciudad)) return false;
    if (f.proveedor && c.id_proveedor !== f.proveedor) return false;
    const score = c.score_final ?? 0;
    if (score < f.score_min || score > f.score_max) return false;
    if (f.con_reglas_criticas && !c.reglas_criticas_activadas) return false;
    if (f.documentos_incompletos && c.documentos_completos) return false;
    return true;
  });
}

export function getTopProviders(claims: SiniestroCompleto[], limit = 10): ProveedorStats[] {
  const map = new Map<string, ProveedorStats>();
  for (const c of claims) {
    if (!c.id_proveedor) continue;
    const existing = map.get(c.id_proveedor);
    const isRojo = c.nivel_riesgo === "Rojo";
    if (existing) {
      existing.casos_totales += 1;
      existing.casos_rojos += isRojo ? 1 : 0;
      existing.monto_total += c.monto_reclamado || 0;
    } else {
      map.set(c.id_proveedor, {
        id_proveedor: c.id_proveedor,
        nombre_proveedor_sintetico: null,
        casos_totales: 1,
        casos_rojos: isRojo ? 1 : 0,
        pct_alertas: 0,
        monto_promedio: 0,
        monto_total: c.monto_reclamado || 0,
        en_lista_restrictiva: c.en_lista_restrictiva ?? false,
        nivel_riesgo: c.nivel_riesgo ?? "Verde",
        ciudad: null,
      });
    }
  }
  return Array.from(map.values())
    .map((p) => ({
      ...p,
      pct_alertas: p.casos_totales > 0 ? (p.casos_rojos / p.casos_totales) * 100 : 0,
      monto_promedio: p.casos_totales > 0 ? p.monto_total / p.casos_totales : 0,
      nivel_riesgo: (p.casos_rojos / Math.max(p.casos_totales, 1) > 0.5
        ? "Rojo"
        : p.casos_rojos > 0
        ? "Amarillo"
        : "Verde") as ProveedorStats["nivel_riesgo"],
    }))
    .sort((a, b) => b.casos_rojos - a.casos_rojos)
    .slice(0, limit);
}

export function getCasesByRamo(claims: SiniestroCompleto[]): RamoStats[] {
  const map = new Map<string, RamoStats>();
  for (const c of claims) {
    const ramo = c.ramo ?? "Desconocido";
    const existing = map.get(ramo);
    if (existing) {
      existing.total += 1;
      if (c.nivel_riesgo === "Rojo") existing.rojo += 1;
      else if (c.nivel_riesgo === "Amarillo") existing.amarillo += 1;
      else existing.verde += 1;
    } else {
      map.set(ramo, {
        ramo,
        total: 1,
        rojo: c.nivel_riesgo === "Rojo" ? 1 : 0,
        amarillo: c.nivel_riesgo === "Amarillo" ? 1 : 0,
        verde: c.nivel_riesgo === "Verde" ? 1 : 0,
        pct_sospechosos: 0,
      });
    }
  }
  return Array.from(map.values()).map((r) => ({
    ...r,
    pct_sospechosos: r.total > 0 ? ((r.rojo + r.amarillo) / r.total) * 100 : 0,
  }));
}

export function getScoreHistogramData(claims: SiniestroCompleto[]): HistogramBucket[] {
  const buckets: HistogramBucket[] = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${i * 10 + 10}`,
    count: 0,
    min: i * 10,
    max: i * 10 + 10,
  }));
  for (const c of claims) {
    if (c.score_final == null) continue;
    const idx = Math.min(Math.floor(c.score_final / 10), 9);
    buckets[idx].count += 1;
  }
  return buckets;
}

export function buildGraphData(claims: SiniestroCompleto[]): GraphData {
  const nodes = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const sample = claims.slice(0, 200);

  for (const c of sample) {
    nodes.set(c.id_siniestro, {
      id: c.id_siniestro,
      type: "siniestro",
      label: c.id_siniestro,
      risk: c.nivel_riesgo,
      value: c.score_final ?? 0,
    });
    if (c.id_asegurado) {
      if (!nodes.has(c.id_asegurado))
        nodes.set(c.id_asegurado, { id: c.id_asegurado, type: "asegurado", label: c.id_asegurado });
      links.push({ source: c.id_siniestro, target: c.id_asegurado, type: "asegurado" });
    }
    if (c.id_vehiculo) {
      if (!nodes.has(c.id_vehiculo))
        nodes.set(c.id_vehiculo, { id: c.id_vehiculo, type: "vehiculo", label: c.id_vehiculo });
      links.push({ source: c.id_siniestro, target: c.id_vehiculo, type: "vehiculo" });
    }
    if (c.id_proveedor) {
      if (!nodes.has(c.id_proveedor))
        nodes.set(c.id_proveedor, {
          id: c.id_proveedor,
          type: "proveedor",
          label: c.id_proveedor,
        });
      links.push({ source: c.id_siniestro, target: c.id_proveedor, type: "proveedor" });
    }
  }
  return { nodes: Array.from(nodes.values()), links };
}

export function computeSavingsEstimate(claims: SiniestroCompleto[], pct: number): number {
  const monto_rojo = claims
    .filter((c) => c.nivel_riesgo === "Rojo")
    .reduce((s, c) => s + (c.monto_reclamado || 0), 0);
  return monto_rojo * (pct / 100);
}
