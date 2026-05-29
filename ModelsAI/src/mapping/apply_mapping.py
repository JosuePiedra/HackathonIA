"""
Apply schema mapping to a source DataFrame, producing a canonical-schema DataFrame.
"""

import os
import uuid
from typing import Dict

import numpy as np
import pandas as pd

from .canonical_schema import (
    CANONICAL_FIELDS,
    DATE_FIELDS,
    NUMERIC_FIELDS,
    BOOLEAN_FIELDS,
)


def apply_column_mapping(df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    """
    Rename source columns to canonical names according to the mapping.

    Args:
        df: Source DataFrame.
        mapping: Mapping dict with 'column_mapping' key (source -> canonical).

    Returns:
        DataFrame with columns renamed to canonical names.
    """
    column_mapping: Dict[str, str] = mapping.get("column_mapping", {})
    df = df.copy()

    # Only rename columns that exist in the DataFrame
    rename_map = {src: can for src, can in column_mapping.items() if src in df.columns}
    df = df.rename(columns=rename_map)

    return df


def normalize_dates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Coerce DATE_FIELDS columns to ISO-format strings (YYYY-MM-DD).
    Missing or un-parseable values are set to NaN.

    Args:
        df: DataFrame (post-rename) to normalize.

    Returns:
        DataFrame with date columns standardized.
    """
    df = df.copy()
    for field in DATE_FIELDS:
        if field not in df.columns:
            continue
        if pd.api.types.is_datetime64_any_dtype(df[field]):
            df[field] = df[field].dt.strftime("%Y-%m-%d")
        else:
            parsed = pd.to_datetime(df[field], errors="coerce")
            df[field] = parsed.dt.strftime("%Y-%m-%d")
    return df


def normalize_numeric_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Coerce NUMERIC_FIELDS columns to float.
    Handles strings with commas as decimal separators.

    Args:
        df: DataFrame to normalize.

    Returns:
        DataFrame with numeric columns as float.
    """
    df = df.copy()
    for field in NUMERIC_FIELDS:
        if field not in df.columns:
            continue
        if pd.api.types.is_numeric_dtype(df[field]):
            df[field] = df[field].astype(float)
        else:
            cleaned = (
                df[field]
                .astype(str)
                .str.strip()
                .str.replace(r"[\$€,\s]", "", regex=True)
                .str.replace(",", ".", regex=False)
            )
            df[field] = pd.to_numeric(cleaned, errors="coerce")
    return df


def normalize_booleans(df: pd.DataFrame) -> pd.DataFrame:
    """
    Coerce BOOLEAN_FIELDS columns to Python bool (True/False).
    Handles common string representations.

    Args:
        df: DataFrame to normalize.

    Returns:
        DataFrame with boolean columns normalized.
    """
    df = df.copy()
    true_values = {"true", "1", "yes", "si", "sí", "verdadero", "t", "y", "s"}
    false_values = {"false", "0", "no", "falso", "f", "n"}

    for field in BOOLEAN_FIELDS:
        if field not in df.columns:
            continue
        if pd.api.types.is_bool_dtype(df[field]):
            continue

        def _coerce_bool(val):
            if pd.isna(val):
                return None
            v = str(val).strip().lower()
            if v in true_values:
                return True
            if v in false_values:
                return False
            return None

        df[field] = df[field].apply(_coerce_bool)
    return df


def generate_missing_ids(df: pd.DataFrame) -> pd.DataFrame:
    """
    Generate UUID-based IDs for rows where id_siniestro is missing or blank.

    Args:
        df: DataFrame with canonical columns.

    Returns:
        DataFrame with id_siniestro populated.
    """
    df = df.copy()
    if "id_siniestro" not in df.columns:
        df["id_siniestro"] = [f"SIN-{uuid.uuid4().hex[:12].upper()}" for _ in range(len(df))]
    else:
        mask = df["id_siniestro"].isna() | (df["id_siniestro"].astype(str).str.strip() == "")
        generated = [f"SIN-{uuid.uuid4().hex[:12].upper()}" for _ in range(mask.sum())]
        df.loc[mask, "id_siniestro"] = generated
    return df


def _calculate_data_quality_score(row: pd.Series) -> float:
    """Compute a simple data quality score (0.0-1.0) based on required field completeness."""
    required = [
        "id_siniestro", "id_poliza", "id_asegurado", "ramo", "cobertura",
        "estado", "fecha_ocurrencia", "fecha_reporte", "fecha_inicio_poliza",
        "fecha_fin_poliza", "monto_reclamado", "suma_asegurada",
    ]
    present = sum(1 for f in required if f in row.index and pd.notna(row.get(f)) and str(row.get(f, "")).strip() not in ("", "nan", "None"))
    return round(present / len(required), 3)


def add_metadata_columns(
    df: pd.DataFrame,
    source_file: str,
    mapping_confidence: float,
) -> pd.DataFrame:
    """
    Add metadata columns: source_file, mapping_confidence, data_quality_score, limitacion_registro.

    Args:
        df: DataFrame with canonical columns.
        source_file: Name of the source file.
        mapping_confidence: LLM mapping confidence score.

    Returns:
        DataFrame with metadata columns added.
    """
    df = df.copy()
    df["source_file"] = source_file
    df["mapping_confidence"] = mapping_confidence

    # Compute data quality score per row
    df["data_quality_score"] = df.apply(_calculate_data_quality_score, axis=1)

    # Generate limitation notes based on quality score
    def _limitation(row):
        notes = []
        if row.get("data_quality_score", 1.0) < 0.5:
            notes.append("Registro con alta incompletitud de campos requeridos")
        if row.get("mapping_confidence", 1.0) < 0.5:
            notes.append("Mapeo de baja confianza - revisar manualmente")
        return "; ".join(notes) if notes else ""

    df["limitacion_registro"] = df.apply(_limitation, axis=1)
    return df


def export_canonical_claims(df: pd.DataFrame, path: str) -> None:
    """
    Export the canonical claims DataFrame to CSV.

    Args:
        df: Canonical claims DataFrame.
        path: Absolute output path.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False, encoding="utf-8")
    print(f"[INFO] Canonical claims exported to: {path} ({len(df)} rows)")


def apply_full_mapping(
    df: pd.DataFrame,
    mapping: dict,
    source_file: str,
) -> pd.DataFrame:
    """
    Orchestrate the full mapping pipeline for a single source DataFrame:
    1. Rename columns per mapping
    2. Normalize dates
    3. Normalize numeric values
    4. Normalize booleans
    5. Generate missing IDs
    6. Add metadata columns
    7. Add any missing canonical columns as NaN

    Args:
        df: Source DataFrame.
        mapping: Mapping dict from LLM (with 'column_mapping', 'mapping_confidence').
        source_file: Name of the source file.

    Returns:
        DataFrame with canonical column names and normalized values.
    """
    df = apply_column_mapping(df, mapping)
    df = normalize_dates(df)
    df = normalize_numeric_values(df)
    df = normalize_booleans(df)
    df = generate_missing_ids(df)

    mapping_confidence = float(mapping.get("mapping_confidence", 0.0))
    df = add_metadata_columns(df, source_file, mapping_confidence)

    # Add missing canonical columns with NaN
    for field in CANONICAL_FIELDS:
        if field not in df.columns:
            df[field] = np.nan

    # Reorder: canonical fields first, then any extra source columns
    canonical_order = [f for f in CANONICAL_FIELDS if f in df.columns]
    extra_cols = [c for c in df.columns if c not in CANONICAL_FIELDS]
    df = df[canonical_order + extra_cols]

    return df
