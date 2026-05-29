-- ============================================================
-- fraudia-claims | 10_export_queries.sql
-- Export queries for the rules-scored claims dataset.
-- ============================================================

SET search_path TO fraud_claims, public;

-- ============================================================
-- 1. FULL EXPORT: All claims ordered by risk score descending
-- ============================================================
SELECT
    id_siniestro,
    id_poliza,
    id_asegurado,
    id_vehiculo,
    id_proveedor,
    ramo,
    cobertura,
    estado,
    ciudad,
    provincia,
    fecha_ocurrencia,
    fecha_reporte,
    fecha_inicio_poliza,
    fecha_fin_poliza,
    monto_reclamado,
    monto_estimado,
    monto_pagado,
    suma_asegurada,
    deducible,
    -- Features
    dias_desde_inicio_poliza,
    dias_desde_fin_poliza,
    dias_entre_ocurrencia_reporte,
    ratio_monto_suma_asegurada,
    ratio_monto_estimado,
    historial_siniestros_asegurado,
    historial_siniestros_vehiculo,
    frecuencia_proveedor,
    documentos_faltantes,
    documentos_inconsistentes,
    borde_vigencia,
    monto_atipico,
    reporte_tardio,
    proveedor_recurrente,
    en_lista_restrictiva,
    -- Rule flags
    flag_borde_vigencia,
    flag_robo_denuncia_tardia,
    flag_reporte_tardio,
    flag_monto_atipico,
    flag_documentos_incompletos,
    flag_documentos_inconsistentes,
    flag_proveedor_recurrente,
    flag_proveedor_lista_restrictiva,
    flag_alta_frecuencia_asegurado,
    flag_alta_frecuencia_vehiculo,
    flag_alta_frecuencia_conductor,
    flag_sin_tercero_identificado,
    flag_dinamica_sospechosa,
    flag_narrativa_clonada,
    flag_cobertura_robo_total,
    -- Scores
    score_reglas,
    nivel_reglas,
    -- Ground truth
    etiqueta_fraude_simulada,
    -- Metadata
    source_file,
    mapping_confidence,
    data_quality_score
FROM fraud_claims.vw_rules_scored_claims
ORDER BY score_reglas DESC, fecha_ocurrencia DESC;

-- ============================================================
-- 2. FILTERED EXPORT: High-risk claims only (score > 40)
-- ============================================================
SELECT
    id_siniestro,
    id_poliza,
    id_asegurado,
    ramo,
    cobertura,
    estado,
    ciudad,
    fecha_ocurrencia,
    fecha_reporte,
    monto_reclamado,
    suma_asegurada,
    ratio_monto_suma_asegurada,
    dias_entre_ocurrencia_reporte,
    historial_siniestros_asegurado,
    en_lista_restrictiva,
    score_reglas,
    nivel_reglas,
    etiqueta_fraude_simulada
FROM fraud_claims.vw_rules_scored_claims
WHERE score_reglas > 40
ORDER BY score_reglas DESC;

-- ============================================================
-- 3. SUMMARY STATS for reporting dashboard
-- ============================================================
SELECT
    COUNT(*)                                                    AS total_siniestros,
    SUM(CASE WHEN nivel_reglas = 'Rojo' THEN 1 ELSE 0 END)     AS nivel_rojo,
    SUM(CASE WHEN nivel_reglas = 'Amarillo' THEN 1 ELSE 0 END) AS nivel_amarillo,
    SUM(CASE WHEN nivel_reglas = 'Verde' THEN 1 ELSE 0 END)    AS nivel_verde,
    ROUND(AVG(score_reglas), 2)                                AS avg_score,
    MAX(score_reglas)                                          AS max_score,
    SUM(COALESCE(monto_reclamado, 0))                          AS total_monto_reclamado,
    SUM(CASE WHEN etiqueta_fraude_simulada THEN COALESCE(monto_reclamado, 0) ELSE 0 END)
                                                               AS monto_fraude_simulado
FROM fraud_claims.vw_rules_scored_claims;
