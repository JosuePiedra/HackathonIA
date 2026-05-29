-- ============================================================
-- fraudia-claims | 01_create_staging_tables.sql
-- Raw staging table for uploaded claim files.
-- Each row contains the raw JSON payload of one uploaded record.
-- ============================================================

SET search_path TO fraud_claims, public;

CREATE TABLE IF NOT EXISTS fraud_claims.stg_uploaded_claims (
    row_id              SERIAL          PRIMARY KEY,
    source_file         VARCHAR(512)    NOT NULL,
    raw_payload         JSONB           NOT NULL,
    ingestion_timestamp TIMESTAMP       NOT NULL DEFAULT NOW(),
    ingestion_batch_id  VARCHAR(64),        -- Optional: batch identifier for the upload
    row_hash            VARCHAR(64)         -- SHA-256 hash of raw_payload for deduplication
);

CREATE INDEX IF NOT EXISTS idx_stg_source_file
    ON fraud_claims.stg_uploaded_claims (source_file);

CREATE INDEX IF NOT EXISTS idx_stg_ingestion_ts
    ON fraud_claims.stg_uploaded_claims (ingestion_timestamp);

CREATE INDEX IF NOT EXISTS idx_stg_payload_gin
    ON fraud_claims.stg_uploaded_claims USING GIN (raw_payload);

COMMENT ON TABLE fraud_claims.stg_uploaded_claims IS
    'Staging table for raw uploaded insurance claim records. Each row stores a raw JSON payload.';

COMMENT ON COLUMN fraud_claims.stg_uploaded_claims.row_id IS 'Auto-incremented surrogate primary key.';
COMMENT ON COLUMN fraud_claims.stg_uploaded_claims.source_file IS 'Name of the file from which this record was ingested.';
COMMENT ON COLUMN fraud_claims.stg_uploaded_claims.raw_payload IS 'Full raw record as JSONB for flexible schema storage.';
COMMENT ON COLUMN fraud_claims.stg_uploaded_claims.ingestion_timestamp IS 'Timestamp of record ingestion into staging.';
COMMENT ON COLUMN fraud_claims.stg_uploaded_claims.ingestion_batch_id IS 'Optional batch/job identifier.';
COMMENT ON COLUMN fraud_claims.stg_uploaded_claims.row_hash IS 'SHA-256 hash of raw_payload for duplicate detection.';
