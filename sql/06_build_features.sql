-- ============================================================
-- fraudia-claims | 06_build_features.sql
-- Populate variables_riesgo from siniestros JOIN polizas JOIN documentos.
-- Run after normalized tables are loaded.
-- ============================================================

SET search_path TO fraud_claims, public;

-- Clear existing features to allow idempotent runs
TRUNCATE fraud_claims.variables_riesgo;

INSERT INTO fraud_claims.variables_riesgo (
    id_siniestro,

    -- Temporal features
    dias_desde_inicio_poliza,
    dias_desde_fin_poliza,
    dias_entre_ocurrencia_reporte,

    -- Financial features
    ratio_monto_suma_asegurada,
    ratio_monto_estimado,
    diferencia_monto_reclamado_estimado,

    -- Historical frequency features
    historial_siniestros_asegurado,
    historial_siniestros_vehiculo,
    historial_siniestros_conductor,
    frecuencia_proveedor,

    -- Document features
    documentos_faltantes,
    documentos_inconsistentes,
    score_documental,

    -- Boolean indicators
    proveedor_recurrente,
    monto_atipico,
    reporte_tardio,
    borde_vigencia
)
SELECT
    s.id_siniestro,

    -- Temporal
    CASE
        WHEN p.fecha_inicio_poliza IS NOT NULL AND s.fecha_ocurrencia IS NOT NULL
        THEN s.fecha_ocurrencia - p.fecha_inicio_poliza
        ELSE NULL
    END AS dias_desde_inicio_poliza,

    CASE
        WHEN p.fecha_fin_poliza IS NOT NULL AND s.fecha_ocurrencia IS NOT NULL
        THEN p.fecha_fin_poliza - s.fecha_ocurrencia
        ELSE NULL
    END AS dias_desde_fin_poliza,

    CASE
        WHEN s.fecha_ocurrencia IS NOT NULL AND s.fecha_reporte IS NOT NULL
        THEN s.fecha_reporte - s.fecha_ocurrencia
        ELSE NULL
    END AS dias_entre_ocurrencia_reporte,

    -- Financial ratios
    CASE
        WHEN p.suma_asegurada > 0 AND s.monto_reclamado IS NOT NULL
        THEN ROUND(s.monto_reclamado / p.suma_asegurada, 4)
        ELSE NULL
    END AS ratio_monto_suma_asegurada,

    CASE
        WHEN s.monto_estimado > 0 AND s.monto_reclamado IS NOT NULL
        THEN ROUND(s.monto_reclamado / s.monto_estimado, 4)
        ELSE NULL
    END AS ratio_monto_estimado,

    COALESCE(s.monto_reclamado, 0) - COALESCE(s.monto_estimado, 0)
        AS diferencia_monto_reclamado_estimado,

    -- Frequency per asegurado
    COUNT(s2.id_siniestro) OVER (PARTITION BY s.id_asegurado)
        AS historial_siniestros_asegurado,

    -- Frequency per vehiculo
    COUNT(s3.id_siniestro) OVER (PARTITION BY s.id_vehiculo)
        AS historial_siniestros_vehiculo,

    -- Frequency per conductor
    COUNT(s4.id_siniestro) OVER (PARTITION BY s.id_conductor)
        AS historial_siniestros_conductor,

    -- Frequency per proveedor
    COUNT(s5.id_siniestro) OVER (PARTITION BY s.id_proveedor)
        AS frecuencia_proveedor,

    -- Document features
    COALESCE(d.documentos_faltantes, 0)     AS documentos_faltantes,
    COALESCE(d.documentos_inconsistentes, 0) AS documentos_inconsistentes,
    COALESCE(d.score_documental, 0.5)        AS score_documental,

    -- Boolean indicators derived from computed values
    (COUNT(s5.id_siniestro) OVER (PARTITION BY s.id_proveedor) > 10)
        AS proveedor_recurrente,

    CASE
        WHEN p.suma_asegurada > 0 AND s.monto_reclamado IS NOT NULL
        THEN s.monto_reclamado / p.suma_asegurada >= 0.90
        ELSE FALSE
    END AS monto_atipico,

    CASE
        WHEN s.fecha_ocurrencia IS NOT NULL AND s.fecha_reporte IS NOT NULL
        THEN (s.fecha_reporte - s.fecha_ocurrencia) > 7
        ELSE FALSE
    END AS reporte_tardio,

    CASE
        WHEN p.fecha_inicio_poliza IS NOT NULL AND p.fecha_fin_poliza IS NOT NULL
             AND s.fecha_ocurrencia IS NOT NULL
        THEN (
            (s.fecha_ocurrencia - p.fecha_inicio_poliza) <= 30
            OR
            (p.fecha_fin_poliza - s.fecha_ocurrencia) <= 30
        )
        ELSE FALSE
    END AS borde_vigencia

FROM fraud_claims.siniestros s
LEFT JOIN fraud_claims.polizas p
    ON s.id_poliza = p.id_poliza
LEFT JOIN fraud_claims.documentos d
    ON s.id_siniestro = d.id_siniestro
-- Self-joins for window function base tables (same table alias is fine for OVER)
LEFT JOIN fraud_claims.siniestros s2 ON s2.id_asegurado = s.id_asegurado
LEFT JOIN fraud_claims.siniestros s3 ON s3.id_vehiculo = s.id_vehiculo
LEFT JOIN fraud_claims.siniestros s4 ON s4.id_conductor = s.id_conductor AND s.id_conductor IS NOT NULL
LEFT JOIN fraud_claims.siniestros s5 ON s5.id_proveedor = s.id_proveedor AND s.id_proveedor IS NOT NULL;

-- Verify
SELECT
    COUNT(*)                                        AS total_features,
    AVG(ratio_monto_suma_asegurada)                 AS avg_ratio_monto,
    SUM(CASE WHEN borde_vigencia THEN 1 ELSE 0 END) AS borde_vigencia_count,
    SUM(CASE WHEN monto_atipico THEN 1 ELSE 0 END)  AS monto_atipico_count,
    SUM(CASE WHEN reporte_tardio THEN 1 ELSE 0 END) AS reporte_tardio_count
FROM fraud_claims.variables_riesgo;
