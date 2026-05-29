-- ============================================================
-- 09_validation_queries.sql
-- Validaciones de calidad sobre tablas del nuevo modelo.
-- ============================================================

-- 1. MISSING id_siniestro
SELECT 'MISSING id_siniestro' AS check_name, COUNT(*) AS issue_count
FROM siniestro WHERE id_siniestro IS NULL OR TRIM(id_siniestro) = '';

-- 2. DUPLICATE id_siniestro
SELECT 'DUPLICATE id_siniestro' AS check_name, id_siniestro, COUNT(*) AS occurrences
FROM siniestro GROUP BY id_siniestro HAVING COUNT(*) > 1 ORDER BY occurrences DESC LIMIT 20;

-- 3. NULL fecha_ocurrencia
SELECT 'NULL fecha_ocurrencia' AS check_name, COUNT(*) AS issue_count
FROM siniestro WHERE fecha_ocurrencia IS NULL;

-- 4. NULL fecha_reporte
SELECT 'NULL fecha_reporte' AS check_name, COUNT(*) AS issue_count
FROM siniestro WHERE fecha_reporte IS NULL;

-- 5. fecha_reporte < fecha_ocurrencia
SELECT 'fecha_reporte < fecha_ocurrencia' AS check_name, id_siniestro, fecha_ocurrencia, fecha_reporte
FROM siniestro WHERE fecha_reporte < fecha_ocurrencia LIMIT 20;

-- 6. Montos negativos
SELECT 'NEGATIVE monto_reclamado' AS check_name, id_siniestro, monto_reclamado
FROM siniestro WHERE monto_reclamado < 0 LIMIT 10;

-- 7. Siniestros sin póliza
SELECT 'Siniestro sin poliza' AS check_name, s.id_siniestro, s.id_poliza
FROM siniestro s LEFT JOIN poliza p ON s.id_poliza = p.id_poliza
WHERE p.id_poliza IS NULL LIMIT 20;

-- 8. Distribución score_heuristico
SELECT
    CASE
        WHEN score_heuristico IS NULL THEN 'NULL'
        WHEN score_heuristico = 0 THEN '0'
        WHEN score_heuristico BETWEEN 1 AND 19 THEN '1-19'
        WHEN score_heuristico BETWEEN 20 AND 40 THEN '20-40'
        WHEN score_heuristico BETWEEN 41 AND 75 THEN '41-75'
        ELSE '76-100'
    END AS score_range,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS pct
FROM score_siniestro
GROUP BY score_range ORDER BY score_range;

-- 9. Distribución nivel_riesgo
SELECT nivel_riesgo, COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS pct
FROM score_siniestro GROUP BY nivel_riesgo ORDER BY count DESC;

-- 10. Alertas por regla
SELECT ar.codigo_regla, cr.nombre_regla, cr.puntaje_base, COUNT(*) AS activaciones
FROM alerta_regla ar
JOIN catalogo_regla cr ON ar.codigo_regla = cr.codigo_regla
GROUP BY ar.codigo_regla, cr.nombre_regla, cr.puntaje_base
ORDER BY activaciones DESC;

-- 11. Mapeos por estado
SELECT validation_status, COUNT(*) AS count
FROM mapeo_esquema GROUP BY validation_status ORDER BY count DESC;

-- 12. Cobertura: siniestros con variable_riesgo
SELECT
    'siniestros con variable_riesgo' AS check_name,
    COUNT(s.id_siniestro) AS total_siniestros,
    COUNT(vr.id_siniestro) AS con_features,
    COUNT(ss.id_siniestro) AS con_score
FROM siniestro s
LEFT JOIN variable_riesgo vr ON s.id_siniestro = vr.id_siniestro
LEFT JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro;
