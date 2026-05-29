import { supabase } from "@/lib/supabase";
import type { SiniestroBase, SiniestroCompleto, ReglaAlerta } from "@/lib/types";

export async function getSinestrosCompletos(): Promise<SiniestroCompleto[]> {
  // Try view first
  const { data: view, error: viewErr } = await supabase
    .from("v_siniestro_completo")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!viewErr && view) return view as SiniestroCompleto[];

  // Fallback: manual JOIN
  const [{ data: sins }, { data: scores }, { data: polizas }, { data: vrs }, { data: provs }] =
    await Promise.all([
      supabase.from("siniestro").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("score_siniestro").select("*"),
      supabase.from("poliza").select("id_poliza,suma_asegurada,fecha_inicio,fecha_fin"),
      supabase.from("variable_riesgo").select("id_siniestro,historial_siniestros_asegurado"),
      supabase.from("proveedor").select("id_proveedor,en_lista_restrictiva"),
    ]);

  const scoreMap = new Map((scores ?? []).map((s: Record<string, unknown>) => [s.id_siniestro, s]));
  const polizaMap = new Map((polizas ?? []).map((p: Record<string, unknown>) => [p.id_poliza, p]));
  const vrMap = new Map((vrs ?? []).map((v: Record<string, unknown>) => [v.id_siniestro, v]));
  const provMap = new Map((provs ?? []).map((p: Record<string, unknown>) => [p.id_proveedor, p]));

  return (sins ?? []).map((s: Record<string, unknown>) => {
    const sc = scoreMap.get(s.id_siniestro as string) as Record<string, unknown> | undefined;
    const pol = polizaMap.get(s.id_poliza as string) as Record<string, unknown> | undefined;
    const vr = vrMap.get(s.id_siniestro as string) as Record<string, unknown> | undefined;
    const prov = provMap.get(s.id_proveedor as string) as Record<string, unknown> | undefined;
    return {
      ...s,
      score_heuristico: sc?.score_heuristico ?? null,
      prediccion_ml: sc?.prediccion_ml ?? null,
      probabilidad_ml: sc?.probabilidad_ml ?? null,
      score_final: sc?.score_final ?? null,
      nivel_riesgo: sc?.nivel_riesgo ?? null,
      reglas_criticas_activadas: sc?.reglas_criticas_activadas ?? null,
      factores_principales: sc?.factores_principales ?? null,
      explicacion_final: sc?.explicacion_final ?? null,
      accion_sugerida: sc?.accion_sugerida ?? null,
      mensaje_ia: sc?.mensaje_ia ?? null,
      fecha_evaluacion: sc?.fecha_evaluacion ?? null,
      suma_asegurada: pol?.suma_asegurada ?? null,
      fecha_inicio_poliza: pol?.fecha_inicio ?? null,
      fecha_fin_poliza: pol?.fecha_fin ?? null,
      historial_siniestros_asegurado: vr?.historial_siniestros_asegurado ?? null,
      en_lista_restrictiva: prov?.en_lista_restrictiva ?? null,
    } as SiniestroCompleto;
  });
}

export async function getReglasBySiniestro(id: string): Promise<ReglaAlerta[]> {
  const { data } = await supabase
    .from("alerta_regla")
    .select("*")
    .eq("id_siniestro", id)
    .order("clasificacion");
  return (data ?? []) as ReglaAlerta[];
}

export async function getSiniestrosBase(): Promise<SiniestroBase[]> {
  const { data } = await supabase
    .from("siniestro")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as SiniestroBase[];
}

export interface ExistingIds {
  siniestros: string[];
  polizas: string[];
  asegurados: string[];
  vehiculos: string[];
  proveedores: string[];
}

export async function getExistingIds(): Promise<ExistingIds> {
  const [{ data: s }, { data: p }, { data: a }, { data: v }, { data: pr }] = await Promise.all([
    supabase.from("siniestro").select("id_siniestro"),
    supabase.from("poliza").select("id_poliza"),
    supabase.from("asegurado").select("id_asegurado"),
    supabase.from("vehiculo").select("id_vehiculo"),
    supabase.from("proveedor").select("id_proveedor"),
  ]);
  return {
    siniestros: (s ?? []).map((r: Record<string, unknown>) => r.id_siniestro as string),
    polizas: (p ?? []).map((r: Record<string, unknown>) => r.id_poliza as string),
    asegurados: (a ?? []).map((r: Record<string, unknown>) => r.id_asegurado as string),
    vehiculos: (v ?? []).map((r: Record<string, unknown>) => r.id_vehiculo as string),
    proveedores: (pr ?? []).map((r: Record<string, unknown>) => r.id_proveedor as string),
  };
}

export async function bulkInsertSiniestros(
  rows: Partial<SiniestroBase>[]
): Promise<{ ok: boolean; inserted: number; insertedIds: string[]; error?: string }> {
  if (rows.length === 0) return { ok: true, inserted: 0, insertedIds: [] };
  const { data, error } = await supabase.from("siniestro").insert(rows).select("id_siniestro");
  if (error) return { ok: false, inserted: 0, insertedIds: [], error: error.message };
  const insertedIds = (data ?? []).map((r: Record<string, unknown>) => r.id_siniestro as string);
  return { ok: true, inserted: insertedIds.length, insertedIds };
}

export async function createSiniestro(
  data: Partial<SiniestroBase>
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("siniestro").insert(data);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateSiniestro(
  id: string,
  data: Partial<SiniestroBase>
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("siniestro").update(data).eq("id_siniestro", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSiniestro(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("siniestro").delete().eq("id_siniestro", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
