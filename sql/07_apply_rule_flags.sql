-- ============================================================
-- 07_apply_rule_flags.sql
-- Insertar alertas en alerta_regla y calcular score_siniestro.
-- Ejecutar después de 06_build_features.sql.
-- ============================================================

-- Limpiar para ejecución idempotente
DELETE FROM score_siniestro;
DELETE FROM alerta_regla;

-- ============================================================
-- RF-01: Cobertura pérdida total por robo
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    s.id_siniestro,
    'RF-01',
    'Cobertura pérdida total por robo',
    'Rojo', 'Alta',
    'cobertura',
    s.cobertura,
    'Siniestro con cobertura de pérdida total por robo. Requiere validación exhaustiva.'
FROM siniestro s
WHERE LOWER(COALESCE(s.cobertura,'')) LIKE '%pérdida total%'
   OR LOWER(COALESCE(s.cobertura,'')) LIKE '%perdida total%'
   OR LOWER(COALESCE(s.cobertura,'')) LIKE '%robo total%';

-- ============================================================
-- RF-02: Evidencia de falsificación documental
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro,
    'RF-02',
    'Evidencia de falsificación o adulteración documental',
    'Rojo', 'Crítica',
    'documentos_inconsistentes',
    vr.documentos_inconsistentes::TEXT,
    'Se detectaron documentos inconsistentes en el expediente.'
FROM variable_riesgo vr
WHERE vr.documentos_inconsistentes > 0;

-- ============================================================
-- RF-03: Coincidencia con lista restrictiva
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    s.id_siniestro,
    'RF-03',
    'Coincidencia con lista restrictiva',
    'Rojo', 'Crítica',
    'en_lista_restrictiva',
    'true',
    'El proveedor asociado aparece en la lista restrictiva.'
FROM siniestro s
JOIN proveedor p ON s.id_proveedor = p.id_proveedor
WHERE p.en_lista_restrictiva = TRUE;

-- ============================================================
-- RF-04: Dinámica físicamente imposible
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    s.id_siniestro,
    'RF-04',
    'Dinámica físicamente imposible',
    'Rojo', 'Crítica',
    'descripcion',
    LEFT(s.descripcion, 100),
    'La narrativa contiene indicios de dinámica físicamente imposible o inexplicable.'
FROM siniestro s
WHERE s.descripcion ILIKE '%imposible%'
   OR s.descripcion ILIKE '%inexplicable%'
   OR s.descripcion ILIKE '%sin frenos%'
   OR s.descripcion ILIKE '%sin control%'
   OR s.descripcion ILIKE '%desapareció%'
   OR s.descripcion ILIKE '%nadie vio%';

-- ============================================================
-- RF-05: Siniestro extremo al borde de vigencia
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro,
    'RF-05',
    'Siniestro extremo al borde de vigencia',
    'Amarillo', 'Media-Alta',
    'borde_vigencia',
    'true — dias_inicio=' || COALESCE(vr.dias_desde_inicio_poliza::TEXT, 'N/A')
        || ' dias_fin=' || COALESCE(vr.dias_desde_fin_poliza::TEXT, 'N/A'),
    'Siniestro ocurrido muy cerca del inicio o fin de vigencia de la póliza.'
FROM variable_riesgo vr
WHERE vr.borde_vigencia = TRUE
  AND (vr.dias_desde_inicio_poliza <= 2 OR vr.dias_desde_fin_poliza <= 2);

-- ============================================================
-- RF-06: Demora atípica en denuncia de robo
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro,
    'RF-06',
    'Demora atípica en denuncia de robo',
    'Amarillo', 'Media-Alta',
    'dias_entre_ocurrencia_reporte',
    vr.dias_entre_ocurrencia_reporte::TEXT,
    'Robo reportado con demora superior a 4 días.'
FROM variable_riesgo vr
JOIN siniestro s ON vr.id_siniestro = s.id_siniestro
WHERE LOWER(COALESCE(s.cobertura,'')) LIKE '%robo%'
  AND vr.dias_entre_ocurrencia_reporte > 4;

-- ============================================================
-- RF-07: Narrativa idéntica o clonada
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    s.id_siniestro,
    'RF-07',
    'Narrativa idéntica o clonada',
    'Amarillo', 'Media-Alta',
    'descripcion',
    LEFT(s.descripcion, 60),
    'La narrativa del siniestro es idéntica a otra denuncia del dataset.'
FROM siniestro s
WHERE LENGTH(TRIM(COALESCE(s.descripcion,''))) > 10
  AND (
    SELECT COUNT(*) FROM siniestro s2
    WHERE LOWER(TRIM(s2.descripcion)) = LOWER(TRIM(s.descripcion))
      AND s2.id_siniestro <> s.id_siniestro
  ) > 0;

-- ============================================================
-- RF-TEMP-01: Reporte tardío
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro, 'RF-TEMP-01', 'Reporte tardío',
    'Amarillo', 'Media',
    'dias_entre_ocurrencia_reporte', vr.dias_entre_ocurrencia_reporte::TEXT,
    'Siniestro reportado más de 7 días después de la ocurrencia.'
FROM variable_riesgo vr
WHERE vr.reporte_tardio = TRUE;

-- ============================================================
-- RF-MONTO-01: Monto cercano a suma asegurada
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro, 'RF-MONTO-01', 'Monto cercano a suma asegurada',
    'Amarillo', 'Media',
    'ratio_monto_suma_asegurada', vr.ratio_monto_suma_asegurada::TEXT,
    'Monto reclamado representa ≥ 90% de la suma asegurada.'
FROM variable_riesgo vr
WHERE vr.monto_atipico = TRUE;

-- ============================================================
-- RF-DOC-01: Documentos incompletos
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro, 'RF-DOC-01', 'Documentos incompletos',
    'Amarillo', 'Media',
    'documentos_faltantes', vr.documentos_faltantes::TEXT,
    'Faltan documentos obligatorios en el expediente.'
FROM variable_riesgo vr
WHERE vr.documentos_faltantes > 0;

-- ============================================================
-- RF-DOC-02: Documentos inconsistentes (operativa)
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro, 'RF-DOC-02', 'Documentos inconsistentes',
    'Rojo', 'Alta',
    'documentos_inconsistentes', vr.documentos_inconsistentes::TEXT,
    'Existen inconsistencias detectadas en los documentos del expediente.'
FROM variable_riesgo vr
WHERE vr.documentos_inconsistentes > 0
  -- Evitar duplicado con RF-02 (que aplica cuando hay evidencia fuerte de falsificación)
  AND NOT EXISTS (
    SELECT 1 FROM alerta_regla ar
    WHERE ar.id_siniestro = vr.id_siniestro AND ar.codigo_regla = 'RF-02'
  );

-- ============================================================
-- RF-PROV-01: Proveedor recurrente
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro, 'RF-PROV-01', 'Proveedor recurrente',
    'Amarillo', 'Media',
    'frecuencia_proveedor', vr.frecuencia_proveedor::TEXT,
    'Proveedor asociado a más de 10 siniestros en el período.'
FROM variable_riesgo vr
WHERE vr.proveedor_recurrente = TRUE;

-- ============================================================
-- RF-FREC-01: Alta frecuencia asegurado
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro, 'RF-FREC-01', 'Alta frecuencia de reclamos por asegurado',
    'Amarillo', 'Media-Alta',
    'historial_siniestros_asegurado', vr.historial_siniestros_asegurado::TEXT,
    'Asegurado con 3 o más siniestros en el período analizado.'
FROM variable_riesgo vr
WHERE vr.historial_siniestros_asegurado >= 3;

-- ============================================================
-- RF-FREC-02: Alta frecuencia vehículo
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro, 'RF-FREC-02', 'Alta frecuencia de reclamos por vehículo',
    'Amarillo', 'Media',
    'historial_siniestros_vehiculo', vr.historial_siniestros_vehiculo::TEXT,
    'Vehículo asociado a 3 o más siniestros en el período analizado.'
FROM variable_riesgo vr
WHERE vr.historial_siniestros_vehiculo >= 3;

-- ============================================================
-- RF-FREC-03: Alta frecuencia conductor
-- ============================================================
INSERT INTO alerta_regla (id_siniestro, codigo_regla, nombre_regla, clasificacion, severidad, variable_evaluada, valor_detectado, explicacion)
SELECT
    vr.id_siniestro, 'RF-FREC-03', 'Alta frecuencia de reclamos por conductor',
    'Amarillo', 'Media-Alta',
    'historial_siniestros_conductor', vr.historial_siniestros_conductor::TEXT,
    'Conductor asociado a 3 o más siniestros en el período analizado.'
FROM variable_riesgo vr
WHERE vr.historial_siniestros_conductor >= 3;

-- ============================================================
-- CALCULAR score_siniestro
-- ============================================================

INSERT INTO score_siniestro (
    id_siniestro,
    score_heuristico,
    prediccion_ml,
    probabilidad_ml,
    score_final,
    nivel_riesgo,
    reglas_criticas_activadas,
    factores_principales,
    explicacion_final,
    accion_sugerida,
    mensaje_ia,
    fecha_evaluacion,
    version_modelo
)
SELECT
    s.id_siniestro,

    LEAST(COALESCE(SUM(cr.puntaje_base), 0), 100) AS score_heuristico,

    NULL AS prediccion_ml,
    NULL AS probabilidad_ml,
    NULL AS score_final,

    CASE
        WHEN LEAST(COALESCE(SUM(cr.puntaje_base), 0), 100) > 75 THEN 'Rojo'
        WHEN LEAST(COALESCE(SUM(cr.puntaje_base), 0), 100) > 40 THEN 'Amarillo'
        ELSE 'Verde'
    END AS nivel_riesgo,

    STRING_AGG(ar.codigo_regla, ', ')
        FILTER (WHERE cr.es_critica = TRUE)         AS reglas_criticas_activadas,

    STRING_AGG(ar.nombre_regla, ' | ')
        FILTER (WHERE cr.puntaje_base >= 10)        AS factores_principales,

    'Evaluación determinística basada en ' ||
        COUNT(ar.id_alerta)::TEXT || ' regla(s) activa(s). ' ||
        'Puntaje heurístico: ' ||
        LEAST(COALESCE(SUM(cr.puntaje_base), 0), 100)::TEXT || '/100.'
        AS explicacion_final,

    CASE
        WHEN LEAST(COALESCE(SUM(cr.puntaje_base), 0), 100) > 75
            THEN 'Escalar a revisión antifraude especializada.'
        WHEN LEAST(COALESCE(SUM(cr.puntaje_base), 0), 100) > 40
            THEN 'Escalar a revisión documental.'
        ELSE 'Continuar flujo normal.'
    END AS accion_sugerida,

    'Esta evaluación es una alerta para revisión humana, no una acusación automática ni una decisión de rechazo.'
        AS mensaje_ia,

    NOW() AS fecha_evaluacion,
    'heuristic-v1.0' AS version_modelo

FROM siniestro s
LEFT JOIN alerta_regla ar ON s.id_siniestro = ar.id_siniestro
LEFT JOIN catalogo_regla cr ON ar.codigo_regla = cr.codigo_regla
GROUP BY s.id_siniestro;

-- Resumen
SELECT
    nivel_riesgo,
    COUNT(*) AS total,
    ROUND(AVG(score_heuristico), 2) AS avg_score
FROM score_siniestro
GROUP BY nivel_riesgo
ORDER BY nivel_riesgo;
