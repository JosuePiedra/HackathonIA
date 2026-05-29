"""
Normalize the asegurados (customers/policyholders) table from the canonical DataFrame.
"""

import pandas as pd

CUSTOMERS_FIELDS = [
    "id_asegurado",
    "id_poliza",
    "ciudad",
    "provincia",
]


def normalize_customers(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and normalize the asegurados (customers) table.

    Operations:
    - Selects customer-relevant fields.
    - Deduplicates by id_asegurado.
    - Computes reclamos_ultimos_12_meses: count of claims per asegurado
      within the last 12 months from the latest fecha_reporte in the dataset.

    Args:
        canonical_df: Full canonical claims DataFrame.

    Returns:
        Normalized asegurados DataFrame with reclamos_ultimos_12_meses column.
    """
    present_cols = [c for c in CUSTOMERS_FIELDS if c in canonical_df.columns]
    df = canonical_df[present_cols].copy()

    if "id_asegurado" not in df.columns:
        print("[WARNING] normalize_customers: 'id_asegurado' not found; returning empty DataFrame.")
        return pd.DataFrame(columns=CUSTOMERS_FIELDS + ["reclamos_ultimos_12_meses"])

    # Remove rows missing id_asegurado
    df = df.dropna(subset=["id_asegurado"])

    # Deduplicate by id_asegurado
    df = df.drop_duplicates(subset=["id_asegurado"], keep="first")

    # Compute reclamos_ultimos_12_meses from canonical_df
    claims_count = _compute_claims_last_12_months(canonical_df)
    df = df.merge(claims_count, on="id_asegurado", how="left")
    df["reclamos_ultimos_12_meses"] = df["reclamos_ultimos_12_meses"].fillna(0).astype(int)

    df = df.reset_index(drop=True)
    print(f"[INFO] normalize_customers: {len(df)} asegurado records.")
    return df


def _compute_claims_last_12_months(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """
    For each asegurado, count claims in the last 12 months from the max fecha_reporte.

    Returns a DataFrame with columns: id_asegurado, reclamos_ultimos_12_meses
    """
    if "id_asegurado" not in canonical_df.columns or "fecha_reporte" not in canonical_df.columns:
        if "id_asegurado" in canonical_df.columns:
            unique_ids = canonical_df["id_asegurado"].dropna().unique()
            return pd.DataFrame({
                "id_asegurado": unique_ids,
                "reclamos_ultimos_12_meses": 0,
            })
        return pd.DataFrame(columns=["id_asegurado", "reclamos_ultimos_12_meses"])

    work = canonical_df[["id_asegurado", "fecha_reporte"]].copy()
    work["fecha_reporte_dt"] = pd.to_datetime(work["fecha_reporte"], errors="coerce")
    work = work.dropna(subset=["id_asegurado", "fecha_reporte_dt"])

    max_date = work["fecha_reporte_dt"].max()
    if pd.isna(max_date):
        unique_ids = work["id_asegurado"].unique()
        return pd.DataFrame({
            "id_asegurado": unique_ids,
            "reclamos_ultimos_12_meses": 0,
        })

    cutoff = max_date - pd.DateOffset(months=12)
    recent = work[work["fecha_reporte_dt"] >= cutoff]

    counts = (
        recent.groupby("id_asegurado")
        .size()
        .reset_index(name="reclamos_ultimos_12_meses")
    )
    return counts
