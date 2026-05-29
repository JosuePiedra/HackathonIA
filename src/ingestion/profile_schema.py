"""
Module for building schema profiles from DataFrames.
A schema profile captures column metadata, sample values, and quality stats.
"""

import json
import os
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from .detect_format import detect_date_columns, detect_numeric_columns, detect_boolean_columns


def _infer_column_type(series: pd.Series, date_cols: List[str], numeric_cols: List[str], boolean_cols: List[str]) -> str:
    """Infer a human-readable type label for a column."""
    col_name = series.name
    if col_name in boolean_cols:
        return "boolean"
    if col_name in date_cols:
        return "date"
    if col_name in numeric_cols:
        return "numeric"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    return "string"


def _safe_sample_values(series: pd.Series, n: int = 5) -> List[Any]:
    """Return up to n non-null sample values as JSON-serializable types."""
    non_null = series.dropna()
    samples = non_null.head(n).tolist()
    safe = []
    for v in samples:
        if isinstance(v, (np.integer,)):
            safe.append(int(v))
        elif isinstance(v, (np.floating,)):
            safe.append(float(v))
        elif isinstance(v, (np.bool_,)):
            safe.append(bool(v))
        elif isinstance(v, (pd.Timestamp,)):
            safe.append(v.isoformat())
        else:
            safe.append(str(v))
    return safe


def build_schema_profile(df: pd.DataFrame, file_name: str) -> Dict:
    """
    Build a schema profile dictionary from a DataFrame.

    The profile includes:
    - file_name: name of the source file
    - rows: total row count
    - columns: list of column metadata dicts:
        - name: column name
        - detected_type: one of 'string', 'numeric', 'date', 'boolean'
        - sample_values: up to 5 non-null sample values
        - missing_percentage: percentage of null values (0-100)

    Args:
        df: DataFrame to profile.
        file_name: Name of the source file (used for identification).

    Returns:
        Profile dictionary.
    """
    date_cols = detect_date_columns(df)
    numeric_cols = detect_numeric_columns(df)
    boolean_cols = detect_boolean_columns(df)

    total_rows = len(df)
    columns_info = []

    for col in df.columns:
        series = df[col]
        null_count = series.isna().sum()
        missing_pct = round((null_count / total_rows * 100) if total_rows > 0 else 0.0, 2)

        col_type = _infer_column_type(series, date_cols, numeric_cols, boolean_cols)
        samples = _safe_sample_values(series)

        columns_info.append({
            "name": col,
            "detected_type": col_type,
            "sample_values": samples,
            "missing_percentage": missing_pct,
        })

    profile = {
        "file_name": file_name,
        "rows": total_rows,
        "columns": columns_info,
    }
    return profile


def save_schema_profile(profile: Dict, path: str) -> None:
    """
    Save a schema profile dictionary as a JSON file.

    Args:
        profile: Profile dictionary from build_schema_profile.
        path: Absolute path where the JSON file will be written.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)
    print(f"[INFO] Schema profile saved to: {path}")
