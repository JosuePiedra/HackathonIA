-- ============================================================
-- 06_build_features.sql
-- Poblar variable_riesgo desde siniestro + poliza + documento
-- Ejecutar después de migrar datos a las tablas normalizadas.
-- ============================================================

-- Limpiar para ejecución idempotente
TRUNCATE variable_riesgo;

INSERT INTO variable_riesgo (
    id_siniestro,
    dias_desde_inicio_poliza,
    dias_desde_fin_poliza,
    dias_entre_ocurrencia_reporte,
    ratio_monto_suma_asegurada,
    ratio_monto_estimado,
    diferencia_monto_reclamado_estimado,
    historial_siniestros_asegurado,
    historial_siniestros_vehiculo,
    historial_siniestros_conductor,
    frecuencia_proveedor,
    documentos_faltantes,
    documentos_inconsistentes,
    proveedor_recurrente,
    monto_atipico,
    reporte_tardio,
    borde_vigencia
)
SELECT
    s.id_siniestro,

    -- Temporales
    CASE
        WHEN p.fecha_inicio IS NOT NULL AND s.fecha_ocurrencia IS NOT NULL
        THEN s.fecha_ocurrencia - p.fecha_inicio
        ELSE NULL
    END AS dias_desde_inicio_poliza,

    CASE
        WHEN p.fecha_fin IS NOT NULL AND s.fecha_ocurrencia IS NOT NULL
        THEN p.fecha_fin - s.fecha_ocurrencia
        ELSE NULL
    END AS dias_desde_fin_poliza,

    CASE
        WHEN s.fecha_ocurrencia IS NOT NULL AND s.fecha_reporte IS NOT NULL
        THEN s.fecha_reporte - s.fecha_ocurrencia
        ELSE NULL
    END AS dias_entre_ocurrencia_reporte,

    -- Financieros
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

    -- Frecuencias históricas (ventanas sobre el dataset completo)
    COUNT(s2.id_siniestro) OVER (PARTITION BY s.id_asegurado)
        AS historial_siniestros_asegurado,

    COUNT(s3.id_siniestro) OVER (PARTITION BY s.id_vehiculo)
        AS historial_siniestros_vehiculo,

    COUNT(s4.id_siniestro) OVER (PARTITION BY s.id_conductor)
        AS historial_siniestros_conductor,

    COUNT(s5.id_siniestro) OVER (PARTITION BY s.id_proveedor)
        AS frecuencia_proveedor,

    -- Documentos
    COALESCE(
        (SELECT COUNT(*) FROM documento d
         WHERE d.id_siniestro = s.id_siniestro
           AND d.obligatorio = TRUE AND d.entregado = FALSE),
        CASE WHEN s.documentos_completos = FALSE THEN 1 ELSE 0 END
    ) AS documentos_faltantes,

    COALESCE(
        (SELECT COUNT(*) FROM documento d
         WHERE d.id_siniestro = s.id_siniestro
           AND d.inconsistencia_detectada = TRUE),
        0
    ) AS documentos_inconsistentes,

    -- Indicadores booleanos
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
        WHEN p.fecha_inicio IS NOT NULL AND p.fecha_fin IS NOT NULL
             AND s.fecha_ocurrencia IS NOT NULL
        THEN (
            (s.fecha_ocurrencia - p.fecha_inicio) <= 30
            OR (p.fecha_fin - s.fecha_ocurrencia) <= 30
        )
        ELSE FALSE
    END AS borde_vigencia

FROM siniestro s
LEFT JOIN poliza p ON s.id_poliza = p.id_poliza
LEFT JOIN siniestro s2 ON s2.id_asegurado = s.id_asegurado
LEFT JOIN siniestro s3 ON s3.id_vehiculo = s.id_vehiculo
LEFT JOIN siniestro s4 ON s4.id_conductor = s.id_conductor AND s.id_conductor IS NOT NULL
LEFT JOIN siniestro s5 ON s5.id_proveedor = s.id_proveedor AND s.id_proveedor IS NOT NULL;

-- Verificación
SELECT
    COUNT(*)                                        AS total_features,
    AVG(ratio_monto_suma_asegurada)                 AS avg_ratio_monto,
    SUM(CASE WHEN borde_vigencia THEN 1 ELSE 0 END) AS borde_vigencia_count,
    SUM(CASE WHEN monto_atipico  THEN 1 ELSE 0 END) AS monto_atipico_count,
    SUM(CASE WHEN reporte_tardio THEN 1 ELSE 0 END) AS reporte_tardio_count
FROM variable_riesgo;
