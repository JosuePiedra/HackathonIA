"""
Persona 1 main pipeline: ingestion -> mapping -> normalization -> features -> rules -> export.

This module orchestrates the complete ETL + feature engineering + rule scoring
pipeline for the fraudia-claims insurance fraud detection system.
"""

import os
import sys
import json

import pandas as pd

# Allow running as script from project root
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from dotenv import load_dotenv

load_dotenv(os.path.join(_PROJECT_ROOT, "fraudia-claims", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv()


# ---- Absolute base path for output directories ----
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PROCESSED_DIR = os.path.join(_BASE_DIR, "data", "processed")
STAGING_DIR = os.path.join(_BASE_DIR, "data", "staging")


def run_pipeline(input_paths: list) -> str:
    """
    Run the complete Persona 1 data pipeline.

    Steps:
    1. Load uploaded files.
    2. For each file: build schema profile -> LLM mapping -> validate -> apply mapping.
    3. Concatenate all canonical claims.
    4. Save canonical_claims.csv to data/processed/.
    5. Run all normalization steps.
    6. Build features.
    7. Save features_claims.csv to data/processed/.
    8. Apply fraud rules.
    9. Export rules_scored_claims.csv to data/processed/.
    10. Export data dictionary.

    Args:
        input_paths: List of absolute paths to input files.

    Returns:
        Absolute path to the final rules_scored_claims.csv output file.
    """
    from fraudia_claims.src.ingestion.read_upload import load_uploaded_files
    from fraudia_claims.src.ingestion.profile_schema import build_schema_profile, save_schema_profile
    from fraudia_claims.src.mapping.llm_schema_mapper import map_schema_with_llm, save_schema_mapping
    from fraudia_claims.src.mapping.mapping_validator import validate_full
    from fraudia_claims.src.mapping.apply_mapping import apply_full_mapping, export_canonical_claims
    from fraudia_claims.src.normalization.normalize_claims import normalize_claims
    from fraudia_claims.src.normalization.normalize_policies import normalize_policies
    from fraudia_claims.src.normalization.normalize_customers import normalize_customers
    from fraudia_claims.src.normalization.normalize_vehicles import normalize_vehicles
    from fraudia_claims.src.normalization.normalize_providers import normalize_providers
    from fraudia_claims.src.normalization.normalize_documents import normalize_documents
    from fraudia_claims.src.features.build_features import build_features
    from fraudia_claims.src.rules.fraud_rules import apply_fraud_rules
    from fraudia_claims.src.export.export_rules_scored_claims import (
        export_rules_scored_claims,
        export_data_dictionary,
    )

    _run_pipeline_internal(
        input_paths=input_paths,
        load_uploaded_files=load_uploaded_files,
        build_schema_profile=build_schema_profile,
        save_schema_profile=save_schema_profile,
        map_schema_with_llm=map_schema_with_llm,
        save_schema_mapping=save_schema_mapping,
        validate_full=validate_full,
        apply_full_mapping=apply_full_mapping,
        export_canonical_claims=export_canonical_claims,
        normalize_claims=normalize_claims,
        normalize_policies=normalize_policies,
        normalize_customers=normalize_customers,
        normalize_vehicles=normalize_vehicles,
        normalize_providers=normalize_providers,
        normalize_documents=normalize_documents,
        build_features=build_features,
        apply_fraud_rules=apply_fraud_rules,
        export_rules_scored_claims=export_rules_scored_claims,
        export_data_dictionary=export_data_dictionary,
    )

    return os.path.join(PROCESSED_DIR, "rules_scored_claims.csv")


def _run_pipeline_internal(
    input_paths,
    load_uploaded_files,
    build_schema_profile,
    save_schema_profile,
    map_schema_with_llm,
    save_schema_mapping,
    validate_full,
    apply_full_mapping,
    export_canonical_claims,
    normalize_claims,
    normalize_policies,
    normalize_customers,
    normalize_vehicles,
    normalize_providers,
    normalize_documents,
    build_features,
    apply_fraud_rules,
    export_rules_scored_claims,
    export_data_dictionary,
):
    """Internal pipeline implementation with injected dependencies."""
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(STAGING_DIR, exist_ok=True)

    print("=" * 60)
    print("FRAUDIA-CLAIMS | Persona 1 Pipeline")
    print("=" * 60)

    # ---- Step 1: Load files ----
    print("\n[STEP 1] Loading input files...")
    files = load_uploaded_files(input_paths)
    if not files:
        raise RuntimeError(f"No files could be loaded from paths: {input_paths}")
    print(f"[STEP 1] Loaded {len(files)} file(s).")

    # ---- Steps 2-3: Map each file and collect canonical DataFrames ----
    canonical_dfs = []

    for filename, df in files.items():
        print(f"\n[STEP 2] Processing file: {filename}")

        # 2a. Build schema profile
        profile = build_schema_profile(df, filename)
        profile_path = os.path.join(STAGING_DIR, f"{filename}_profile.json")
        save_schema_profile(profile, profile_path)

        # 2b. LLM schema mapping
        print(f"[STEP 2] Calling LLM for schema mapping...")
        mapping = map_schema_with_llm(profile)
        mapping_path = os.path.join(STAGING_DIR, f"{filename}_mapping.json")
        save_schema_mapping(mapping, mapping_path)

        # 2c. Validate mapping
        validation = validate_full(mapping, df)
        if not validation["is_valid"]:
            print(f"[WARNING] Mapping validation issues for '{filename}':")
            for issue in validation["issues"]:
                print(f"  - {issue}")
        if validation["warnings"]:
            print(f"[INFO] Mapping warnings for '{filename}':")
            for warn in validation["warnings"]:
                print(f"  - {warn}")

        # 2d. Apply mapping
        canonical_df = apply_full_mapping(df, mapping, source_file=filename)
        canonical_dfs.append(canonical_df)
        print(f"[STEP 2] '{filename}' mapped: {len(canonical_df)} rows, {len(canonical_df.columns)} columns.")

    # ---- Step 3: Concatenate all canonical claims ----
    print("\n[STEP 3] Concatenating canonical claims...")
    combined_df = pd.concat(canonical_dfs, ignore_index=True)
    print(f"[STEP 3] Total canonical claims: {len(combined_df)} rows.")

    canonical_path = os.path.join(PROCESSED_DIR, "canonical_claims.csv")
    export_canonical_claims(combined_df, canonical_path)

    # ---- Step 4: Normalize tables ----
    print("\n[STEP 4] Normalizing entity tables...")
    siniestros_df = normalize_claims(combined_df)
    polizas_df = normalize_policies(combined_df)
    customers_df = normalize_customers(combined_df)
    vehicles_df = normalize_vehicles(combined_df)
    providers_df = normalize_providers(combined_df)
    documents_df = normalize_documents(combined_df)

    # Save normalized tables
    siniestros_df.to_csv(os.path.join(PROCESSED_DIR, "normalized_siniestros.csv"), index=False)
    polizas_df.to_csv(os.path.join(PROCESSED_DIR, "normalized_polizas.csv"), index=False)
    customers_df.to_csv(os.path.join(PROCESSED_DIR, "normalized_asegurados.csv"), index=False)
    vehicles_df.to_csv(os.path.join(PROCESSED_DIR, "normalized_vehiculos.csv"), index=False)
    providers_df.to_csv(os.path.join(PROCESSED_DIR, "normalized_proveedores.csv"), index=False)
    documents_df.to_csv(os.path.join(PROCESSED_DIR, "normalized_documentos.csv"), index=False)
    print("[STEP 4] Normalized tables saved.")

    # ---- Step 5: Enrich combined_df with normalized table data ----
    print("\n[STEP 5] Enriching with normalized data...")
    enriched_df = combined_df.copy()

    # Merge provider stats (en_lista_restrictiva, nivel_observacion)
    if not providers_df.empty and "id_proveedor" in providers_df.columns:
        provider_merge_cols = ["id_proveedor", "en_lista_restrictiva", "reclamos_asociados", "monto_promedio_reclamado", "nivel_observacion"]
        provider_merge_cols = [c for c in provider_merge_cols if c in providers_df.columns]
        enriched_df = enriched_df.merge(
            providers_df[provider_merge_cols],
            on="id_proveedor",
            how="left",
            suffixes=("", "_prov"),
        )

    # Merge document stats
    if not documents_df.empty and "id_siniestro" in documents_df.columns:
        doc_merge_cols = ["id_siniestro", "score_documental", "documentos_faltantes", "documentos_inconsistentes"]
        doc_merge_cols = [c for c in doc_merge_cols if c in documents_df.columns]
        enriched_df = enriched_df.merge(
            documents_df[doc_merge_cols],
            on="id_siniestro",
            how="left",
            suffixes=("", "_doc"),
        )

    # Merge customer claim frequency
    if not customers_df.empty and "id_asegurado" in customers_df.columns and "reclamos_ultimos_12_meses" in customers_df.columns:
        enriched_df = enriched_df.merge(
            customers_df[["id_asegurado", "reclamos_ultimos_12_meses"]],
            on="id_asegurado",
            how="left",
            suffixes=("", "_cust"),
        )

    print(f"[STEP 5] Enriched dataset: {len(enriched_df)} rows, {len(enriched_df.columns)} columns.")

    # ---- Step 6: Build features ----
    print("\n[STEP 6] Building features...")
    features_df = build_features(enriched_df)

    features_path = os.path.join(PROCESSED_DIR, "features_claims.csv")
    features_df.to_csv(features_path, index=False, encoding="utf-8")
    print(f"[STEP 6] Features saved to: {features_path}")

    # ---- Step 7: Apply fraud rules ----
    print("\n[STEP 7] Applying fraud rules...")
    scored_df = apply_fraud_rules(features_df)

    # ---- Step 8: Export final output ----
    print("\n[STEP 8] Exporting results...")
    output_path = os.path.join(PROCESSED_DIR, "rules_scored_claims.csv")
    export_rules_scored_claims(scored_df, output_path)

    # Export data dictionary
    dict_path = os.path.join(PROCESSED_DIR, "data_dictionary.json")
    export_data_dictionary([], dict_path)

    print("\n" + "=" * 60)
    print("Pipeline completed successfully!")
    print(f"Output: {output_path}")
    print("=" * 60)

    return output_path


if __name__ == "__main__":
    # Determine input paths from CLI args or fall back to synthetic data
    if len(sys.argv) > 1:
        paths = sys.argv[1:]
    else:
        synthetic_path = os.path.join(_BASE_DIR, "data", "synthetic", "claims_sinteticos.csv")
        if not os.path.isfile(synthetic_path):
            print(f"[INFO] Synthetic data not found at {synthetic_path}")
            print("[INFO] Run 'python data/synthetic/generate_synthetic_data.py' first.")
            sys.exit(1)
        paths = [synthetic_path]
        print(f"[INFO] No input paths provided; using synthetic data: {synthetic_path}")

    # Use direct imports for __main__ execution
    sys.path.insert(0, os.path.join(_BASE_DIR, ".."))

    from src.ingestion.read_upload import load_uploaded_files
    from src.ingestion.profile_schema import build_schema_profile, save_schema_profile
    from src.mapping.llm_schema_mapper import map_schema_with_llm, save_schema_mapping
    from src.mapping.mapping_validator import validate_full
    from src.mapping.apply_mapping import apply_full_mapping, export_canonical_claims
    from src.normalization.normalize_claims import normalize_claims
    from src.normalization.normalize_policies import normalize_policies
    from src.normalization.normalize_customers import normalize_customers
    from src.normalization.normalize_vehicles import normalize_vehicles
    from src.normalization.normalize_providers import normalize_providers
    from src.normalization.normalize_documents import normalize_documents
    from src.features.build_features import build_features
    from src.rules.fraud_rules import apply_fraud_rules
    from src.export.export_rules_scored_claims import export_rules_scored_claims, export_data_dictionary

    output = _run_pipeline_internal(
        input_paths=paths,
        load_uploaded_files=load_uploaded_files,
        build_schema_profile=build_schema_profile,
        save_schema_profile=save_schema_profile,
        map_schema_with_llm=map_schema_with_llm,
        save_schema_mapping=save_schema_mapping,
        validate_full=validate_full,
        apply_full_mapping=apply_full_mapping,
        export_canonical_claims=export_canonical_claims,
        normalize_claims=normalize_claims,
        normalize_policies=normalize_policies,
        normalize_customers=normalize_customers,
        normalize_vehicles=normalize_vehicles,
        normalize_providers=normalize_providers,
        normalize_documents=normalize_documents,
        build_features=build_features,
        apply_fraud_rules=apply_fraud_rules,
        export_rules_scored_claims=export_rules_scored_claims,
        export_data_dictionary=export_data_dictionary,
    )
    print(f"\nDone. Output: {output}")
