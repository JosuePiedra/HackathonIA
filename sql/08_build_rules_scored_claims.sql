-- ============================================================
-- fraudia-claims | 08_build_rules_scored_claims.sql
-- CREATE VIEW: vw_rules_scored_claims
-- Comprehensive view joining all tables with computed rule score.
-- ============================================================

SET search_path TO fraud_claims, public;

DROP VIEW IF EXISTS fraud_claims.vw_rules_scored_claims;

CREATE VIEW fraud_claims.vw_rules_scored_claims AS
SELECT
    -- ---- Identifiers ----
    s.id_siniestro,
    s.id_poliza,
    s.id_asegurado,
    s.id_vehiculo,
    s.id_proveedor,
    s.id_conductor,

    -- ---- Classification ----
    s.ramo,
    s.cobertura,
    s.estado,
    s.sucursal,
    s.ciudad,
    s.provincia,

    -- ---- Dates ----
    s.fecha_ocurrencia,
    s.fecha_reporte,
    p.fecha_inicio_poliza,
    p.fecha_fin_poliza,

    -- ---- Financial ----
    s.monto_reclamado,
    s.monto_estimado,
    s.monto_pagado,
    p.suma_asegurada,
    s.deducible,

    -- ---- Content ----
    s.descripcion,

    -- ---- Features: Temporal ----
    vr.dias_desde_inicio_poliza,
    vr.dias_desde_fin_poliza,
    vr.dias_entre_ocurrencia_reporte,

    -- ---- Features: Financial ----
    vr.ratio_monto_suma_asegurada,
    vr.ratio_monto_estimado,
    vr.diferencia_monto_reclamado_estimado,

    -- ---- Features: Frequency ----
    vr.historial_siniestros_asegurado,
    vr.historial_siniestros_vehiculo,
    vr.historial_siniestros_conductor,
    vr.frecuencia_proveedor,

    -- ---- Features: Documents ----
    vr.documentos_faltantes,
    vr.documentos_inconsistentes,
    vr.score_documental,

    -- ---- Features: Booleans ----
    vr.proveedor_recurrente,
    vr.monto_atipico,
    vr.reporte_tardio,
    vr.borde_vigencia,

    -- ---- Provider info ----
    prov.en_lista_restrictiva,
    prov.nivel_observacion,
    prov.reclamos_asociados            AS proveedor_reclamos_total,
    prov.monto_promedio_reclamado      AS proveedor_monto_promedio,

    -- ---- Rule Flags ----
    rf.flag_borde_vigencia,
    rf.flag_robo_denuncia_tardia,
    rf.flag_reporte_tardio,
    rf.flag_monto_atipico,
    rf.flag_documentos_incompletos,
    rf.flag_documentos_inconsistentes,
    rf.flag_proveedor_recurrente,
    rf.flag_proveedor_lista_restrictiva,
    rf.flag_alta_frecuencia_asegurado,
    rf.flag_alta_frecuencia_vehiculo,
    rf.flag_alta_frecuencia_conductor,
    rf.flag_sin_tercero_identificado,
    rf.flag_dinamica_sospechosa,
    rf.flag_narrativa_clonada,
    rf.flag_cobertura_robo_total,

    -- ---- Score: weighted sum capped at 100 ----
    LEAST(
        (
            rf.flag_borde_vigencia              * 8   -- RF-05
          + rf.flag_robo_denuncia_tardia         * 8   -- RF-06
          + rf.flag_reporte_tardio               * 5   -- RF-TEMP-01
          + rf.flag_monto_atipico                * 5   -- RF-MONTO-01
          + rf.flag_documentos_incompletos       * 4   -- RF-DOC-01
          + rf.flag_documentos_inconsistentes    * 10  -- RF-DOC-02
          + rf.flag_proveedor_recurrente         * 5   -- RF-PROV-01
          + rf.flag_proveedor_lista_restrictiva  * 10  -- RF-PROV-02
          + rf.flag_alta_frecuencia_asegurado    * 8   -- RF-FREC-01
          + rf.flag_alta_frecuencia_vehiculo     * 6   -- RF-FREC-02
          + rf.flag_alta_frecuencia_conductor    * 8   -- RF-FREC-03
          + rf.flag_sin_tercero_identificado     * 6   -- RF-DIN-01
          + rf.flag_dinamica_sospechosa          * 10  -- RF-04
          + rf.flag_narrativa_clonada            * 8   -- RF-07
          + rf.flag_cobertura_robo_total         * 10  -- RF-01
        ),
        100
    ) AS score_reglas,

    -- ---- Risk Level ----
    CASE
        WHEN LEAST(
            rf.flag_borde_vigencia * 8 + rf.flag_robo_denuncia_tardia * 8
            + rf.flag_reporte_tardio * 5 + rf.flag_monto_atipico * 5
            + rf.flag_documentos_incompletos * 4 + rf.flag_documentos_inconsistentes * 10
            + rf.flag_proveedor_recurrente * 5 + rf.flag_proveedor_lista_restrictiva * 10
            + rf.flag_alta_frecuencia_asegurado * 8 + rf.flag_alta_frecuencia_vehiculo * 6
            + rf.flag_alta_frecuencia_conductor * 8 + rf.flag_sin_tercero_identificado * 6
            + rf.flag_dinamica_sospechosa * 10 + rf.flag_narrativa_clonada * 8
            + rf.flag_cobertura_robo_total * 10,
            100
        ) >= 40 THEN 'Rojo'
        WHEN LEAST(
            rf.flag_borde_vigencia * 8 + rf.flag_robo_denuncia_tardia * 8
            + rf.flag_reporte_tardio * 5 + rf.flag_monto_atipico * 5
            + rf.flag_documentos_incompletos * 4 + rf.flag_documentos_inconsistentes * 10
            + rf.flag_proveedor_recurrente * 5 + rf.flag_proveedor_lista_restrictiva * 10
            + rf.flag_alta_frecuencia_asegurado * 8 + rf.flag_alta_frecuencia_vehiculo * 6
            + rf.flag_alta_frecuencia_conductor * 8 + rf.flag_sin_tercero_identificado * 6
            + rf.flag_dinamica_sospechosa * 10 + rf.flag_narrativa_clonada * 8
            + rf.flag_cobertura_robo_total * 10,
            100
        ) >= 20 THEN 'Amarillo'
        ELSE 'Verde'
    END AS nivel_reglas,

    -- ---- Ground truth ----
    s.etiqueta_fraude_simulada,

    -- ---- Metadata ----
    s.source_file,
    s.mapping_confidence,
    s.data_quality_score,
    s.limitacion_registro,
    s.created_at

FROM fraud_claims.siniestros s
LEFT JOIN fraud_claims.polizas p
    ON s.id_poliza = p.id_poliza
LEFT JOIN fraud_claims.variables_riesgo vr
    ON s.id_siniestro = vr.id_siniestro
LEFT JOIN fraud_claims.rule_flags rf
    ON s.id_siniestro = rf.id_siniestro
LEFT JOIN fraud_claims.proveedores prov
    ON s.id_proveedor = prov.id_proveedor;

COMMENT ON VIEW fraud_claims.vw_rules_scored_claims IS
    'Comprehensive view of all claims with computed features, rule flags, and fraud risk scores.';
