"""
Normalize the vehiculos (vehicles) table from the canonical DataFrame.
"""

import pandas as pd

VEHICLES_FIELDS = [
    "id_vehiculo",
    "id_asegurado",
    "id_poliza",
    "ramo",
]


def normalize_vehicles(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and normalize the vehiculos (vehicles) table.

    Operations:
    - Selects vehicle-relevant fields.
    - Filters rows that have a valid id_vehiculo (not all claims involve vehicles).
    - Deduplicates by id_vehiculo.
    - Adds siniestros_asociados count per vehicle.

    Args:
        canonical_df: Full canonical claims DataFrame.

    Returns:
        Normalized vehiculos DataFrame.
    """
    present_cols = [c for c in VEHICLES_FIELDS if c in canonical_df.columns]
    df = canonical_df[present_cols].copy()

    if "id_vehiculo" not in df.columns:
        print("[INFO] normalize_vehicles: 'id_vehiculo' not found; returning empty DataFrame.")
        return pd.DataFrame(columns=VEHICLES_FIELDS + ["siniestros_asociados"])

    # Keep only rows with a valid vehicle id
    df = df.dropna(subset=["id_vehiculo"])
    df = df[df["id_vehiculo"].astype(str).str.strip() != ""]

    # Compute siniestros_asociados before deduplication
    if "id_vehiculo" in canonical_df.columns:
        vehicle_counts = (
            canonical_df.dropna(subset=["id_vehiculo"])
            .groupby("id_vehiculo")
            .size()
            .reset_index(name="siniestros_asociados")
        )
        df = df.drop_duplicates(subset=["id_vehiculo"], keep="first")
        df = df.merge(vehicle_counts, on="id_vehiculo", how="left")
        df["siniestros_asociados"] = df["siniestros_asociados"].fillna(0).astype(int)
    else:
        df = df.drop_duplicates(subset=["id_vehiculo"], keep="first")
        df["siniestros_asociados"] = 0

    df = df.reset_index(drop=True)
    print(f"[INFO] normalize_vehicles: {len(df)} vehiculo records.")
    return df
