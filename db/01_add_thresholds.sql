-- ── Migración: umbrales y puntuación graduada ────────────────
-- Ejecutar en Supabase SQL Editor una sola vez.

-- 1. Nuevas columnas en catalogo_regla
ALTER TABLE catalogo_regla ADD COLUMN IF NOT EXISTS umbral_1            NUMERIC;
ALTER TABLE catalogo_regla ADD COLUMN IF NOT EXISTS umbral_2            NUMERIC;
ALTER TABLE catalogo_regla ADD COLUMN IF NOT EXISTS puntos_nivel_1      NUMERIC(6,2) DEFAULT 0;
ALTER TABLE catalogo_regla ADD COLUMN IF NOT EXISTS puntos_nivel_2      NUMERIC(6,2) DEFAULT 0;
ALTER TABLE catalogo_regla ADD COLUMN IF NOT EXISTS unidad              TEXT DEFAULT 'bool';
ALTER TABLE catalogo_regla ADD COLUMN IF NOT EXISTS direccion           TEXT DEFAULT 'mayor';
ALTER TABLE catalogo_regla ADD COLUMN IF NOT EXISTS condicion_descripcion TEXT;

-- 2. Columna puntos en alerta_regla (puntuación real del caso)
ALTER TABLE alerta_regla ADD COLUMN IF NOT EXISTS puntos NUMERIC(6,2) DEFAULT 0;

-- 3. Upsert del catálogo completo con umbrales correctos
INSERT INTO catalogo_regla (
    codigo_regla, nombre_regla, descripcion, tipo_regla,
    clasificacion_base, severidad_base, puntaje_base, es_critica, activa,
    umbral_1, umbral_2, puntos_nivel_1, puntos_nivel_2,
    unidad, direccion, condicion_descripcion
) VALUES
  ('RF-01', 'Cobertura pérdida total por robo',
   'Siniestro asociado a cobertura de pérdida total por robo.',
   'Cobertura', 'Rojo', 'Alta', 12, true, true,
   NULL, NULL, 12, 0, 'bool', 'mayor',
   'Activado cuando cobertura contiene "pérdida total" o "robo total"'),

  ('RF-02', 'Evidencia de falsificación documental',
   'Documentos con evidencia de falsificación o inconsistencia fuerte.',
   'Documental', 'Rojo', 'Crítica', 18, true, true,
   NULL, NULL, 18, 0, 'bool', 'mayor',
   'Activado: documentos_inconsistentes > 0'),

  ('RF-03', 'Coincidencia con lista restrictiva',
   'Proveedor coincide con lista restrictiva de fraude.',
   'Proveedor', 'Rojo', 'Crítica', 10, true, true,
   NULL, NULL, 10, 5, 'bool', 'mayor',
   'Lista restrictiva: 10pts | >2 casos observados año: 5pts'),

  ('RF-04', 'Dinámica físicamente imposible',
   'Narrativa con dinámica imposible o incompatible con la evidencia.',
   'Dinámica', 'Rojo', 'Crítica', 15, true, true,
   NULL, NULL, 15, 0, 'bool', 'mayor',
   'Activado: keywords de dinámica imposible en descripción'),

  ('RF-05', 'Reclamo cercano al borde de vigencia',
   'Siniestro ocurrido pocos días del inicio o fin de la póliza.',
   'Vigencia', 'Amarillo', 'Media-Alta', 8, true, true,
   10, 30, 8, 4, 'dias', 'menor',
   '≤10 días: 8pts | 11-30 días: 4pts | >30 días: 0pts'),

  ('RF-06', 'Demora en denuncia por robo',
   'Tiempo atípico entre ocurrencia y denuncia en casos de robo.',
   'Temporal', 'Amarillo', 'Media-Alta', 8, true, true,
   2, 1, 8, 4, 'dias', 'mayor',
   '>2 días (>48h): 8pts | 1-2 días (24-48h): 4pts | <24h: 0pts'),

  ('RF-07', 'Narrativas similares',
   'Descripción parecida o idéntica a otro reclamo.',
   'NLP', 'Amarillo', 'Media-Alta', 8, true, true,
   0.85, 0.70, 8, 4, 'similitud', 'mayor',
   '>85% similitud: 8pts | 70-84%: 4pts'),

  ('RF-TEMP-01', 'Reporte tardío',
   'Siniestro reportado muchos días después de la ocurrencia.',
   'Temporal', 'Amarillo', 'Media', 5, false, true,
   7, 3, 5, 3, 'dias', 'mayor',
   '>7 días: 5pts | 4-7 días: 3pts | ≤3 días: 0pts'),

  ('RF-MONTO-01', 'Monto cercano a suma asegurada',
   'Monto reclamado representa proporción alta de la suma asegurada.',
   'Monto', 'Amarillo', 'Media', 4, false, true,
   0.95, NULL, 4, 0, 'ratio', 'mayor',
   'Reclamo >95% suma asegurada o >50% del promedio de reparación: 4pts'),

  ('RF-DOC-01', 'Documentos incompletos',
   'Falta denuncia, factura, informe o evidencia requerida.',
   'Documental', 'Amarillo', 'Media', 4, false, true,
   1, NULL, 4, 0, 'count', 'mayor',
   'Falta ≥1 documento legal obligatorio: 4pts'),

  ('RF-DOC-02', 'Documentos inconsistentes',
   'Fechas no coinciden, valores diferentes o documentos ilegibles.',
   'Documental', 'Rojo', 'Alta', 10, false, true,
   NULL, NULL, 10, 0, 'bool', 'mayor',
   'Activado: documentos_inconsistentes > 0'),

  ('RF-PROV-01', 'Proveedor recurrente',
   'Proveedor asociado a concentración elevada de siniestros.',
   'Proveedor', 'Amarillo', 'Media', 5, false, true,
   10, NULL, 5, 0, 'count', 'mayor',
   'Proveedor con >10 siniestros asociados: 5pts'),

  ('RF-FREC-01', 'Alta frecuencia de reclamos por asegurado',
   'Asegurado con múltiples siniestros en los últimos 18 meses.',
   'Frecuencia', 'Amarillo', 'Media-Alta', 8, false, true,
   3, 2, 8, 4, 'siniestros', 'mayor',
   '≥3 siniestros: 8pts | 2 siniestros: 4pts | 0-1: 0pts'),

  ('RF-FREC-02', 'Alta frecuencia de reclamos por vehículo',
   'Vehículo con múltiples siniestros en los últimos 18 meses.',
   'Frecuencia', 'Amarillo', 'Media', 6, false, true,
   3, 2, 6, 3, 'siniestros', 'mayor',
   '≥3 siniestros: 6pts | 2 siniestros: 3pts | 0-1: 0pts'),

  ('RF-FREC-03', 'Alta frecuencia de reclamos por conductor',
   'Conductor presente en múltiples siniestros en los últimos 18 meses.',
   'Frecuencia', 'Amarillo', 'Media-Alta', 8, false, true,
   3, 2, 8, 4, 'siniestros', 'mayor',
   '≥3 siniestros: 8pts | 2 siniestros: 4pts | 0-1: 0pts')

ON CONFLICT (codigo_regla) DO UPDATE SET
    nombre_regla            = EXCLUDED.nombre_regla,
    descripcion             = EXCLUDED.descripcion,
    tipo_regla              = EXCLUDED.tipo_regla,
    clasificacion_base      = EXCLUDED.clasificacion_base,
    severidad_base          = EXCLUDED.severidad_base,
    puntaje_base            = EXCLUDED.puntaje_base,
    es_critica              = EXCLUDED.es_critica,
    activa                  = EXCLUDED.activa,
    umbral_1                = EXCLUDED.umbral_1,
    umbral_2                = EXCLUDED.umbral_2,
    puntos_nivel_1          = EXCLUDED.puntos_nivel_1,
    puntos_nivel_2          = EXCLUDED.puntos_nivel_2,
    unidad                  = EXCLUDED.unidad,
    direccion               = EXCLUDED.direccion,
    condicion_descripcion   = EXCLUDED.condicion_descripcion;
