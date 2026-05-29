import Papa from "papaparse";
import type { SiniestroBase } from "@/lib/types";

export async function parseRawCSV(
  text: string
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = result.meta.fields?.map((f) => f.trim()) ?? [];
        const rows = result.data.map((row) => {
          const clean: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) clean[k.trim()] = (v ?? "").trim();
          return clean;
        });
        resolve({ headers, rows });
      },
      error: (err: { message: string }) => reject(new Error(err.message)),
    });
  });
}

export function normalizeSiniestroBaseRow(
  row: Record<string, string>
): Partial<SiniestroBase> {
  const toNum = (v: string) => {
    const n = parseFloat(v.replace(/,/g, ""));
    return isNaN(n) ? undefined : n;
  };
  const toBool = (v: string) =>
    v.toLowerCase() === "true" || v === "1" || v.toLowerCase() === "sí" || v.toLowerCase() === "si";

  return {
    id_siniestro: row.id_siniestro || undefined,
    id_poliza: row.id_poliza || undefined,
    id_asegurado: row.id_asegurado || undefined,
    id_vehiculo: row.id_vehiculo || undefined,
    id_proveedor: row.id_proveedor || undefined,
    ramo: row.ramo || undefined,
    cobertura: row.cobertura || undefined,
    ciudad: row.ciudad || undefined,
    estado: row.estado || undefined,
    descripcion: row.descripcion || undefined,
    fecha_ocurrencia: row.fecha_ocurrencia || undefined,
    fecha_reporte: row.fecha_reporte || undefined,
    monto_reclamado: row.monto_reclamado ? toNum(row.monto_reclamado) : undefined,
    monto_estimado: row.monto_estimado ? toNum(row.monto_estimado) : undefined,
    monto_pagado: row.monto_pagado ? toNum(row.monto_pagado) : undefined,
    documentos_completos: row.documentos_completos ? toBool(row.documentos_completos) : undefined,
    etiqueta_fraude_simulada: row.etiqueta_fraude_simulada
      ? toNum(row.etiqueta_fraude_simulada)
      : undefined,
  };
}
