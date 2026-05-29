"""
Validation of LLM-generated schema mappings against source DataFrames.
"""

from typing import Dict, List

import pandas as pd

from .canonical_schema import CANONICAL_FIELDS, REQUIRED_FIELDS, DATE_FIELDS, NUMERIC_FIELDS


def validate_mapping(mapping: dict, df: pd.DataFrame) -> dict:
    """
    Validate that all source columns referenced in the mapping exist in the DataFrame.

    Args:
        mapping: Mapping dict with 'column_mapping' key.
        df: Source DataFrame.

    Returns:
        Dict with keys:
            - valid_pairs: list of (source, canonical) tuples that are valid
            - invalid_pairs: list of (source, canonical) tuples where source col is missing
    """
    column_mapping = mapping.get("column_mapping", {})
    df_cols = set(df.columns.tolist())

    valid_pairs = []
    invalid_pairs = []

    for source_col, canonical_col in column_mapping.items():
        if source_col in df_cols:
            valid_pairs.append((source_col, canonical_col))
        else:
            invalid_pairs.append((source_col, canonical_col))

    if invalid_pairs:
        print(f"[WARNING] {len(invalid_pairs)} mapped source column(s) not found in DataFrame: "
              f"{[p[0] for p in invalid_pairs]}")

    return {
        "valid_pairs": valid_pairs,
        "invalid_pairs": invalid_pairs,
    }


def validate_required_fields(mapping: dict) -> List[str]:
    """
    Identify required canonical fields that are not covered by any mapping.

    Args:
        mapping: Mapping dict with 'column_mapping' key.

    Returns:
        List of required canonical field names not present in mapping values.
    """
    column_mapping = mapping.get("column_mapping", {})
    mapped_canonical = set(column_mapping.values())
    missing = [f for f in REQUIRED_FIELDS if f not in mapped_canonical]
    return missing


def validate_type_compatibility(mapping: dict, df: pd.DataFrame) -> List[str]:
    """
    Check for potential type mismatches between source columns and canonical types.

    Args:
        mapping: Mapping dict with 'column_mapping' key.
        df: Source DataFrame.

    Returns:
        List of issue description strings.
    """
    issues = []
    column_mapping = mapping.get("column_mapping", {})

    for source_col, canonical_col in column_mapping.items():
        if source_col not in df.columns:
            continue

        canonical_type = CANONICAL_FIELDS.get(canonical_col, {}).get("type")
        if canonical_type is None:
            continue

        series = df[source_col]

        if canonical_type == "numeric":
            if not pd.api.types.is_numeric_dtype(series):
                # Try coercing a sample
                sample = series.dropna().astype(str).head(20)
                converted = pd.to_numeric(
                    sample.str.replace(",", ".", regex=False).str.replace(" ", "", regex=False),
                    errors="coerce",
                )
                success_rate = converted.notna().sum() / max(len(sample), 1)
                if success_rate < 0.7:
                    issues.append(
                        f"Type mismatch: '{source_col}' -> '{canonical_col}' "
                        f"(expected numeric, coercion success rate: {success_rate:.0%})"
                    )

        elif canonical_type == "date":
            if not pd.api.types.is_datetime64_any_dtype(series):
                sample = series.dropna().astype(str).head(20)
                parsed = pd.to_datetime(sample, errors="coerce")
                success_rate = parsed.notna().sum() / max(len(sample), 1)
                if success_rate < 0.6:
                    issues.append(
                        f"Type mismatch: '{source_col}' -> '{canonical_col}' "
                        f"(expected date, parse success rate: {success_rate:.0%})"
                    )

        elif canonical_type == "boolean":
            if not pd.api.types.is_bool_dtype(series):
                unique_vals = set(series.dropna().astype(str).str.lower().unique())
                valid_bool = {"true", "false", "1", "0", "yes", "no", "si", "sí", "t", "f"}
                if not unique_vals.issubset(valid_bool):
                    issues.append(
                        f"Type mismatch: '{source_col}' -> '{canonical_col}' "
                        f"(expected boolean, found values: {list(unique_vals)[:5]})"
                    )

    return issues


def calculate_mapping_confidence(mapping: dict, validation_results: dict) -> float:
    """
    Calculate an overall mapping confidence score combining LLM confidence and validation results.

    Args:
        mapping: Original mapping dict (may contain 'mapping_confidence').
        validation_results: Output of validate_full().

    Returns:
        Float confidence score in [0.0, 1.0].
    """
    llm_confidence = float(mapping.get("mapping_confidence", 0.5))
    issues = validation_results.get("issues", [])
    warnings = validation_results.get("warnings", [])

    # Penalize for issues and warnings
    penalty = len(issues) * 0.1 + len(warnings) * 0.05
    adjusted = max(0.0, llm_confidence - penalty)
    return round(adjusted, 3)


def validate_full(mapping: dict, df: pd.DataFrame) -> dict:
    """
    Run all validations and return a comprehensive validation report.

    Args:
        mapping: Mapping dict from LLM.
        df: Source DataFrame.

    Returns:
        Dict with keys:
            - is_valid: bool (True if no blocking issues)
            - confidence: float
            - issues: list of issue strings (blocking problems)
            - warnings: list of warning strings (non-blocking concerns)
    """
    issues = []
    warnings = []

    # 1. Check source columns exist
    col_validation = validate_mapping(mapping, df)
    invalid_pairs = col_validation.get("invalid_pairs", [])
    for src, can in invalid_pairs:
        issues.append(f"Source column '{src}' mapped to '{can}' does not exist in DataFrame.")

    # 2. Check required fields coverage
    missing_required = validate_required_fields(mapping)
    for field in missing_required:
        warnings.append(f"Required canonical field '{field}' has no source mapping.")

    # 3. Check type compatibility
    type_issues = validate_type_compatibility(mapping, df)
    warnings.extend(type_issues)

    # 4. Check that column_mapping is not empty
    if not mapping.get("column_mapping"):
        issues.append("Mapping has no column_mapping entries; schema mapping is empty.")

    is_valid = len(issues) == 0

    # Build a partial result for confidence calculation
    partial_result = {"issues": issues, "warnings": warnings}
    confidence = calculate_mapping_confidence(mapping, partial_result)

    return {
        "is_valid": is_valid,
        "confidence": confidence,
        "issues": issues,
        "warnings": warnings,
    }
