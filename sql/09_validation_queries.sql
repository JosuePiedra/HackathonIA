-- ============================================================
-- fraudia-claims | 09_validation_queries.sql
-- Data quality and validation checks on normalized tables,
-- features, and scored claims.
-- ============================================================

SET search_path TO fraud_claims, public;

-- ============================================================
-- 1. MISSING id_siniestro
-- ============================================================
SELECT
    'MISSING id_siniestro' AS check_name,
    COUNT(*) AS issue_count
FROM fraud_claims.siniestros
WHERE id_siniestro IS NULL OR TRIM(id_siniestro) = '';

-- ============================================================
-- 2. DUPLICATE id_siniestro
-- ============================================================
SELECT
    'DUPLICATE id_siniestro' AS check_name,
    id_siniestro,
    COUNT(*) AS occurrences
FROM fraud_claims.siniestros
GROUP BY id_siniestro
HAVING COUNT(*) > 1
ORDER BY occurrences DESC
LIMIT 20;

-- ============================================================
-- 3. INVALID DATES: NULL fecha_ocurrencia or fecha_reporte
-- ============================================================
SELECT
    'NULL fecha_ocurrencia' AS check_name,
    COUNT(*) AS issue_count
FROM fraud_claims.siniestros
WHERE fecha_ocurrencia IS NULL;

SELECT
    'NULL fecha_reporte' AS check_name,
    COUNT(*) AS issue_count
FROM fraud_claims.siniestros
WHERE fecha_reporte IS NULL;

-- ============================================================
-- 4. INVALID DATE ORDER: fecha_reporte < fecha_ocurrencia
-- ============================================================
SELECT
    'fecha_reporte < fecha_ocurrencia' AS check_name,
    id_siniestro,
    fecha_ocurrencia,
    fecha_reporte
FROM fraud_claims.siniestros
WHERE fecha_reporte < fecha_ocurrencia
LIMIT 20;

-- ============================================================
-- 5. NEGATIVE MONTOS
-- ============================================================
SELECT
    'NEGATIVE monto_reclamado' AS check_name,
    id_siniestro,
    monto_reclamado
FROM fraud_claims.siniestros
WHERE monto_reclamado < 0
LIMIT 10;

SELECT
    'NEGATIVE monto_estimado' AS check_name,
    id_siniestro,
    monto_estimado
FROM fraud_claims.siniestros
WHERE monto_estimado < 0
LIMIT 10;

-- ============================================================
-- 6. MISSING POLIZA (siniestro with no matching policy)
-- ============================================================
SELECT
    'Siniestro sin poliza' AS check_name,
    s.id_siniestro,
    s.id_poliza
FROM fraud_claims.siniestros s
LEFT JOIN fraud_claims.polizas p ON s.id_poliza = p.id_poliza
WHERE p.id_poliza IS NULL
LIMIT 20;

-- ============================================================
-- 7. SCORE DISTRIBUTION
-- ============================================================
SELECT
    'Score distribution' AS check_name,
    CASE
        WHEN score_reglas IS NULL THEN 'NULL'
        WHEN score_reglas = 0 THEN '0'
        WHEN score_reglas BETWEEN 1 AND 19 THEN '1-19'
        WHEN score_reglas BETWEEN 20 AND 39 THEN '20-39'
        WHEN score_reglas BETWEEN 40 AND 59 THEN '40-59'
        WHEN score_reglas BETWEEN 60 AND 79 THEN '60-79'
        ELSE '80-100'
    END AS score_range,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS pct
FROM fraud_claims.vw_rules_scored_claims
GROUP BY score_range
ORDER BY score_range;

-- ============================================================
-- 8. NIVEL_REGLAS DISTRIBUTION
-- ============================================================
SELECT
    'Nivel reglas distribution' AS check_name,
    nivel_reglas,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS pct
FROM fraud_claims.vw_rules_scored_claims
GROUP BY nivel_reglas
ORDER BY count DESC;

-- ============================================================
-- 9. RULE FLAGS ACTIVATION SUMMARY
-- ============================================================
SELECT
    'Rule flag activation rates' AS check_name,
    'flag_borde_vigencia'               AS flag, SUM(flag_borde_vigencia) AS activated, COUNT(*) AS total FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_robo_denuncia_tardia',       SUM(flag_robo_denuncia_tardia), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_reporte_tardio',             SUM(flag_reporte_tardio), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_monto_atipico',              SUM(flag_monto_atipico), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_documentos_incompletos',     SUM(flag_documentos_incompletos), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_documentos_inconsistentes',  SUM(flag_documentos_inconsistentes), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_proveedor_recurrente',       SUM(flag_proveedor_recurrente), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_proveedor_lista_restrictiva',SUM(flag_proveedor_lista_restrictiva), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_alta_frecuencia_asegurado',  SUM(flag_alta_frecuencia_asegurado), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_alta_frecuencia_vehiculo',   SUM(flag_alta_frecuencia_vehiculo), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_alta_frecuencia_conductor',  SUM(flag_alta_frecuencia_conductor), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_sin_tercero_identificado',   SUM(flag_sin_tercero_identificado), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_dinamica_sospechosa',        SUM(flag_dinamica_sospechosa), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_narrativa_clonada',          SUM(flag_narrativa_clonada), COUNT(*) FROM fraud_claims.rule_flags
UNION ALL SELECT '', 'flag_cobertura_robo_total',       SUM(flag_cobertura_robo_total), COUNT(*) FROM fraud_claims.rule_flags;

-- ============================================================
-- 10. PRECISION CHECK: Fraud label vs Nivel Rojo alignment
-- ============================================================
SELECT
    'Fraude simulada vs Nivel Rojo' AS check_name,
    etiqueta_fraude_simulada,
    nivel_reglas,
    COUNT(*) AS count
FROM fraud_claims.vw_rules_scored_claims
GROUP BY etiqueta_fraude_simulada, nivel_reglas
ORDER BY etiqueta_fraude_simulada, nivel_reglas;
