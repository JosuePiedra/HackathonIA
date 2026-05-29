-- ============================================================
-- fraudia-claims | 05_insert_catalog_rules.sql
-- Create and populate the fraud rules catalog.
-- ============================================================

SET search_path TO fraud_claims, public;

CREATE TABLE IF NOT EXISTS fraud_claims.catalogo_reglas (
    codigo_regla    VARCHAR(32)     PRIMARY KEY,
    nombre          VARCHAR(256)    NOT NULL,
    descripcion     TEXT            NOT NULL,
    puntos          INTEGER         NOT NULL CHECK (puntos > 0),
    tipo            VARCHAR(64)     NOT NULL,
    severidad       VARCHAR(32)     NOT NULL DEFAULT 'media',  -- baja, media, alta
    activa          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fraud_claims.catalogo_reglas IS
    'Catalog of fraud detection rules with their names, descriptions, and risk points.';

-- Truncate before re-inserting to allow idempotent runs
TRUNCATE fraud_claims.catalogo_reglas;

INSERT INTO fraud_claims.catalogo_reglas
    (codigo_regla, nombre, descripcion, puntos, tipo, severidad)
VALUES
    (
        'RF-01',
        'Cobertura Pérdida Total por Robo',
        'Reclamo de pérdida total o robo de vehículo. Cobertura de alto valor con historial elevado de fraude documentado. Requiere validación exhaustiva de denuncia policial, acta notarial y consistencia de narrativa.',
        10, 'Documental', 'alta'
    ),
    (
        'RF-02',
        'Falsificación o adulteración documental',
        'Indicios de documentos falsificados o adulterados: fechas inconsistentes, sellos irregulares, firmas no coincidentes o documentos duplicados con datos distintos. Activa investigación inmediata con SIU.',
        10, 'Documental', 'alta'
    ),
    (
        'RF-03',
        'Coincidencia con lista restrictiva',
        'El asegurado, conductor, vehículo o proveedor aparece en la lista interna de personas o entidades bajo observación por historial de fraude previo o sanciones regulatorias.',
        10, 'Lista Restrictiva', 'alta'
    ),
    (
        'RF-04',
        'Dinámica del accidente físicamente imposible',
        'La narrativa del siniestro describe una dinámica físicamente imposible o altamente improbable: ángulos de impacto inexplicables, daños inconsistentes con la velocidad declarada, o contradicciones físicas evidentes.',
        10, 'Narrativa', 'alta'
    ),
    (
        'RF-05',
        'Siniestro extremo al borde de vigencia',
        'El siniestro ocurre dentro de los primeros 30 días de inicio de vigencia o en los últimos 30 días antes del vencimiento de la póliza. Patrón estadísticamente asociado a siniestros pre-planeados.',
        8, 'Temporal', 'alta'
    ),
    (
        'RF-06',
        'Demora atípica en denuncia de robo',
        'Para coberturas de robo, el tiempo entre la ocurrencia y la denuncia supera los 4 días hábiles. Demoras atípicas reducen la trazabilidad del evento y son inconsistentes con comportamiento legítimo de robo.',
        8, 'Temporal', 'alta'
    ),
    (
        'RF-07',
        'Narrativa idéntica o clonada',
        'La descripción del siniestro es idéntica o casi idéntica a otra denuncia previa del mismo asegurado, vehículo o grupo de personas. Posible reutilización de narrativas fraudulentas.',
        8, 'Narrativa', 'alta'
    ),
    (
        'RF-TEMP-01',
        'Reporte tardío',
        'El siniestro fue reportado más de 7 días después de ocurrido. El retraso en la notificación puede indicar preparación del expediente o inconsistencias en la línea de tiempo declarada.',
        5, 'Temporal', 'media'
    ),
    (
        'RF-MONTO-01',
        'Monto reclamado atípico',
        'El monto reclamado supera el 90% de la suma asegurada de la póliza. Reclamos que maximizan la cobertura disponible son estadísticamente más frecuentes en fraudes de pérdida total inducida.',
        5, 'Financiero', 'media'
    ),
    (
        'RF-DOC-01',
        'Documentos incompletos',
        'El expediente no cuenta con todos los documentos requeridos según el tipo de cobertura y ramo. La documentación incompleta puede indicar intento de ocultar inconsistencias o falta de evidencia real del siniestro.',
        4, 'Documental', 'baja'
    ),
    (
        'RF-DOC-02',
        'Documentos inconsistentes',
        'Existen contradicciones entre documentos del expediente: fechas no coinciden, montos difieren entre presupuesto y factura, o datos del vehículo son discordantes entre diferentes documentos.',
        10, 'Documental', 'alta'
    ),
    (
        'RF-PROV-01',
        'Proveedor recurrente',
        'El taller, clínica u otro proveedor de servicios aparece asociado a más de 10 siniestros en el período analizado. Alta recurrencia puede indicar connivencia en la fabricación o exageración de siniestros.',
        5, 'Proveedor', 'media'
    ),
    (
        'RF-PROV-02',
        'Proveedor en lista restrictiva',
        'El proveedor de servicios está incluido en la lista interna de proveedores bajo observación por irregularidades previas, sanciones o vinculación con reclamos fraudulentos confirmados.',
        10, 'Lista Restrictiva', 'alta'
    ),
    (
        'RF-FREC-01',
        'Alta frecuencia asegurado',
        'El asegurado tiene 3 o más siniestros activos o cerrados en el período analizado. Alta frecuencia de siniestros por asegurado es un indicador primario de fraude por oportunidad o sistemático.',
        8, 'Frecuencia', 'alta'
    ),
    (
        'RF-FREC-02',
        'Alta frecuencia vehículo',
        'El vehículo asegurado está asociado a 3 o más siniestros en el período. Puede indicar fraude por uso intensivo del vehículo para generar reclamos o manipulación del historial del bien asegurado.',
        6, 'Frecuencia', 'media'
    ),
    (
        'RF-FREC-03',
        'Alta frecuencia conductor',
        'El conductor involucrado en el siniestro aparece en 3 o más siniestros distintos en el período. Patrón de conductores recurrentes puede indicar participación activa en esquemas de fraude organizado.',
        8, 'Frecuencia', 'alta'
    ),
    (
        'RF-DIN-01',
        'Siniestro severo sin tercero identificado',
        'El siniestro reporta daños severos pero no existe identificación de tercero involucrado. Accidentes graves sin datos del tercero pueden ser indicativos de siniestros simulados o auto-infligidos.',
        6, 'Dinámica', 'media'
    );

-- Verify insert
SELECT COUNT(*) AS total_reglas FROM fraud_claims.catalogo_reglas;
