export type RiskLevel = "Verde" | "Amarillo" | "Rojo";
export type RuleClassification = "Rojo" | "Amarillo";
export type MLPrediction = 0 | 1;

export interface ReglaAlerta {
  id_alerta: string;
  id_siniestro: string;
  codigo_regla: string;
  nombre_regla: string;
  clasificacion: RuleClassification;
  severidad: string;
  variable_evaluada: string;
  valor_detectado: string;
  evidencia?: string;
  explicacion: string;
}

export interface ScoreSiniestro {
  id_score: string;
  id_siniestro: string;
  score_heuristico: number;
  prediccion_ml: MLPrediction | null;
  probabilidad_ml: number | null;
  score_final: number | null;
  nivel_riesgo: RiskLevel;
  reglas_criticas_activadas: string | null;
  factores_principales: string | null;
  explicacion_final: string | null;
  accion_sugerida: string | null;
  mensaje_ia: string | null;
  fecha_evaluacion: string;
  version_modelo: string | null;
}

export interface SiniestroBase {
  id_siniestro: string;
  id_poliza: string | null;
  id_asegurado: string | null;
  id_vehiculo: string | null;
  id_proveedor: string | null;
  ramo: string | null;
  cobertura: string | null;
  ciudad: string | null;
  fecha_ocurrencia: string | null;
  fecha_reporte: string | null;
  monto_reclamado: number;
  monto_estimado: number;
  monto_pagado: number;
  estado: string | null;
  descripcion: string | null;
  documentos_completos: boolean;
  etiqueta_fraude_simulada: number | null;
}

export interface SiniestroCompleto extends SiniestroBase {
  score_heuristico: number | null;
  prediccion_ml: MLPrediction | null;
  probabilidad_ml: number | null;
  score_final: number | null;
  nivel_riesgo: RiskLevel | null;
  reglas_criticas_activadas: string | null;
  factores_principales: string | null;
  explicacion_final: string | null;
  accion_sugerida: string | null;
  mensaje_ia: string | null;
  fecha_evaluacion: string | null;
  suma_asegurada: number | null;
  fecha_inicio_poliza: string | null;
  fecha_fin_poliza: string | null;
  historial_siniestros_asegurado: number | null;
  en_lista_restrictiva: boolean | null;
  reglas?: ReglaAlerta[];
}

export interface ClaimsStats {
  total: number;
  verde: number;
  amarillo: number;
  rojo: number;
  sinScore: number;
  score_final_promedio: number;
  score_heuristico_promedio: number;
  probabilidad_ml_promedio: number;
  monto_total: number;
  monto_rojo: number;
  ahorro_potencial: number;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  enfoque?: "sql_preescrito" | "sql_dinamico" | "conversacional" | "catalogo";
  query_usada?: string;
  modo?: "conversacional" | "catalogo" | "sql_dinamico";
  detalle?: string;
  tiempo?: number;
}

export interface FilterState {
  nivel_riesgo: RiskLevel[];
  ramos: string[];
  ciudades: string[];
  proveedor: string;
  score_min: number;
  score_max: number;
  con_reglas_criticas: boolean;
  documentos_incompletos: boolean;
}

export interface ProveedorStats {
  id_proveedor: string;
  nombre_proveedor_sintetico: string | null;
  casos_totales: number;
  casos_rojos: number;
  pct_alertas: number;
  monto_promedio: number;
  monto_total: number;
  en_lista_restrictiva: boolean;
  nivel_riesgo: RiskLevel;
  ciudad: string | null;
}

export interface GraphNode {
  id: string;
  type: "siniestro" | "asegurado" | "vehiculo" | "proveedor";
  label: string;
  risk?: RiskLevel | null;
  value?: number;
  nivel_riesgo?: string;
  score?: number;
  probabilidad_ml?: number;
  ramo?: string;
  ciudad?: string;
  monto?: number;
  casos?: number;
  casos_rojos?: number;
  en_lista_restrictiva?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface RamoStats {
  ramo: string;
  total: number;
  rojo: number;
  amarillo: number;
  verde: number;
  pct_sospechosos: number;
}

export interface HistogramBucket {
  range: string;
  count: number;
  min: number;
  max: number;
}

export interface CatalogoRegla {
  codigo_regla: string;
  nombre_regla: string;
  descripcion: string | null;
  tipo_regla: string | null;
  clasificacion_base: "Verde" | "Amarillo" | "Rojo" | null;
  severidad_base: string | null;
  puntaje_base: number;
  es_critica: boolean;
  activa: boolean;
  umbral_1: number | null;
  umbral_2: number | null;
  puntos_nivel_1: number;
  puntos_nivel_2: number;
  unidad: string | null;
  direccion: string | null;
  condicion_descripcion: string | null;
  created_at: string;
}

export interface ExportRow {
  id_siniestro: string;
  ramo: string | null;
  ciudad: string | null;
  monto_reclamado: number;
  score_heuristico: number | null;
  score_final: number | null;
  nivel_riesgo: string | null;
  prediccion_ml: number | null;
  probabilidad_ml: number | null;
  reglas_criticas_activadas: string | null;
  accion_sugerida: string | null;
}
