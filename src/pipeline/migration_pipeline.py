"""
Migration pipeline: CSV → canonical → Supabase → features → rules → export.

Orchestrates the full Persona 1 flow with Supabase persistence.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd


_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW_DIR = os.path.join(_BASE_DIR, "data", "raw")
STAGING_DIR = os.path.join(_BASE_DIR, "data", "staging")
PROCESSED_DIR = os.path.join(_BASE_DIR, "data", "processed")


def run_migration(
    file_paths: List[str],
    dataset_name: str,
    source_type: str,
    use_llm_mapping: bool,
    persist_to_supabase: bool,
    fraud_label_column: Optional[str],
    manual_mapping_json: Optional[dict],
    generate_synthetic_missing_fields: bool,
    notes: Optional[str],
) -> Dict[str, Any]:
    """
    Execute the full CSV → Supabase migration pipeline.

    Returns a job report dict.
    """
    for d in (RAW_DIR, STAGING_DIR, PROCESSED_DIR):
        os.makedirs(d, exist_ok=True)

    job_id = str(uuid.uuid4())
    started_at = datetime.utcnow().isoformat()

    from ..ingestion.read_upload import load_uploaded_files
    from ..ingestion.profile_schema import build_schema_profile, save_schema_profile
    from ..mapping.mapping_validator import validate_full
    from ..mapping.apply_mapping import apply_full_mapping, export_canonical_claims
    from ..normalization.normalize_claims import normalize_claims
    from ..normalization.normalize_policies import normalize_policies
    from ..normalization.normalize_customers import normalize_customers
    from ..normalization.normalize_vehicles import normalize_vehicles
    from ..normalization.normalize_providers import normalize_providers
    from ..normalization.normalize_documents import normalize_documents
    from ..features.build_features import build_features
    from ..rules.fraud_rules import apply_fraud_rules
    from ..export.export_rules_scored_claims import export_rules_scored_claims

    enable_llm = use_llm_mapping and os.environ.get("ENABLE_LLM_MAPPING", "true").lower() == "true"
    confidence_threshold = float(os.environ.get("DEFAULT_MAPPING_CONFIDENCE_THRESHOLD", "0.75"))

    if enable_llm:
        from ..mapping.gemini_schema_mapper import map_schema_with_gemini as _map_fn, save_schema_mapping
    else:
        from ..mapping.llm_schema_mapper import map_schema_with_llm as _map_fn, save_schema_mapping  # type: ignore

    files = load_uploaded_files(file_paths)
    if not files:
        raise RuntimeError(f"No files could be loaded from: {file_paths}")

    rows_received = 0
    rows_inserted = 0
    rows_with_warnings = 0
    rows_rejected = 0
    mapping_confidences: List[float] = []
    files_with_warning = 0
    canonical_dfs: List[pd.DataFrame] = []
    all_mappings: List[dict] = []

    for filename, df in files.items():
        rows_received += len(df)
        profile = build_schema_profile(df, filename)
        save_schema_profile(profile, os.path.join(STAGING_DIR, f"{filename}_profile.json"))

        if manual_mapping_json:
            mapping = {
                "detected_domain": "claims",
                "mapping_confidence": 1.0,
                "column_mapping": manual_mapping_json,
                "missing_required_fields": [],
                "unmapped_columns": [],
                "recommendations": ["Manual mapping provided."],
            }
        else:
            mapping = _map_fn(profile)

        save_schema_mapping(mapping, os.path.join(STAGING_DIR, f"{filename}_mapping.json"))
        all_mappings.append({"file": filename, "mapping": mapping, "profile": profile})

        conf = float(mapping.get("mapping_confidence", 0.0))
        mapping_confidences.append(conf)

        val_status = "valid"
        validation = validate_full(mapping, df)
        if conf < confidence_threshold:
            files_with_warning += 1
            val_status = "warning"
        if not validation["is_valid"]:
            rows_with_warnings += len(df)

        canonical_df = apply_full_mapping(df, mapping, source_file=filename)

        if fraud_label_column and fraud_label_column in df.columns:
            canonical_df["etiqueta_fraude_simulada"] = pd.to_numeric(
                df[fraud_label_column], errors="coerce"
            ).fillna(0).astype(int)

        if generate_synthetic_missing_fields and source_type in ("synthetic", "demo"):
            canonical_df = _fill_synthetic_fields(canonical_df)

        canonical_dfs.append(canonical_df)

    combined_df = pd.concat(canonical_dfs, ignore_index=True)

    canonical_path = os.path.join(PROCESSED_DIR, "canonical_claims.csv")
    export_canonical_claims(combined_df, canonical_path)

    siniestros_df = normalize_claims(combined_df)
    polizas_df = normalize_policies(combined_df)
    customers_df = normalize_customers(combined_df)
    vehicles_df = normalize_vehicles(combined_df)
    providers_df = normalize_providers(combined_df)
    documents_df = normalize_documents(combined_df)

    enriched_df = _enrich(combined_df, providers_df, documents_df, customers_df)

    features_df = build_features(enriched_df)
    scored_df = apply_fraud_rules(features_df)

    scored_df = _add_score_fields(scored_df)

    if persist_to_supabase:
        from ..persistence.upsert_service import persist_all

        first_mapping = all_mappings[0] if all_mappings else {}
        col_mapping = first_mapping.get("mapping", {}).get("column_mapping", {})
        col_profiles = first_mapping.get("profile", {}).get("columns", [])
        conf = first_mapping.get("mapping", {}).get("mapping_confidence", 0.0)
        origin = "manual" if manual_mapping_json else ("llm" if enable_llm else "system")

        try:
            upsert_results = persist_all(
                canonical_df=combined_df,
                features_df=features_df,
                scored_df=scored_df,
                source_type=source_type,
                source_file=dataset_name,
                column_mapping=col_mapping,
                column_profiles=col_profiles,
                mapping_confidence=conf,
                mapping_origin=origin,
                validation_status="valid" if files_with_warning == 0 else "warning",
            )
            rows_inserted = upsert_results.get("siniestro", 0)
            print(f"[SUPABASE] Upsert complete: {upsert_results}")
        except Exception as exc:
            print(f"[ERROR] Supabase upsert failed: {exc}")
            rows_rejected = rows_received

    output_path = os.path.join(PROCESSED_DIR, "rules_scored_claims.csv")
    export_rules_scored_claims(scored_df, output_path)

    nivel_counts = scored_df["nivel_riesgo"].value_counts().to_dict() if "nivel_riesgo" in scored_df.columns else {}
    alerts_total = int(scored_df["reglas_activadas"].apply(
        lambda x: len([r for r in str(x).split(",") if r.strip()]) if x else 0
    ).sum()) if "reglas_activadas" in scored_df.columns else 0

    avg_conf = sum(mapping_confidences) / len(mapping_confidences) if mapping_confidences else 0.0

    return {
        "job_id": job_id,
        "status": "completed",
        "started_at": started_at,
        "finished_at": datetime.utcnow().isoformat(),
        "dataset_name": dataset_name,
        "source_type": source_type,
        "files_processed": len(files),
        "rows_received": rows_received,
        "rows_inserted": rows_inserted,
        "rows_with_warnings": rows_with_warnings,
        "rows_rejected": rows_rejected,
        "mapping_summary": {
            "average_mapping_confidence": round(avg_conf, 4),
            "files_with_warning": files_with_warning,
        },
        "data_quality_summary": {
            "average_data_quality_score": _avg_dq(combined_df),
            "missing_policy_dates": int(combined_df["fecha_inicio_poliza"].isna().sum()) if "fecha_inicio_poliza" in combined_df.columns else 0,
            "missing_provider": int(combined_df["id_proveedor"].isna().sum()) if "id_proveedor" in combined_df.columns else 0,
            "invalid_dates": 0,
        },
        "rules_summary": {
            "alerts_generated": alerts_total,
            "critical_red_alerts": nivel_counts.get("Rojo", 0),
            "yellow_alerts": nivel_counts.get("Amarillo", 0),
            "green_or_no_alert": nivel_counts.get("Verde", 0),
        },
        "outputs": {
            "canonical_claims": canonical_path,
            "rules_scored_claims": output_path,
        },
        "notes": notes,
    }


def _enrich(combined_df, providers_df, documents_df, customers_df) -> pd.DataFrame:
    enriched = combined_df.copy()
    if not providers_df.empty and "id_proveedor" in providers_df.columns:
        pcols = [c for c in ["id_proveedor", "en_lista_restrictiva", "reclamos_asociados",
                              "monto_promedio_reclamado", "nivel_observacion"]
                 if c in providers_df.columns]
        enriched = enriched.merge(providers_df[pcols], on="id_proveedor", how="left", suffixes=("", "_prov"))
    if not documents_df.empty and "id_siniestro" in documents_df.columns:
        dcols = [c for c in ["id_siniestro", "score_documental", "documentos_faltantes",
                              "documentos_inconsistentes"] if c in documents_df.columns]
        enriched = enriched.merge(documents_df[dcols], on="id_siniestro", how="left", suffixes=("", "_doc"))
    if not customers_df.empty and "id_asegurado" in customers_df.columns and "reclamos_ultimos_12_meses" in customers_df.columns:
        enriched = enriched.merge(customers_df[["id_asegurado", "reclamos_ultimos_12_meses"]],
                                  on="id_asegurado", how="left", suffixes=("", "_cust"))
    return enriched


def _fill_synthetic_fields(df: pd.DataFrame) -> pd.DataFrame:
    import random
    from datetime import timedelta, date

    df = df.copy()
    today = date.today()

    if "id_siniestro" not in df.columns or df["id_siniestro"].isna().all():
        df["id_siniestro"] = [f"SIN-{str(i+1).zfill(6)}" for i in range(len(df))]

    if "fecha_ocurrencia" not in df.columns or df["fecha_ocurrencia"].isna().all():
        df["fecha_ocurrencia"] = [
            (today - timedelta(days=random.randint(10, 365))).isoformat() for _ in range(len(df))
        ]
    if "fecha_reporte" not in df.columns or df["fecha_reporte"].isna().all():
        df["fecha_reporte"] = df["fecha_ocurrencia"]

    return df


def _add_score_fields(scored_df: pd.DataFrame) -> pd.DataFrame:
    df = scored_df.copy()
    if "score_reglas" in df.columns and "score_heuristico" not in df.columns:
        df["score_heuristico"] = df["score_reglas"]
    if "nivel_reglas" in df.columns and "nivel_riesgo" not in df.columns:
        df["nivel_riesgo"] = df["nivel_reglas"]

    if "accion_sugerida" not in df.columns:
        def _accion(row):
            score = row.get("score_heuristico", 0) or 0
            reg = str(row.get("reglas_criticas_activadas", "") or "")
            if reg.strip() and any(c in reg for c in ("RF-02", "RF-03", "RF-04")):
                return "Escalar a revisión antifraude especializada."
            if score > 75 or (reg.strip()):
                return "Escalar a revisión antifraude especializada."
            if score > 40:
                return "Escalar a revisión documental."
            return "Continuar flujo normal."
        df["accion_sugerida"] = df.apply(_accion, axis=1)

    if "reglas_criticas_activadas" not in df.columns:
        df["reglas_criticas_activadas"] = ""

    return df


def _avg_dq(df: pd.DataFrame) -> float:
    if "data_quality_score" in df.columns:
        vals = pd.to_numeric(df["data_quality_score"], errors="coerce").dropna()
        return round(float(vals.mean()), 4) if len(vals) else 0.0
    return 0.0
