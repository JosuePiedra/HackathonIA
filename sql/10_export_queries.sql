-- ============================================================
-- 10_export_queries.sql
-- Queries de exportación para rules_scored_claims.
-- ============================================================

-- 1. EXPORTACIÓN COMPLETA ordenada por score_heuristico DESC
SELECT
    id_siniestro, id_poliza, id_asegurado, id_vehiculo, id_proveedor, id_conductor,
    ramo, cobertura, estado, sucursal, ciudad, provincia,
    fecha_ocurrencia, fecha_reporte, fecha_inicio_poliza, fecha_fin_poliza,
    monto_reclamado, monto_estimado, monto_pagado, suma_asegurada, deducible,
    descripcion, documentos_completos,
    dias_desde_inicio_poliza, dias_desde_fin_poliza, dias_entre_ocurrencia_reporte,
    ratio_monto_suma_asegurada, ratio_monto_estimado, diferencia_monto_reclamado_estimado,
    historial_siniestros_asegurado, historial_siniestros_vehiculo,
    historial_siniestros_conductor, frecuencia_proveedor,
    documentos_faltantes, documentos_inconsistentes,
    proveedor_recurrente, monto_atipico, reporte_tardio, borde_vigencia,
    score_heuristico, nivel_riesgo,
    reglas_criticas_activadas, factores_principales,
    explicacion_final, accion_sugerida, mensaje_ia,
    fecha_evaluacion, version_modelo,
    -- Campos Persona 2 (null hasta que entrene el modelo)
    prediccion_ml, probabilidad_ml, score_final,
    etiqueta_fraude_simulada, source_file, mapping_confidence, data_quality_score
FROM vw_rules_scored_claims
ORDER BY score_heuristico DESC NULLS LAST, fecha_ocurrencia DESC;

-- 2. SOLO ALTO RIESGO (score > 40)
SELECT
    id_siniestro, id_poliza, id_asegurado, ramo, cobertura, estado, ciudad,
    fecha_ocurrencia, fecha_reporte, monto_reclamado, suma_asegurada,
    ratio_monto_suma_asegurada, dias_entre_ocurrencia_reporte,
    historial_siniestros_asegurado, score_heuristico, nivel_riesgo,
    reglas_criticas_activadas, accion_sugerida, etiqueta_fraude_simulada
FROM vw_rules_scored_claims
WHERE score_heuristico > 40
ORDER BY score_heuristico DESC;

-- 3. ESTADÍSTICAS RESUMEN para dashboard
SELECT
    COUNT(*)                                                        AS total_siniestros,
    SUM(CASE WHEN nivel_riesgo = 'Rojo'     THEN 1 ELSE 0 END)     AS nivel_rojo,
    SUM(CASE WHEN nivel_riesgo = 'Amarillo' THEN 1 ELSE 0 END)     AS nivel_amarillo,
    SUM(CASE WHEN nivel_riesgo = 'Verde'    THEN 1 ELSE 0 END)     AS nivel_verde,
    ROUND(AVG(score_heuristico), 2)                                 AS avg_score_heuristico,
    MAX(score_heuristico)                                           AS max_score,
    SUM(COALESCE(monto_reclamado, 0))                               AS total_monto_reclamado
FROM vw_rules_scored_claims;

-- 4. ALERTAS por siniestro (útil para dashboard detalle)
SELECT
    ar.id_siniestro,
    ar.codigo_regla,
    ar.nombre_regla,
    ar.clasificacion,
    ar.severidad,
    ar.variable_evaluada,
    ar.valor_detectado,
    ar.explicacion,
    cr.puntaje_base,
    cr.es_critica
FROM alerta_regla ar
JOIN catalogo_regla cr ON ar.codigo_regla = cr.codigo_regla
ORDER BY ar.id_siniestro, cr.puntaje_base DESC;
