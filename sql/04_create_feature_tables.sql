-- ============================================================
-- fraudia-claims | 04_create_feature_tables.sql
-- Feature table: variables_riesgo
-- Stores all computed risk variables per claim.
-- ============================================================

SET search_path TO fraud_claims, public;

CREATE TABLE IF NOT EXISTS fraud_claims.variables_riesgo (
    id_variable             SERIAL          PRIMARY KEY,
    id_siniestro            VARCHAR(64)     NOT NULL REFERENCES fraud_claims.siniestros(id_siniestro),

    -- Temporal features
    dias_desde_inicio_poliza        INTEGER,
    dias_desde_fin_poliza           INTEGER,
    dias_entre_ocurrencia_reporte   INTEGER,

    -- Financial features
    ratio_monto_suma_asegurada      NUMERIC(8, 4),
    ratio_monto_estimado            NUMERIC(8, 4),
    diferencia_monto_reclamado_estimado NUMERIC(18, 2),

    -- Historical frequency features
    historial_siniestros_asegurado  INTEGER     DEFAULT 0,
    historial_siniestros_vehiculo   INTEGER     DEFAULT 0,
    historial_siniestros_conductor  INTEGER     DEFAULT 0,
    frecuencia_proveedor            INTEGER     DEFAULT 0,

    -- Document features
    documentos_faltantes            INTEGER     DEFAULT 0,
    documentos_inconsistentes       INTEGER     DEFAULT 0,
    score_documental                NUMERIC(5, 4) DEFAULT 0.5,

    -- Boolean indicator features
    proveedor_recurrente            BOOLEAN     DEFAULT FALSE,
    monto_atipico                   BOOLEAN     DEFAULT FALSE,
    reporte_tardio                  BOOLEAN     DEFAULT FALSE,
    borde_vigencia                  BOOLEAN     DEFAULT FALSE,

    -- Computed at
    computed_at                     TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_variables_siniestro UNIQUE (id_siniestro)
);

CREATE INDEX IF NOT EXISTS idx_variables_siniestro
    ON fraud_claims.variables_riesgo (id_siniestro);

CREATE INDEX IF NOT EXISTS idx_variables_borde
    ON fraud_claims.variables_riesgo (borde_vigencia);

CREATE INDEX IF NOT EXISTS idx_variables_monto_ratio
    ON fraud_claims.variables_riesgo (ratio_monto_suma_asegurada);

COMMENT ON TABLE fraud_claims.variables_riesgo IS
    'Computed risk variables (features) for each claim, used as input to the fraud rule engine.';

COMMENT ON COLUMN fraud_claims.variables_riesgo.dias_desde_inicio_poliza IS 'Days between policy start and incident date.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.dias_desde_fin_poliza IS 'Days between incident and policy expiry (negative = after expiry).';
COMMENT ON COLUMN fraud_claims.variables_riesgo.dias_entre_ocurrencia_reporte IS 'Days between incident and claim report.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.ratio_monto_suma_asegurada IS 'Ratio of claimed amount to total insured sum.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.ratio_monto_estimado IS 'Ratio of claimed amount to adjuster estimate.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.historial_siniestros_asegurado IS 'Total claims by the same insured in the analysis window.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.historial_siniestros_vehiculo IS 'Total claims for the same vehicle in the analysis window.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.historial_siniestros_conductor IS 'Total claims for the same driver in the analysis window.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.frecuencia_proveedor IS 'Total claims associated with the same provider.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.borde_vigencia IS 'True if incident occurred within 30 days of policy start or end.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.monto_atipico IS 'True if claimed amount >= 90% of insured sum.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.reporte_tardio IS 'True if report was filed > 7 days after incident.';
COMMENT ON COLUMN fraud_claims.variables_riesgo.proveedor_recurrente IS 'True if provider appears in > 10 claims.';
