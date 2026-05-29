-- ============================================================
-- 08_build_rules_scored_claims.sql
-- La vista vw_rules_scored_claims está definida en 00_create_schema.sql.
-- Este archivo puede recrearla si se necesita actualizar de forma aislada.
-- ============================================================

DROP VIEW IF EXISTS vw_rules_scored_claims CASCADE;

CREATE VIEW vw_rules_scored_claims AS
SELECT
    s.id_siniestro, s.id_poliza, s.id_asegurado, s.id_vehiculo,
    s.id_proveedor, s.id_conductor,
    s.ramo, s.cobertura, s.estado, s.sucursal, s.ciudad, s.provincia,
    s.fecha_ocurrencia, s.fecha_reporte,
    p.fecha_inicio AS fecha_inicio_poliza,
    p.fecha_fin AS fecha_fin_poliza,
    s.monto_reclamado, s.monto_estimado, s.monto_pagado,
    p.suma_asegurada, p.deducible,
    s.descripcion, s.documentos_completos,
    vr.dias_desde_inicio_poliza, vr.dias_desde_fin_poliza,
    vr.dias_entre_ocurrencia_reporte,
    vr.ratio_monto_suma_asegurada, vr.ratio_monto_estimado,
    vr.diferencia_monto_reclamado_estimado,
    vr.historial_siniestros_asegurado, vr.historial_siniestros_vehiculo,
    vr.historial_siniestros_conductor, vr.frecuencia_proveedor,
    vr.documentos_faltantes, vr.documentos_inconsistentes,
    vr.proveedor_recurrente, vr.monto_atipico, vr.reporte_tardio, vr.borde_vigencia,
    ss.score_heuristico, ss.prediccion_ml, ss.probabilidad_ml,
    ss.score_final, ss.nivel_riesgo,
    ss.reglas_criticas_activadas, ss.factores_principales,
    ss.explicacion_final, ss.accion_sugerida, ss.mensaje_ia,
    ss.fecha_evaluacion, ss.version_modelo,
    s.etiqueta_fraude_simulada, s.source_file,
    s.mapping_confidence, s.data_quality_score
FROM siniestro s
LEFT JOIN poliza p ON s.id_poliza = p.id_poliza
LEFT JOIN variable_riesgo vr ON s.id_siniestro = vr.id_siniestro
LEFT JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro;

-- Verificación rápida
SELECT
    nivel_riesgo,
    COUNT(*) AS total,
    ROUND(AVG(score_heuristico), 2) AS avg_score_heuristico
FROM vw_rules_scored_claims
GROUP BY nivel_riesgo
ORDER BY nivel_riesgo;
