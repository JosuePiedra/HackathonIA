-- ============================================================
-- fraudia-claims | 00_create_schema.sql
-- Create the main schema for the fraud detection system.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS fraud_claims;

-- Set default search path for subsequent scripts
SET search_path TO fraud_claims, public;

COMMENT ON SCHEMA fraud_claims IS
    'Schema for fraudia-claims insurance fraud detection system (Persona 1).';
