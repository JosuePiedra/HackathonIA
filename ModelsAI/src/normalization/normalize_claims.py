"""
Normalize the siniestros (claims) table from the canonical DataFrame.
"""

import pandas as pd

# Columns that belong to the normalized siniestros table
SINIESTROS_FIELDS = [
    "id_siniestro",
    "id_poliza",
    "id_asegurado",
    "id_vehiculo",
    "id_proveedor",
    "id_conductor",
    "ramo",
    "cobertura",
    "estado",
    "sucursal",
    "ciudad",
    "provincia",
    "fecha_ocurrencia",
    "fecha_reporte",
    "monto_reclamado",
    "monto_estimado",
    "monto_pagado",
    "deducible",
    "descripcion",
    "etiqueta_fraude_simulada",
    "source_file",
    "mapping_confidence",
    "data_quality_score",
    "limitacion_registro",
]


def normalize_claims(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and normalize the siniestros (claims) table from the canonical DataFrame.

    Operations:
    - Selects siniestros-relevant fields.
    - Drops duplicate id_siniestro rows (keeping first).
    - Resets index.
    - Ensures fecha_ocurrencia <= fecha_reporte (flags inconsistent rows).

    Args:
        canonical_df: Full canonical claims DataFrame.

    Returns:
        Normalized siniestros DataFrame.
    """
    present_cols = [c for c in SINIESTROS_FIELDS if c in canonical_df.columns]
    df = canonical_df[present_cols].copy()

    # Drop full duplicates
    df = df.drop_duplicates()

    # Drop duplicate claim IDs, keeping first occurrence
    if "id_siniestro" in df.columns:
        initial_len = len(df)
        df = df.drop_duplicates(subset=["id_siniestro"], keep="first")
        dropped = initial_len - len(df)
        if dropped:
            print(f"[INFO] normalize_claims: dropped {dropped} duplicate id_siniestro rows.")

    # Validate date order: fecha_ocurrencia should not be after fecha_reporte
    if "fecha_ocurrencia" in df.columns and "fecha_reporte" in df.columns:
        fecha_occ = pd.to_datetime(df["fecha_ocurrencia"], errors="coerce")
        fecha_rep = pd.to_datetime(df["fecha_reporte"], errors="coerce")
        invalid_date_order = (fecha_occ > fecha_rep) & fecha_occ.notna() & fecha_rep.notna()
        count_invalid = invalid_date_order.sum()
        if count_invalid:
            print(f"[WARNING] normalize_claims: {count_invalid} rows have fecha_ocurrencia > fecha_reporte.")

    df = df.reset_index(drop=True)
    print(f"[INFO] normalize_claims: {len(df)} siniestros records.")
    return df
