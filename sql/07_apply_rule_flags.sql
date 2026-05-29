-- ============================================================
-- fraudia-claims | 07_apply_rule_flags.sql
-- Create and populate the rule_flags table.
-- Each row = one claim + binary flag per fraud rule.
-- ============================================================

SET search_path TO fraud_claims, public;

CREATE TABLE IF NOT EXISTS fraud_claims.rule_flags (
    id_flag                         SERIAL      PRIMARY KEY,
    id_siniestro                    VARCHAR(64) NOT NULL REFERENCES fraud_claims.siniestros(id_siniestro),

    -- Individual rule flags (0 = inactive, 1 = active)
    flag_borde_vigencia             SMALLINT    NOT NULL DEFAULT 0,  -- RF-05
    flag_robo_denuncia_tardia       SMALLINT    NOT NULL DEFAULT 0,  -- RF-06
    flag_reporte_tardio             SMALLINT    NOT NULL DEFAULT 0,  -- RF-TEMP-01
    flag_monto_atipico              SMALLINT    NOT NULL DEFAULT 0,  -- RF-MONTO-01
    flag_documentos_incompletos     SMALLINT    NOT NULL DEFAULT 0,  -- RF-DOC-01
    flag_documentos_inconsistentes  SMALLINT    NOT NULL DEFAULT 0,  -- RF-DOC-02
    flag_proveedor_recurrente       SMALLINT    NOT NULL DEFAULT 0,  -- RF-PROV-01
    flag_proveedor_lista_restrictiva SMALLINT   NOT NULL DEFAULT 0,  -- RF-PROV-02 / RF-03
    flag_alta_frecuencia_asegurado  SMALLINT    NOT NULL DEFAULT 0,  -- RF-FREC-01
    flag_alta_frecuencia_vehiculo   SMALLINT    NOT NULL DEFAULT 0,  -- RF-FREC-02
    flag_alta_frecuencia_conductor  SMALLINT    NOT NULL DEFAULT 0,  -- RF-FREC-03
    flag_sin_tercero_identificado   SMALLINT    NOT NULL DEFAULT 0,  -- RF-DIN-01
    flag_dinamica_sospechosa        SMALLINT    NOT NULL DEFAULT 0,  -- RF-04
    flag_narrativa_clonada          SMALLINT    NOT NULL DEFAULT 0,  -- RF-07
    flag_cobertura_robo_total       SMALLINT    NOT NULL DEFAULT 0,  -- RF-01

    computed_at                     TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_rule_flags_siniestro UNIQUE (id_siniestro)
);

CREATE INDEX IF NOT EXISTS idx_rule_flags_siniestro
    ON fraud_claims.rule_flags (id_siniestro);

-- Truncate for idempotent runs
TRUNCATE fraud_claims.rule_flags;

INSERT INTO fraud_claims.rule_flags (
    id_siniestro,
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
    flag_cobertura_robo_total
)
SELECT
    vr.id_siniestro,

    -- RF-05: Borde de vigencia
    CASE WHEN vr.borde_vigencia THEN 1 ELSE 0 END
        AS flag_borde_vigencia,

    -- RF-06: Robo con denuncia tardía
    CASE
        WHEN LOWER(s.cobertura) LIKE '%robo%'
             AND vr.dias_entre_ocurrencia_reporte > 4
        THEN 1 ELSE 0
    END AS flag_robo_denuncia_tardia,

    -- RF-TEMP-01: Reporte tardío
    CASE WHEN vr.dias_entre_ocurrencia_reporte > 7 THEN 1 ELSE 0 END
        AS flag_reporte_tardio,

    -- RF-MONTO-01: Monto atípico
    CASE WHEN vr.monto_atipico THEN 1 ELSE 0 END
        AS flag_monto_atipico,

    -- RF-DOC-01: Documentos incompletos
    CASE WHEN vr.documentos_faltantes > 0 THEN 1 ELSE 0 END
        AS flag_documentos_incompletos,

    -- RF-DOC-02: Documentos inconsistentes
    CASE WHEN vr.documentos_inconsistentes > 0 THEN 1 ELSE 0 END
        AS flag_documentos_inconsistentes,

    -- RF-PROV-01: Proveedor recurrente
    CASE WHEN vr.frecuencia_proveedor > 10 THEN 1 ELSE 0 END
        AS flag_proveedor_recurrente,

    -- RF-PROV-02 / RF-03: Proveedor en lista restrictiva
    CASE WHEN prov.en_lista_restrictiva THEN 1 ELSE 0 END
        AS flag_proveedor_lista_restrictiva,

    -- RF-FREC-01: Alta frecuencia asegurado
    CASE WHEN vr.historial_siniestros_asegurado >= 3 THEN 1 ELSE 0 END
        AS flag_alta_frecuencia_asegurado,

    -- RF-FREC-02: Alta frecuencia vehículo
    CASE WHEN vr.historial_siniestros_vehiculo >= 3 THEN 1 ELSE 0 END
        AS flag_alta_frecuencia_vehiculo,

    -- RF-FREC-03: Alta frecuencia conductor
    CASE WHEN vr.historial_siniestros_conductor >= 3 THEN 1 ELSE 0 END
        AS flag_alta_frecuencia_conductor,

    -- RF-DIN-01: Siniestro severo sin tercero identificado (proxy: high ratio)
    CASE WHEN vr.ratio_monto_suma_asegurada >= 0.85 THEN 1 ELSE 0 END
        AS flag_sin_tercero_identificado,

    -- RF-04: Dinámica sospechosa (keyword proxy in description)
    CASE
        WHEN s.descripcion ILIKE '%imposible%'
          OR s.descripcion ILIKE '%inexplicable%'
          OR s.descripcion ILIKE '%sin frenos%'
          OR s.descripcion ILIKE '%nadie vio%'
          OR s.descripcion ILIKE '%sin control%'
          OR s.descripcion ILIKE '%desapareció%'
          OR s.descripcion ILIKE '%solo%'
        THEN 1 ELSE 0
    END AS flag_dinamica_sospechosa,

    -- RF-07: Narrativa clonada (duplicate description detection)
    CASE
        WHEN COUNT(*) OVER (PARTITION BY LOWER(TRIM(s.descripcion))) > 1
             AND LENGTH(TRIM(s.descripcion)) > 10
        THEN 1 ELSE 0
    END AS flag_narrativa_clonada,

    -- RF-01: Cobertura pérdida total por robo
    CASE
        WHEN LOWER(s.cobertura) LIKE '%pérdida total%'
          OR LOWER(s.cobertura) LIKE '%perdida total%'
          OR LOWER(s.cobertura) LIKE '%robo total%'
        THEN 1 ELSE 0
    END AS flag_cobertura_robo_total

FROM fraud_claims.variables_riesgo vr
JOIN fraud_claims.siniestros s ON vr.id_siniestro = s.id_siniestro
LEFT JOIN fraud_claims.proveedores prov ON s.id_proveedor = prov.id_proveedor;

-- Summary
SELECT
    SUM(flag_borde_vigencia)                AS flag_borde_vigencia,
    SUM(flag_robo_denuncia_tardia)          AS flag_robo_denuncia_tardia,
    SUM(flag_reporte_tardio)                AS flag_reporte_tardio,
    SUM(flag_monto_atipico)                 AS flag_monto_atipico,
    SUM(flag_documentos_incompletos)        AS flag_documentos_incompletos,
    SUM(flag_proveedor_lista_restrictiva)   AS flag_proveedor_lista_restrictiva,
    SUM(flag_alta_frecuencia_asegurado)     AS flag_alta_frecuencia_asegurado
FROM fraud_claims.rule_flags;
