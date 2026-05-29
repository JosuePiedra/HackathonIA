-- ============================================================
-- SAFE MIGRATION — crea tablas solo si NO existen.
-- No borra ni modifica datos existentes.
-- Ejecutar: psql "$SUPABASE_DB_URL" -f 00_safe_schema.sql -v ON_ERROR_STOP=0
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. ASEGURADO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asegurado (
    id_asegurado TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    segmento TEXT,
    antiguedad_cliente INTEGER,
    ciudad TEXT,
    numero_polizas INTEGER DEFAULT 0,
    reclamos_ultimos_12_meses INTEGER DEFAULT 0,
    mora_actual BOOLEAN DEFAULT FALSE,
    score_cliente_simulado NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. POLIZA ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poliza (
    id_poliza TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_asegurado TEXT REFERENCES asegurado(id_asegurado)
        ON UPDATE CASCADE ON DELETE SET NULL,
    ramo TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    prima NUMERIC(14,2),
    suma_asegurada NUMERIC(14,2),
    deducible NUMERIC(14,2),
    canal_venta TEXT,
    ciudad TEXT,
    estado_poliza TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_poliza_fechas CHECK (
        fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin >= fecha_inicio
    )
);

-- ── 3. VEHICULO ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehiculo (
    id_vehiculo TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_asegurado TEXT REFERENCES asegurado(id_asegurado)
        ON UPDATE CASCADE ON DELETE SET NULL,
    placa_anonimizada TEXT,
    chasis_anonimizado TEXT,
    motor_anonimizado TEXT,
    marca TEXT,
    modelo TEXT,
    anio INTEGER,
    tipo_vehiculo TEXT,
    valor_referencial NUMERIC(14,2),
    uso_vehiculo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. PROVEEDOR ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedor (
    id_proveedor TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    nombre_proveedor_sintetico TEXT,
    tipo TEXT,
    ciudad TEXT,
    reclamos_asociados INTEGER DEFAULT 0,
    monto_promedio_reclamado NUMERIC(14,2),
    porcentaje_casos_observados NUMERIC(8,4),
    antiguedad INTEGER,
    en_lista_restrictiva BOOLEAN DEFAULT FALSE,
    nivel_observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. SINIESTRO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siniestro (
    id_siniestro TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_poliza TEXT REFERENCES poliza(id_poliza)
        ON UPDATE CASCADE ON DELETE SET NULL,
    id_asegurado TEXT REFERENCES asegurado(id_asegurado)
        ON UPDATE CASCADE ON DELETE SET NULL,
    id_vehiculo TEXT REFERENCES vehiculo(id_vehiculo)
        ON UPDATE CASCADE ON DELETE SET NULL,
    id_proveedor TEXT REFERENCES proveedor(id_proveedor)
        ON UPDATE CASCADE ON DELETE SET NULL,
    id_conductor TEXT,
    ramo TEXT,
    cobertura TEXT,
    estado TEXT,
    sucursal TEXT,
    ciudad TEXT,
    provincia TEXT,
    fecha_ocurrencia DATE,
    fecha_reporte DATE,
    monto_reclamado NUMERIC(14,2),
    monto_estimado NUMERIC(14,2),
    monto_pagado NUMERIC(14,2),
    descripcion TEXT,
    documentos_completos BOOLEAN DEFAULT FALSE,
    etiqueta_fraude_simulada INTEGER,
    source_file TEXT,
    mapping_confidence NUMERIC(6,4),
    data_quality_score NUMERIC(6,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_siniestro_fechas CHECK (
        fecha_ocurrencia IS NULL OR fecha_reporte IS NULL
        OR fecha_reporte >= fecha_ocurrencia
    ),
    CONSTRAINT chk_etiqueta_fraude CHECK (
        etiqueta_fraude_simulada IS NULL OR etiqueta_fraude_simulada IN (0, 1)
    )
);

-- ── 6. DOCUMENTO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documento (
    id_documento TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_siniestro TEXT REFERENCES siniestro(id_siniestro)
        ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_documento TEXT,
    entregado BOOLEAN DEFAULT FALSE,
    legible BOOLEAN DEFAULT TRUE,
    fecha_emision DATE,
    inconsistencia_detectada BOOLEAN DEFAULT FALSE,
    observacion TEXT,
    obligatorio BOOLEAN DEFAULT FALSE,
    score_documental NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. VARIABLE_RIESGO ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS variable_riesgo (
    id_siniestro TEXT PRIMARY KEY REFERENCES siniestro(id_siniestro)
        ON UPDATE CASCADE ON DELETE CASCADE,
    dias_desde_inicio_poliza INTEGER,
    dias_desde_fin_poliza INTEGER,
    dias_entre_ocurrencia_reporte INTEGER,
    ratio_monto_suma_asegurada NUMERIC(10,4),
    ratio_monto_estimado NUMERIC(10,4),
    diferencia_monto_reclamado_estimado NUMERIC(14,2),
    historial_siniestros_asegurado INTEGER DEFAULT 0,
    historial_siniestros_vehiculo INTEGER DEFAULT 0,
    historial_siniestros_conductor INTEGER DEFAULT 0,
    frecuencia_proveedor INTEGER DEFAULT 0,
    documentos_faltantes INTEGER DEFAULT 0,
    documentos_inconsistentes INTEGER DEFAULT 0,
    proveedor_recurrente BOOLEAN DEFAULT FALSE,
    monto_atipico BOOLEAN DEFAULT FALSE,
    reporte_tardio BOOLEAN DEFAULT FALSE,
    borde_vigencia BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. CATALOGO_REGLA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogo_regla (
    codigo_regla TEXT PRIMARY KEY,
    nombre_regla TEXT NOT NULL,
    descripcion TEXT,
    tipo_regla TEXT,
    clasificacion_base TEXT,
    severidad_base TEXT,
    puntaje_base NUMERIC(8,2) DEFAULT 0,
    es_critica BOOLEAN DEFAULT FALSE,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_catalogo_clasificacion CHECK (
        clasificacion_base IS NULL OR clasificacion_base IN ('Verde', 'Amarillo', 'Rojo')
    )
);

-- ── 9. ALERTA_REGLA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerta_regla (
    id_alerta TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_siniestro TEXT REFERENCES siniestro(id_siniestro)
        ON UPDATE CASCADE ON DELETE CASCADE,
    codigo_regla TEXT REFERENCES catalogo_regla(codigo_regla)
        ON UPDATE CASCADE ON DELETE SET NULL,
    nombre_regla TEXT,
    clasificacion TEXT,
    severidad TEXT,
    variable_evaluada TEXT,
    valor_detectado TEXT,
    evidencia TEXT,
    explicacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_alerta_clasificacion CHECK (
        clasificacion IS NULL OR clasificacion IN ('Verde', 'Amarillo', 'Rojo')
    )
);

-- ── 10. SCORE_SINIESTRO ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS score_siniestro (
    id_score TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_siniestro TEXT UNIQUE REFERENCES siniestro(id_siniestro)
        ON UPDATE CASCADE ON DELETE CASCADE,
    score_heuristico NUMERIC(10,4),
    prediccion_ml INTEGER,
    probabilidad_ml NUMERIC(10,6),
    score_final NUMERIC(10,4),
    nivel_riesgo TEXT,
    reglas_criticas_activadas TEXT,
    factores_principales TEXT,
    explicacion_final TEXT,
    accion_sugerida TEXT,
    mensaje_ia TEXT,
    fecha_evaluacion TIMESTAMPTZ DEFAULT NOW(),
    version_modelo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_prediccion_ml CHECK (
        prediccion_ml IS NULL OR prediccion_ml IN (0, 1)
    ),
    CONSTRAINT chk_probabilidad_ml CHECK (
        probabilidad_ml IS NULL OR probabilidad_ml BETWEEN 0 AND 1
    ),
    CONSTRAINT chk_score_heuristico CHECK (
        score_heuristico IS NULL OR score_heuristico BETWEEN 0 AND 100
    ),
    CONSTRAINT chk_score_final CHECK (
        score_final IS NULL OR score_final BETWEEN 0 AND 100
    ),
    CONSTRAINT chk_nivel_riesgo CHECK (
        nivel_riesgo IS NULL OR nivel_riesgo IN ('Verde', 'Amarillo', 'Rojo')
    )
);

-- ── 11. MAPEO_ESQUEMA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mapeo_esquema (
    id_mapping TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    source_file TEXT,
    source_column TEXT,
    canonical_column TEXT,
    detected_type TEXT,
    mapping_confidence NUMERIC(6,4),
    mapping_origin TEXT,
    validation_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÍNDICES (IF NOT EXISTS — idempotente) ────────────────────
CREATE INDEX IF NOT EXISTS idx_poliza_id_asegurado ON poliza(id_asegurado);
CREATE INDEX IF NOT EXISTS idx_vehiculo_id_asegurado ON vehiculo(id_asegurado);
CREATE INDEX IF NOT EXISTS idx_siniestro_id_poliza ON siniestro(id_poliza);
CREATE INDEX IF NOT EXISTS idx_siniestro_id_asegurado ON siniestro(id_asegurado);
CREATE INDEX IF NOT EXISTS idx_siniestro_id_vehiculo ON siniestro(id_vehiculo);
CREATE INDEX IF NOT EXISTS idx_siniestro_id_proveedor ON siniestro(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_siniestro_fecha_ocurrencia ON siniestro(fecha_ocurrencia);
CREATE INDEX IF NOT EXISTS idx_siniestro_fecha_reporte ON siniestro(fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_siniestro_ciudad ON siniestro(ciudad);
CREATE INDEX IF NOT EXISTS idx_documento_id_siniestro ON documento(id_siniestro);
CREATE INDEX IF NOT EXISTS idx_alerta_regla_id_siniestro ON alerta_regla(id_siniestro);
CREATE INDEX IF NOT EXISTS idx_alerta_regla_codigo_regla ON alerta_regla(codigo_regla);
CREATE INDEX IF NOT EXISTS idx_score_siniestro_id_siniestro ON score_siniestro(id_siniestro);
CREATE INDEX IF NOT EXISTS idx_score_siniestro_nivel_riesgo ON score_siniestro(nivel_riesgo);
CREATE INDEX IF NOT EXISTS idx_score_siniestro_score_final ON score_siniestro(score_final);

-- ── SEED: catálogo de reglas (ON CONFLICT = no borrar si ya existe) ──
INSERT INTO catalogo_regla (codigo_regla, nombre_regla, descripcion, tipo_regla, clasificacion_base, severidad_base, puntaje_base, es_critica, activa)
VALUES
('RF-01','Cobertura pérdida total por robo','Siniestro asociado a cobertura de pérdida total por robo.','Cobertura','Rojo','Alta',12,TRUE,TRUE),
('RF-02','Evidencia de falsificación o adulteración documental','Documentos con evidencia de falsificación, adulteración o inconsistencia documental fuerte.','Documental','Rojo','Crítica',18,TRUE,TRUE),
('RF-03','Coincidencia con lista restrictiva','Asegurado, beneficiario, proveedor o APS coincide con lista restrictiva.','Proveedor','Rojo','Crítica',18,TRUE,TRUE),
('RF-04','Dinámica físicamente imposible','La dinámica del accidente es físicamente imposible o incompatible con la evidencia.','Dinámica','Rojo','Crítica',15,TRUE,TRUE),
('RF-05','Siniestro extremo al borde de vigencia','Siniestro ocurrido dentro de las primeras 48 horas de vigencia o muy cerca del fin de la póliza.','Vigencia','Amarillo','Media-Alta',10,TRUE,TRUE),
('RF-06','Demora atípica en denuncia de robo','Robo reportado con demora superior a 4 días.','Temporal','Amarillo','Media-Alta',10,TRUE,TRUE),
('RF-07','Narrativa idéntica o clonada','Narrativa idéntica o altamente similar a otro reclamo.','NLP','Amarillo','Media-Alta',10,TRUE,TRUE),
('RF-TEMP-01','Reporte tardío','El siniestro fue reportado varios días después de la ocurrencia.','Temporal','Amarillo','Media',5,FALSE,TRUE),
('RF-MONTO-01','Monto cercano a suma asegurada','El monto reclamado representa una proporción alta de la suma asegurada.','Monto','Amarillo','Media',5,FALSE,TRUE),
('RF-DOC-01','Documentos incompletos','Faltan documentos obligatorios para la revisión del siniestro.','Documental','Amarillo','Media',4,FALSE,TRUE),
('RF-DOC-02','Documentos inconsistentes','Existen fechas, valores o datos inconsistentes en los documentos.','Documental','Rojo','Alta',10,FALSE,TRUE),
('RF-PROV-01','Proveedor recurrente','Proveedor asociado a una concentración elevada de siniestros.','Proveedor','Amarillo','Media',5,FALSE,TRUE),
('RF-FREC-01','Alta frecuencia de reclamos por asegurado','Asegurado con frecuencia elevada de reclamos previos.','Frecuencia','Amarillo','Media-Alta',8,FALSE,TRUE),
('RF-FREC-02','Alta frecuencia de reclamos por vehículo','Vehículo asociado a múltiples siniestros previos.','Frecuencia','Amarillo','Media',6,FALSE,TRUE),
('RF-FREC-03','Alta frecuencia de reclamos por conductor','Conductor asociado a múltiples siniestros previos.','Frecuencia','Amarillo','Media-Alta',8,FALSE,TRUE)
ON CONFLICT (codigo_regla) DO NOTHING;

-- ── VISTAS ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_rules_scored_claims AS
SELECT
    s.id_siniestro, s.id_poliza, s.id_asegurado, s.id_vehiculo,
    s.id_proveedor, s.id_conductor,
    s.ramo, s.cobertura, s.estado, s.sucursal, s.ciudad, s.provincia,
    s.fecha_ocurrencia, s.fecha_reporte,
    p.fecha_inicio AS fecha_inicio_poliza,
    p.fecha_fin    AS fecha_fin_poliza,
    s.monto_reclamado, s.monto_estimado, s.monto_pagado,
    p.suma_asegurada, p.deducible,
    s.descripcion, s.documentos_completos,
    vr.dias_desde_inicio_poliza, vr.dias_desde_fin_poliza,
    vr.dias_entre_ocurrencia_reporte,
    vr.ratio_monto_suma_asegurada, vr.ratio_monto_estimado,
    vr.historial_siniestros_asegurado, vr.historial_siniestros_vehiculo,
    vr.historial_siniestros_conductor, vr.frecuencia_proveedor,
    vr.proveedor_recurrente, vr.monto_atipico, vr.reporte_tardio, vr.borde_vigencia,
    ss.score_heuristico, ss.prediccion_ml, ss.probabilidad_ml,
    ss.score_final, ss.nivel_riesgo,
    ss.reglas_criticas_activadas, ss.factores_principales,
    ss.explicacion_final, ss.accion_sugerida, ss.mensaje_ia,
    ss.fecha_evaluacion, ss.version_modelo,
    s.etiqueta_fraude_simulada, s.source_file
FROM siniestro s
LEFT JOIN poliza p         ON s.id_poliza    = p.id_poliza
LEFT JOIN variable_riesgo vr ON s.id_siniestro = vr.id_siniestro
LEFT JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro;

-- Vista que usa el dashboard de sentinel
CREATE OR REPLACE VIEW v_siniestro_completo AS
SELECT * FROM vw_rules_scored_claims;

-- ── RLS (solo habilita, no crea políticas — idempotente) ─────
DO $$
BEGIN
    ALTER TABLE asegurado      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE poliza         ENABLE ROW LEVEL SECURITY;
    ALTER TABLE vehiculo       ENABLE ROW LEVEL SECURITY;
    ALTER TABLE proveedor      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE siniestro      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE documento      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE variable_riesgo ENABLE ROW LEVEL SECURITY;
    ALTER TABLE catalogo_regla ENABLE ROW LEVEL SECURITY;
    ALTER TABLE alerta_regla   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE score_siniestro ENABLE ROW LEVEL SECURITY;
    ALTER TABLE mapeo_esquema  ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS ya habilitado o sin permisos: %', SQLERRM;
END $$;
