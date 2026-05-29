-- ============================================================
-- fraudia-claims | 02_create_normalized_tables.sql
-- Normalized entity tables: asegurados, polizas, vehiculos,
-- proveedores, siniestros, documentos.
-- ============================================================

SET search_path TO fraud_claims, public;

-- ------------------------------------------------------------
-- ASEGURADOS (Customers / Policyholders)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_claims.asegurados (
    id_asegurado                VARCHAR(64)     PRIMARY KEY,
    nombre                      VARCHAR(256),
    ciudad                      VARCHAR(128),
    provincia                   VARCHAR(128),
    reclamos_ultimos_12_meses   INTEGER         NOT NULL DEFAULT 0,
    created_at                  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asegurados_ciudad ON fraud_claims.asegurados (ciudad);

COMMENT ON TABLE fraud_claims.asegurados IS 'Normalized insured persons/policyholders.';

-- ------------------------------------------------------------
-- POLIZAS (Insurance Policies)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_claims.polizas (
    id_poliza               VARCHAR(64)     PRIMARY KEY,
    id_asegurado            VARCHAR(64)     REFERENCES fraud_claims.asegurados(id_asegurado),
    id_vehiculo             VARCHAR(64),
    ramo                    VARCHAR(128)    NOT NULL,
    cobertura               VARCHAR(256)    NOT NULL,
    fecha_inicio_poliza     DATE,
    fecha_fin_poliza        DATE,
    suma_asegurada          NUMERIC(18, 2),
    deducible               NUMERIC(18, 2),
    sucursal                VARCHAR(128),
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_poliza_dates CHECK (fecha_inicio_poliza IS NULL OR fecha_fin_poliza IS NULL OR fecha_inicio_poliza < fecha_fin_poliza)
);

CREATE INDEX IF NOT EXISTS idx_polizas_asegurado ON fraud_claims.polizas (id_asegurado);
CREATE INDEX IF NOT EXISTS idx_polizas_ramo ON fraud_claims.polizas (ramo);
CREATE INDEX IF NOT EXISTS idx_polizas_dates ON fraud_claims.polizas (fecha_inicio_poliza, fecha_fin_poliza);

COMMENT ON TABLE fraud_claims.polizas IS 'Normalized insurance policies.';

-- ------------------------------------------------------------
-- VEHICULOS (Insured Vehicles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_claims.vehiculos (
    id_vehiculo             VARCHAR(64)     PRIMARY KEY,
    id_asegurado            VARCHAR(64)     REFERENCES fraud_claims.asegurados(id_asegurado),
    id_poliza               VARCHAR(64)     REFERENCES fraud_claims.polizas(id_poliza),
    marca                   VARCHAR(128),
    modelo                  VARCHAR(128),
    anio                    INTEGER,
    placa                   VARCHAR(32),
    ramo                    VARCHAR(128),
    siniestros_asociados    INTEGER         NOT NULL DEFAULT 0,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_asegurado ON fraud_claims.vehiculos (id_asegurado);
CREATE INDEX IF NOT EXISTS idx_vehiculos_placa ON fraud_claims.vehiculos (placa);

COMMENT ON TABLE fraud_claims.vehiculos IS 'Normalized insured vehicles.';

-- ------------------------------------------------------------
-- PROVEEDORES (Service Providers: workshops, clinics, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_claims.proveedores (
    id_proveedor                VARCHAR(64)     PRIMARY KEY,
    nombre                      VARCHAR(256),
    ciudad                      VARCHAR(128),
    provincia                   VARCHAR(128),
    tipo_proveedor              VARCHAR(128),   -- e.g. taller, clínica, grúa
    reclamos_asociados          INTEGER         NOT NULL DEFAULT 0,
    monto_promedio_reclamado    NUMERIC(18, 2)  DEFAULT 0,
    nivel_observacion           VARCHAR(32)     DEFAULT 'normal',  -- normal, medio, alto
    en_lista_restrictiva        BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_ciudad ON fraud_claims.proveedores (ciudad);
CREATE INDEX IF NOT EXISTS idx_proveedores_lista ON fraud_claims.proveedores (en_lista_restrictiva);

COMMENT ON TABLE fraud_claims.proveedores IS 'Normalized service providers associated with claims.';

-- ------------------------------------------------------------
-- SINIESTROS (Claims)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_claims.siniestros (
    id_siniestro            VARCHAR(64)     PRIMARY KEY,
    id_poliza               VARCHAR(64)     REFERENCES fraud_claims.polizas(id_poliza),
    id_asegurado            VARCHAR(64)     REFERENCES fraud_claims.asegurados(id_asegurado),
    id_vehiculo             VARCHAR(64)     REFERENCES fraud_claims.vehiculos(id_vehiculo),
    id_proveedor            VARCHAR(64)     REFERENCES fraud_claims.proveedores(id_proveedor),
    id_conductor            VARCHAR(64),
    ramo                    VARCHAR(128)    NOT NULL,
    cobertura               VARCHAR(256)    NOT NULL,
    estado                  VARCHAR(128)    NOT NULL,
    sucursal                VARCHAR(128),
    ciudad                  VARCHAR(128),
    provincia               VARCHAR(128),
    fecha_ocurrencia        DATE,
    fecha_reporte           DATE,
    monto_reclamado         NUMERIC(18, 2),
    monto_estimado          NUMERIC(18, 2),
    monto_pagado            NUMERIC(18, 2),
    deducible               NUMERIC(18, 2),
    descripcion             TEXT,
    etiqueta_fraude_simulada BOOLEAN        DEFAULT FALSE,
    source_file             VARCHAR(512),
    mapping_confidence      NUMERIC(5, 4),
    data_quality_score      NUMERIC(5, 4),
    limitacion_registro     TEXT,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_siniestro_fechas CHECK (
        fecha_ocurrencia IS NULL OR fecha_reporte IS NULL OR fecha_ocurrencia <= fecha_reporte
    ),
    CONSTRAINT chk_montos_positivos CHECK (
        (monto_reclamado IS NULL OR monto_reclamado >= 0) AND
        (monto_estimado IS NULL OR monto_estimado >= 0) AND
        (monto_pagado IS NULL OR monto_pagado >= 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_siniestros_poliza ON fraud_claims.siniestros (id_poliza);
CREATE INDEX IF NOT EXISTS idx_siniestros_asegurado ON fraud_claims.siniestros (id_asegurado);
CREATE INDEX IF NOT EXISTS idx_siniestros_fecha_occ ON fraud_claims.siniestros (fecha_ocurrencia);
CREATE INDEX IF NOT EXISTS idx_siniestros_estado ON fraud_claims.siniestros (estado);
CREATE INDEX IF NOT EXISTS idx_siniestros_ramo ON fraud_claims.siniestros (ramo);

COMMENT ON TABLE fraud_claims.siniestros IS 'Normalized insurance claims (siniestros).';

-- ------------------------------------------------------------
-- DOCUMENTOS (Claim Documents)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_claims.documentos (
    id_documento            SERIAL          PRIMARY KEY,
    id_siniestro            VARCHAR(64)     NOT NULL REFERENCES fraud_claims.siniestros(id_siniestro),
    documentos_completos    BOOLEAN,
    score_documental        NUMERIC(5, 4)   DEFAULT 0.5,
    documentos_faltantes    INTEGER         DEFAULT 0,
    documentos_inconsistentes INTEGER       DEFAULT 0,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_siniestro ON fraud_claims.documentos (id_siniestro);

COMMENT ON TABLE fraud_claims.documentos IS 'Document completeness and quality records per claim.';
