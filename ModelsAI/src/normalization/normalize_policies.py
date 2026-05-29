"""
Normalize the polizas (policies) table from the canonical DataFrame.
"""

import pandas as pd

POLIZAS_FIELDS = [
    "id_poliza",
    "id_asegurado",
    "id_vehiculo",
    "ramo",
    "cobertura",
    "fecha_inicio_poliza",
    "fecha_fin_poliza",
    "suma_asegurada",
    "deducible",
    "sucursal",
]


def normalize_policies(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and normalize the polizas (insurance policies) table.

    Operations:
    - Selects policy-relevant fields.
    - Deduplicates by id_poliza (keeps most recent if fecha_fin_poliza available).
    - Validates that fecha_inicio_poliza < fecha_fin_poliza.

    Args:
        canonical_df: Full canonical claims DataFrame.

    Returns:
        Normalized polizas DataFrame.
    """
    present_cols = [c for c in POLIZAS_FIELDS if c in canonical_df.columns]
    df = canonical_df[present_cols].copy()

    # Remove rows missing id_poliza
    if "id_poliza" in df.columns:
        missing_poliza = df["id_poliza"].isna().sum()
        if missing_poliza:
            print(f"[WARNING] normalize_policies: {missing_poliza} rows missing id_poliza (excluded).")
        df = df.dropna(subset=["id_poliza"])

    # Sort by fecha_fin_poliza descending so the most recent policy version is kept first
    if "id_poliza" in df.columns and "fecha_fin_poliza" in df.columns:
        df["_sort_key"] = pd.to_datetime(df["fecha_fin_poliza"], errors="coerce")
        df = df.sort_values("_sort_key", ascending=False)
        df = df.drop(columns=["_sort_key"])
        df = df.drop_duplicates(subset=["id_poliza"], keep="first")
    elif "id_poliza" in df.columns:
        df = df.drop_duplicates(subset=["id_poliza"], keep="first")

    # Validate date order
    if "fecha_inicio_poliza" in df.columns and "fecha_fin_poliza" in df.columns:
        ini = pd.to_datetime(df["fecha_inicio_poliza"], errors="coerce")
        fin = pd.to_datetime(df["fecha_fin_poliza"], errors="coerce")
        invalid = (ini >= fin) & ini.notna() & fin.notna()
        count_invalid = invalid.sum()
        if count_invalid:
            print(f"[WARNING] normalize_policies: {count_invalid} policies have fecha_inicio >= fecha_fin.")

    df = df.reset_index(drop=True)
    print(f"[INFO] normalize_policies: {len(df)} poliza records.")
    return df
