export const APP_VERSION = "1.0.0";

export const SUGGESTED_QUESTIONS = [
  "¿Cuáles son los 10 siniestros con mayor score de riesgo?",
  "¿Qué proveedores tienen más alertas?",
  "¿Qué ramos presentan más casos sospechosos?",
  "¿Qué patrones se repiten en los reclamos sospechosos?",
];

export const COMPLEX_QUESTIONS_EXAMPLES = [
  "¿Hay asegurados con múltiples reclamos en los últimos 12 meses?",
  "¿Qué ciudades concentran más casos rojos y cuál es su monto total expuesto?",
];

export const PREFILL_QUESTION = {
  label: "¿Por qué SIN-XXXX fue marcado? →",
  text: "¿Por qué el siniestro ",
};

export const ETHICAL_MESSAGE =
  "Esta evaluación es una alerta para revisión humana, no una acusación automática ni una decisión de rechazo.";

export const RED_RULE_CODES = new Set(["RF-01", "RF-02", "RF-03", "RF-04"]);

export const SINIESTRO_COLUMNS = [
  "id_siniestro",
  "id_poliza",
  "id_asegurado",
  "id_vehiculo",
  "id_proveedor",
  "ramo",
  "cobertura",
  "ciudad",
  "estado",
  "descripcion",
  "fecha_ocurrencia",
  "fecha_reporte",
  "monto_reclamado",
  "monto_estimado",
  "monto_pagado",
  "documentos_completos",
  "etiqueta_fraude_simulada",
] as const;

export type SiniestroColumn = (typeof SINIESTRO_COLUMNS)[number];
