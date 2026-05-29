// ============================================================
// SAMPLE DATA — FraudIA
// ============================================================

const CIUDADES = ['Quito', 'Guayaquil', 'Cuenca', 'Manta', 'Ambato', 'Loja'];
const RAMOS = ['Vehículos', 'Vida', 'Hogar', 'Salud', 'Patrimonial'];
const COBERTURAS = {
  'Vehículos': ['Pérdida total', 'Robo', 'Daños a terceros', 'Colisión'],
  'Vida': ['Muerte natural', 'Muerte accidental', 'Invalidez'],
  'Hogar': ['Incendio', 'Robo', 'Daños por agua'],
  'Salud': ['Hospitalización', 'Ambulatorio', 'Maternidad'],
  'Patrimonial': ['Robo', 'Incendio', 'Responsabilidad civil']
};

const PROVEEDORES_DATA = [
  { id: 'PRV-1042', nombre: 'Taller AutoSur', restrictiva: true },
  { id: 'PRV-2031', nombre: 'Clínica Norte', restrictiva: false },
  { id: 'PRV-3055', nombre: 'Carrocería Express', restrictiva: true },
  { id: 'PRV-1108', nombre: 'Hospital del Valle', restrictiva: false },
  { id: 'PRV-4012', nombre: 'AutoServicio Andino', restrictiva: false },
  { id: 'PRV-5024', nombre: 'Multiservicios Pacífico', restrictiva: false },
  { id: 'PRV-6071', nombre: 'Talleres Quinde', restrictiva: false },
  { id: 'PRV-7083', nombre: 'Clínica San Rafael', restrictiva: false }
];

// Sample siniestros — 10 base + extras for richness
const CASOS_BASE = [
  {
    id: 'SIN-2026-1042',
    asegurado: 'ASG-0921', ciudad: 'Quito', ramo: 'Vehículos', cobertura: 'Pérdida total',
    proveedor: 'PRV-1042', monto_reclamado: 28500, monto_estimado: 14200, monto_pagado: 0,
    suma_asegurada: 32000, fecha_ocurrencia: '2026-04-22', fecha_reporte: '2026-05-18',
    dias_a_reporte: 26, score: 91, nivel: 'red',
    score_reglas: 38, score_modelo: 27, score_anomalias: 13, score_nlp: 13,
    score_nlp_raw: 84,
    reglas: ['RF-01', 'RF-05', 'RF-09'],
    flags: { borde_vigencia: true, reporte_tardio: true, docs_incompletos: false, docs_inconsistentes: true, monto_atipico: true, proveedor_recurrente: true },
    alertas: [
      'Siniestro reportado 26 días después de ocurrencia (umbral: 7 días)',
      'Monto reclamado supera 200% del valor estimado',
      'Proveedor en lista restrictiva con 4 casos rojos previos',
      'Inconsistencia entre factura y descripción del daño'
    ],
    descripcion: 'El vehículo sufrió pérdida total a las 23:40 en una vía secundaria sin testigos. El asegurado reporta colisión contra objeto fijo. Las fotografías muestran daños en zonas que no son consistentes con la mecánica del accidente descrito. El taller asignado emite presupuesto que duplica el avalúo del perito.',
    similar_a: 'SIN-2026-0987',
    explicacion_final: 'El sistema identificó múltiples señales convergentes de riesgo elevado. La combinación de reporte tardío (26 días vs. umbral de 7), monto reclamado superior al doble del estimado por el perito, y la participación de un proveedor con historial de alertas previas configuran un patrón compatible con casos previamente confirmados como fraude. El modelo de similitud narrativa detectó coincidencias del 84% con el siniestro SIN-2026-0987. Se recomienda revisión humana inmediata e inspección física complementaria.',
    mensaje_etico: 'Esta alerta agrega señales objetivas obtenidas del expediente y del histórico. No constituye una acusación formal contra el asegurado, beneficiario o proveedor. La decisión final corresponde al analista humano luego de las verificaciones que considere pertinentes.'
  },
  {
    id: 'SIN-2026-1037',
    asegurado: 'ASG-1248', ciudad: 'Guayaquil', ramo: 'Hogar', cobertura: 'Robo',
    proveedor: 'PRV-3055', monto_reclamado: 18200, monto_estimado: 9800, monto_pagado: 0,
    suma_asegurada: 22000, fecha_ocurrencia: '2026-05-02', fecha_reporte: '2026-05-19',
    dias_a_reporte: 17, score: 87, nivel: 'red',
    score_reglas: 36, score_modelo: 26, score_anomalias: 13, score_nlp: 12,
    score_nlp_raw: 71,
    reglas: ['RF-02', 'RF-07'],
    flags: { borde_vigencia: false, reporte_tardio: true, docs_incompletos: true, docs_inconsistentes: true, monto_atipico: true, proveedor_recurrente: true },
    alertas: [
      'Documentos faltantes: denuncia policial original',
      'Lista de objetos reclamados supera el inventario asegurado',
      'Proveedor en lista restrictiva'
    ],
    descripcion: 'El asegurado reporta robo en su vivienda durante un viaje familiar. Lista 14 artículos sustraídos, varios de los cuales no aparecen en la póliza original ni en el inventario fotográfico inicial. La denuncia policial fue interpuesta 11 días después del hecho.',
    similar_a: null,
    explicacion_final: 'Existen inconsistencias documentales significativas. La lista de objetos sustraídos incluye bienes no declarados al momento de contratar la cobertura. El retraso en la denuncia policial y la ausencia de soportes complementarios elevan el score de riesgo a zona crítica. Se sugiere solicitar facturas originales y verificar el inventario.',
    mensaje_etico: 'Este sistema no acusa al asegurado. Las inconsistencias detectadas pueden tener explicaciones legítimas. El analista debe contactar al asegurado y permitirle aportar evidencia complementaria antes de cualquier decisión.'
  },
  {
    id: 'SIN-2026-1029',
    asegurado: 'ASG-3401', ciudad: 'Quito', ramo: 'Vehículos', cobertura: 'Robo',
    proveedor: 'PRV-1042', monto_reclamado: 22400, monto_estimado: 21800, monto_pagado: 0,
    suma_asegurada: 24000, fecha_ocurrencia: '2026-05-12', fecha_reporte: '2026-05-15',
    dias_a_reporte: 3, score: 82, nivel: 'red',
    score_reglas: 34, score_modelo: 25, score_anomalias: 12, score_nlp: 11,
    score_nlp_raw: 68,
    reglas: ['RF-01', 'RF-12'],
    flags: { borde_vigencia: true, reporte_tardio: false, docs_incompletos: false, docs_inconsistentes: false, monto_atipico: false, proveedor_recurrente: true },
    alertas: [
      'Siniestro a 4 días del vencimiento de la póliza',
      'Tercer reclamo del asegurado en 18 meses'
    ],
    descripcion: 'Vehículo reportado como robado en zona urbana de alta concurrencia. La póliza vencía en 4 días desde el reporte. El asegurado tiene historial de 3 reclamos previos en 18 meses, dos de ellos con el mismo proveedor.',
    similar_a: 'SIN-2026-0812',
    explicacion_final: 'La proximidad al vencimiento de la vigencia, combinada con un historial denso de reclamos del asegurado, sugiere revisar con detalle la cronología y soportes del caso. No existen inconsistencias documentales graves, pero el patrón temporal merece atención.',
    mensaje_etico: 'La frecuencia de reclamos no implica fraude. Esta alerta es un punto de partida para una revisión más detallada, no una conclusión.'
  },
  {
    id: 'SIN-2026-1018',
    asegurado: 'ASG-2090', ciudad: 'Cuenca', ramo: 'Salud', cobertura: 'Hospitalización',
    proveedor: 'PRV-2031', monto_reclamado: 8400, monto_estimado: 6900, monto_pagado: 0,
    suma_asegurada: 15000, fecha_ocurrencia: '2026-05-08', fecha_reporte: '2026-05-14',
    dias_a_reporte: 6, score: 64, nivel: 'yellow',
    score_reglas: 24, score_modelo: 20, score_anomalias: 10, score_nlp: 10,
    score_nlp_raw: 52,
    reglas: ['RF-06'],
    flags: { borde_vigencia: false, reporte_tardio: false, docs_incompletos: true, docs_inconsistentes: false, monto_atipico: false, proveedor_recurrente: false },
    alertas: [
      'Falta epicrisis firmada por médico tratante'
    ],
    descripcion: 'Hospitalización por 3 días por cuadro gastrointestinal. Documentación clínica completa salvo epicrisis firmada. Montos dentro del rango esperado para el diagnóstico.',
    similar_a: null,
    explicacion_final: 'Caso de riesgo moderado. La única alerta es documental y subsanable. Los importes son coherentes con el diagnóstico declarado.',
    mensaje_etico: 'Las alertas amarillas suelen resolverse con verificación documental simple. No requieren confrontación con el asegurado.'
  },
  {
    id: 'SIN-2026-1014',
    asegurado: 'ASG-5512', ciudad: 'Manta', ramo: 'Vehículos', cobertura: 'Colisión',
    proveedor: 'PRV-4012', monto_reclamado: 5200, monto_estimado: 4900, monto_pagado: 4900,
    suma_asegurada: 18000, fecha_ocurrencia: '2026-05-05', fecha_reporte: '2026-05-06',
    dias_a_reporte: 1, score: 24, nivel: 'green',
    score_reglas: 8, score_modelo: 8, score_anomalias: 4, score_nlp: 4,
    score_nlp_raw: 18,
    reglas: [],
    flags: { borde_vigencia: false, reporte_tardio: false, docs_incompletos: false, docs_inconsistentes: false, monto_atipico: false, proveedor_recurrente: false },
    alertas: [],
    descripcion: 'Colisión menor en parqueadero con parte policial inmediato. Reporte y documentación dentro de plazo. Proveedor habitual sin alertas previas.',
    similar_a: null,
    explicacion_final: 'Caso de baja complejidad sin señales de riesgo. Documentación completa y consistente. Tramitación estándar.',
    mensaje_etico: 'No se detectaron señales de riesgo. Este caso puede proceder por flujo normal de liquidación.'
  },
  {
    id: 'SIN-2026-1011',
    asegurado: 'ASG-7821', ciudad: 'Ambato', ramo: 'Vida', cobertura: 'Muerte accidental',
    proveedor: 'PRV-1108', monto_reclamado: 45000, monto_estimado: 45000, monto_pagado: 0,
    suma_asegurada: 50000, fecha_ocurrencia: '2026-04-29', fecha_reporte: '2026-05-04',
    dias_a_reporte: 5, score: 72, nivel: 'yellow',
    score_reglas: 27, score_modelo: 22, score_anomalias: 12, score_nlp: 11,
    score_nlp_raw: 58,
    reglas: ['RF-04', 'RF-08'],
    flags: { borde_vigencia: true, reporte_tardio: false, docs_incompletos: false, docs_inconsistentes: false, monto_atipico: false, proveedor_recurrente: false },
    alertas: [
      'Beneficio reclamado a los 18 meses de emisión de la póliza',
      'Causa del siniestro: accidente de tránsito sin testigos'
    ],
    descripcion: 'Reclamación por muerte accidental ocurrida en accidente vehicular nocturno en vía interprovincial. La póliza tiene 18 meses de antigüedad. Causa de muerte declarada por autoridad competente.',
    similar_a: null,
    explicacion_final: 'La antigüedad relativa de la póliza y la naturaleza del siniestro justifican verificación complementaria de causa de muerte e historial médico. No hay inconsistencias documentales hasta el momento.',
    mensaje_etico: 'En siniestros de vida, la sensibilidad es máxima. El analista debe abordar la verificación con respeto a los beneficiarios.'
  },
  {
    id: 'SIN-2026-1008',
    asegurado: 'ASG-0921', ciudad: 'Quito', ramo: 'Vehículos', cobertura: 'Daños a terceros',
    proveedor: 'PRV-1042', monto_reclamado: 12800, monto_estimado: 6400, monto_pagado: 0,
    suma_asegurada: 20000, fecha_ocurrencia: '2026-04-18', fecha_reporte: '2026-05-01',
    dias_a_reporte: 13, score: 79, nivel: 'red',
    score_reglas: 32, score_modelo: 23, score_anomalias: 12, score_nlp: 12,
    score_nlp_raw: 66,
    reglas: ['RF-01', 'RF-05'],
    flags: { borde_vigencia: false, reporte_tardio: true, docs_incompletos: false, docs_inconsistentes: true, monto_atipico: true, proveedor_recurrente: true },
    alertas: [
      'Reporte 13 días después del hecho',
      'Mismo asegurado tiene SIN-2026-1042 (red) activo',
      'Proveedor coincide con caso rojo previo'
    ],
    descripcion: 'Daños a vehículo de tercero por colisión en intersección urbana. El mismo asegurado mantiene un siniestro rojo activo. El proveedor que valora los daños coincide con casos previos de alerta.',
    similar_a: null,
    explicacion_final: 'Existe convergencia entre asegurado y proveedor con un patrón previamente alertado. La revisión cruzada con SIN-2026-1042 es prioritaria para descartar coordinación entre eventos.',
    mensaje_etico: 'La coincidencia de actores puede ser fortuita. El sistema señala el patrón pero no concluye intencionalidad.'
  },
  {
    id: 'SIN-2026-1003',
    asegurado: 'ASG-6712', ciudad: 'Guayaquil', ramo: 'Hogar', cobertura: 'Daños por agua',
    proveedor: 'PRV-5024', monto_reclamado: 3400, monto_estimado: 3200, monto_pagado: 3200,
    suma_asegurada: 12000, fecha_ocurrencia: '2026-05-09', fecha_reporte: '2026-05-10',
    dias_a_reporte: 1, score: 18, nivel: 'green',
    score_reglas: 6, score_modelo: 6, score_anomalias: 3, score_nlp: 3,
    score_nlp_raw: 12,
    reglas: [],
    flags: { borde_vigencia: false, reporte_tardio: false, docs_incompletos: false, docs_inconsistentes: false, monto_atipico: false, proveedor_recurrente: false },
    alertas: [],
    descripcion: 'Filtración por ruptura de tubería en edificio multifamiliar. Reporte inmediato, peritaje conforme. Sin observaciones.',
    similar_a: null,
    explicacion_final: 'Sin alertas. Tramitación normal recomendada.',
    mensaje_etico: 'No se detectaron señales de riesgo.'
  },
  {
    id: 'SIN-2026-0998',
    asegurado: 'ASG-4421', ciudad: 'Loja', ramo: 'Salud', cobertura: 'Ambulatorio',
    proveedor: 'PRV-7083', monto_reclamado: 1850, monto_estimado: 1720, monto_pagado: 0,
    suma_asegurada: 8000, fecha_ocurrencia: '2026-05-07', fecha_reporte: '2026-05-10',
    dias_a_reporte: 3, score: 41, nivel: 'yellow',
    score_reglas: 15, score_modelo: 13, score_anomalias: 7, score_nlp: 6,
    score_nlp_raw: 31,
    reglas: ['RF-06'],
    flags: { borde_vigencia: false, reporte_tardio: false, docs_incompletos: true, docs_inconsistentes: false, monto_atipico: false, proveedor_recurrente: false },
    alertas: [
      'Receta médica sin firma legible'
    ],
    descripcion: 'Consultas y exámenes ambulatorios. Falta firma legible en una de las recetas. Resto de documentación conforme.',
    similar_a: null,
    explicacion_final: 'Riesgo bajo-moderado. Subsanable con re-envío del documento.',
    mensaje_etico: 'Verificación documental rutinaria.'
  },
  {
    id: 'SIN-2026-0987',
    asegurado: 'ASG-3401', ciudad: 'Quito', ramo: 'Vehículos', cobertura: 'Pérdida total',
    proveedor: 'PRV-1042', monto_reclamado: 26800, monto_estimado: 13500, monto_pagado: 0,
    suma_asegurada: 30000, fecha_ocurrencia: '2026-04-10', fecha_reporte: '2026-05-02',
    dias_a_reporte: 22, score: 89, nivel: 'red',
    score_reglas: 37, score_modelo: 26, score_anomalias: 13, score_nlp: 13,
    score_nlp_raw: 82,
    reglas: ['RF-01', 'RF-05', 'RF-09'],
    flags: { borde_vigencia: true, reporte_tardio: true, docs_incompletos: false, docs_inconsistentes: true, monto_atipico: true, proveedor_recurrente: true },
    alertas: [
      'Patrón altamente similar a SIN-2026-1042',
      'Mismo asegurado, mismo proveedor',
      'Reporte tardío reincidente'
    ],
    descripcion: 'Pérdida total por colisión nocturna en vía secundaria. Patrón narrativo cercano a SIN-2026-1042. Mismo asegurado y mismo proveedor.',
    similar_a: 'SIN-2026-1042',
    explicacion_final: 'Caso pivote en patrón detectado. Recomendada investigación conjunta con SIN-2026-1042.',
    mensaje_etico: 'Las coincidencias detectadas merecen verificación rigurosa antes de cualquier conclusión.'
  }
];

// Add a few more for ranking richness
const CASOS_EXTRA = [
  { id: 'SIN-2026-0976', asegurado: 'ASG-1199', ciudad: 'Cuenca', ramo: 'Hogar', cobertura: 'Incendio', proveedor: 'PRV-6071', monto_reclamado: 16500, monto_estimado: 14000, monto_pagado: 0, suma_asegurada: 25000, fecha_ocurrencia: '2026-04-15', fecha_reporte: '2026-04-20', dias_a_reporte: 5, score: 38, nivel: 'green', score_reglas: 14, score_modelo: 12, score_anomalias: 6, score_nlp: 6, reglas: [], flags: {}, alertas: [] },
  { id: 'SIN-2026-0965', asegurado: 'ASG-8821', ciudad: 'Manta', ramo: 'Patrimonial', cobertura: 'Robo', proveedor: 'PRV-5024', monto_reclamado: 9800, monto_estimado: 8900, monto_pagado: 0, suma_asegurada: 14000, fecha_ocurrencia: '2026-04-25', fecha_reporte: '2026-04-29', dias_a_reporte: 4, score: 52, nivel: 'yellow', score_reglas: 19, score_modelo: 17, score_anomalias: 8, score_nlp: 8, reglas: ['RF-06'], flags: {}, alertas: [] },
  { id: 'SIN-2026-0954', asegurado: 'ASG-3401', ciudad: 'Quito', ramo: 'Vehículos', cobertura: 'Colisión', proveedor: 'PRV-1042', monto_reclamado: 7400, monto_estimado: 3800, monto_pagado: 0, suma_asegurada: 18000, fecha_ocurrencia: '2026-04-20', fecha_reporte: '2026-04-22', dias_a_reporte: 2, score: 75, nivel: 'red', score_reglas: 30, score_modelo: 22, score_anomalias: 12, score_nlp: 11, reglas: ['RF-05'], flags: { monto_atipico: true, proveedor_recurrente: true }, alertas: [] }
];

const ALL_CASOS = [...CASOS_BASE, ...CASOS_EXTRA];

// Provider aggregates
function buildProveedoresRanking() {
  const map = {};
  PROVEEDORES_DATA.forEach(p => {
    map[p.id] = { ...p, casos: 0, rojos: 0, montos: [] };
  });
  ALL_CASOS.forEach(c => {
    const p = map[c.proveedor];
    if (!p) return;
    p.casos++;
    if (c.nivel === 'red') p.rojos++;
    p.montos.push(c.monto_reclamado);
  });
  return Object.values(map).map(p => {
    const pct = p.casos > 0 ? Math.round((p.rojos / p.casos) * 100) : 0;
    const avg = p.montos.length ? Math.round(p.montos.reduce((a, b) => a + b, 0) / p.montos.length) : 0;
    const total = p.montos.reduce((a, b) => a + b, 0);
    let nivel = 'green';
    if (pct >= 50) nivel = 'red';
    else if (pct >= 25) nivel = 'yellow';
    return { ...p, pct, avg, total, nivel };
  }).sort((a, b) => b.pct - a.pct);
}

const PROVEEDORES_RANKING = buildProveedoresRanking();

// Network graph data
const GRAPH_NODES = [
  // Asegurados (4) - circles, accent blue
  { id: 'ASG-0921', type: 'asegurado', size: 18, casos: 2, scorePromedio: 85, montoTotal: 41300 },
  { id: 'ASG-3401', type: 'asegurado', size: 22, casos: 3, scorePromedio: 82, montoTotal: 56600 },
  { id: 'ASG-1248', type: 'asegurado', size: 14, casos: 1, scorePromedio: 87, montoTotal: 18200 },
  { id: 'ASG-5512', type: 'asegurado', size: 12, casos: 1, scorePromedio: 24, montoTotal: 5200 },
  // Proveedores (4) - diamonds, purple
  { id: 'PRV-1042', type: 'proveedor', size: 22, restrictiva: true, casos: 4, alertas: 4, scorePromedio: 84 },
  { id: 'PRV-3055', type: 'proveedor', size: 18, restrictiva: true, casos: 1, alertas: 1, scorePromedio: 87 },
  { id: 'PRV-2031', type: 'proveedor', size: 13, restrictiva: false, casos: 1, alertas: 0, scorePromedio: 64 },
  { id: 'PRV-4012', type: 'proveedor', size: 12, restrictiva: false, casos: 1, alertas: 0, scorePromedio: 24 },
  // Siniestros (6)
  { id: 'SIN-2026-1042', type: 'siniestro', nivel: 'red', size: 9 },
  { id: 'SIN-2026-1037', type: 'siniestro', nivel: 'red', size: 9 },
  { id: 'SIN-2026-1029', type: 'siniestro', nivel: 'red', size: 9 },
  { id: 'SIN-2026-1008', type: 'siniestro', nivel: 'red', size: 9 },
  { id: 'SIN-2026-1014', type: 'siniestro', nivel: 'green', size: 8 },
  { id: 'SIN-2026-0987', type: 'siniestro', nivel: 'red', size: 9 },
  { id: 'SIN-2026-1018', type: 'siniestro', nivel: 'yellow', size: 8 }
];

const GRAPH_LINKS = [
  { source: 'ASG-0921', target: 'SIN-2026-1042', critical: true },
  { source: 'SIN-2026-1042', target: 'PRV-1042', critical: true },
  { source: 'ASG-3401', target: 'SIN-2026-1029', critical: true },
  { source: 'SIN-2026-1029', target: 'PRV-1042', critical: true },
  { source: 'ASG-1248', target: 'SIN-2026-1037', critical: true },
  { source: 'SIN-2026-1037', target: 'PRV-3055', critical: true },
  { source: 'ASG-0921', target: 'SIN-2026-1008', critical: true },
  { source: 'SIN-2026-1008', target: 'PRV-1042', critical: true },
  { source: 'ASG-5512', target: 'SIN-2026-1014', critical: false },
  { source: 'SIN-2026-1014', target: 'PRV-4012', critical: false },
  { source: 'ASG-3401', target: 'SIN-2026-0987', critical: true },
  { source: 'SIN-2026-0987', target: 'PRV-1042', critical: true },
  { source: 'ASG-3401', target: 'SIN-2026-1018', critical: false },
  { source: 'SIN-2026-1018', target: 'PRV-2031', critical: false }
];

// Suggested queries for the agente
const SUGGESTED = [
  '¿Cuántos casos rojos hay actualmente?',
  '¿Cuál es el ramo con mayor concentración de fraude?',
  'Muéstrame los 5 siniestros con mayor score',
  '¿Qué ciudad tiene más casos críticos?',
  '¿Cuál es el ahorro potencial estimado?',
  'Dame el desglose del score para SIN-2026-1042',
  '¿Qué proveedores están en lista restrictiva?',
  'Promedio de días de reporte en casos rojos',
  'Distribución por nivel de riesgo',
  'Top 3 reglas activadas con mayor frecuencia',
  'Monto reclamado promedio por nivel'
];

const COMPLEX_QUERIES = [
  '¿Cuáles son los 15 casos en Vehículos con docs inconsistentes?',
  '¿Qué proveedor concentra más casos rojos en Quito?',
  'Analiza el patrón de siniestros en los primeros 10 días de póliza'
];

// Histogram buckets
function buildHistogram(casos) {
  const buckets = Array(10).fill(0).map((_, i) => ({
    range: `${i * 10 + (i === 0 ? 0 : 1)}-${(i + 1) * 10}`,
    count: 0,
    color: i < 4 ? 'var(--risk-green)' : (i < 7.5 ? 'var(--risk-yellow)' : 'var(--risk-red)')
  }));
  casos.forEach(c => {
    const idx = Math.min(9, Math.floor(c.score / 10));
    buckets[idx].count++;
  });
  return buckets;
}

window.FDATA = {
  CIUDADES, RAMOS, COBERTURAS, PROVEEDORES_DATA, PROVEEDORES_RANKING,
  ALL_CASOS, GRAPH_NODES, GRAPH_LINKS, SUGGESTED, COMPLEX_QUERIES,
  buildHistogram
};
