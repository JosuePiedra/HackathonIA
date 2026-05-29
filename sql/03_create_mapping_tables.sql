-- ============================================================
-- fraudia-claims | 03_create_mapping_tables.sql
-- Schema mappings table: tracks LLM-generated column mappings
-- from source files to canonical schema.
-- ============================================================

SET search_path TO fraud_claims, public;

CREATE TABLE IF NOT EXISTS fraud_claims.schema_mappings (
    id_mapping          SERIAL          PRIMARY KEY,
    source_file         VARCHAR(512)    NOT NULL,
    source_column       VARCHAR(256)    NOT NULL,
    canonical_column    VARCHAR(256)    NOT NULL,
    detected_type       VARCHAR(64),            -- string, numeric, date, boolean
    mapping_confidence  NUMERIC(5, 4),          -- LLM confidence for this specific mapping
    mapping_origin      VARCHAR(64)     DEFAULT 'llm',  -- 'llm', 'manual', 'fallback'
    validation_status   VARCHAR(32)     DEFAULT 'pending',  -- pending, valid, invalid, warning
    validation_notes    TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schema_mappings_file
    ON fraud_claims.schema_mappings (source_file);

CREATE INDEX IF NOT EXISTS idx_schema_mappings_canonical
    ON fraud_claims.schema_mappings (canonical_column);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_mappings_unique
    ON fraud_claims.schema_mappings (source_file, source_column);

COMMENT ON TABLE fraud_claims.schema_mappings IS
    'Records of LLM-generated and manual column mappings from source files to canonical schema.';

COMMENT ON COLUMN fraud_claims.schema_mappings.id_mapping IS 'Auto-incremented surrogate key.';
COMMENT ON COLUMN fraud_claims.schema_mappings.source_file IS 'Name of the source file.';
COMMENT ON COLUMN fraud_claims.schema_mappings.source_column IS 'Original column name in the source file.';
COMMENT ON COLUMN fraud_claims.schema_mappings.canonical_column IS 'Target canonical field name.';
COMMENT ON COLUMN fraud_claims.schema_mappings.detected_type IS 'Detected data type of the source column.';
COMMENT ON COLUMN fraud_claims.schema_mappings.mapping_confidence IS 'Confidence score (0-1) for this mapping.';
COMMENT ON COLUMN fraud_claims.schema_mappings.mapping_origin IS 'Origin of the mapping: llm, manual, or fallback.';
COMMENT ON COLUMN fraud_claims.schema_mappings.validation_status IS 'Validation result: pending, valid, invalid, warning.';
