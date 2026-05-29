"""
Normalize the proveedores (service providers) table from the canonical DataFrame.

Providers can be auto repair shops, medical providers, towing companies, etc.
"""

import pandas as pd

PROVIDERS_FIELDS = [
    "id_proveedor",
    "ciudad",
    "provincia",
]


def normalize_providers(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and normalize the proveedores (service providers) table.

    Operations:
    - Selects provider-relevant fields.
    - Filters rows with a valid id_proveedor.
    - Deduplicates by id_proveedor.
    - Computes per-provider statistics:
        - reclamos_asociados: total claims associated with provider
        - monto_promedio_reclamado: average claimed amount
        - nivel_observacion: 'alto' / 'medio' / 'normal' based on claim count
    - Adds en_lista_restrictiva=False by default (external enrichment required).

    Args:
        canonical_df: Full canonical claims DataFrame.

    Returns:
        Normalized proveedores DataFrame.
    """
    present_cols = [c for c in PROVIDERS_FIELDS if c in canonical_df.columns]
    df = canonical_df[present_cols].copy()

    if "id_proveedor" not in df.columns:
        print("[INFO] normalize_providers: 'id_proveedor' not found; returning empty DataFrame.")
        return pd.DataFrame(
            columns=PROVIDERS_FIELDS + [
                "reclamos_asociados", "monto_promedio_reclamado",
                "nivel_observacion", "en_lista_restrictiva",
            ]
        )

    # Keep only rows with a valid provider id
    df = df.dropna(subset=["id_proveedor"])
    df = df[df["id_proveedor"].astype(str).str.strip() != ""]

    # Compute provider statistics from canonical_df
    stats = _compute_provider_stats(canonical_df)

    df = df.drop_duplicates(subset=["id_proveedor"], keep="first")
    df = df.merge(stats, on="id_proveedor", how="left")

    # Fill missing stats
    df["reclamos_asociados"] = df["reclamos_asociados"].fillna(0).astype(int)
    df["monto_promedio_reclamado"] = df["monto_promedio_reclamado"].fillna(0.0).round(2)

    # Assign nivel_observacion based on reclamos_asociados
    df["nivel_observacion"] = df["reclamos_asociados"].apply(_assign_nivel_observacion)

    # en_lista_restrictiva defaults to False (requires external watchlist data)
    df["en_lista_restrictiva"] = False

    df = df.reset_index(drop=True)
    print(f"[INFO] normalize_providers: {len(df)} proveedor records.")
    return df


def _compute_provider_stats(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """Compute reclamos_asociados and monto_promedio_reclamado per provider."""
    if "id_proveedor" not in canonical_df.columns:
        return pd.DataFrame(columns=["id_proveedor", "reclamos_asociados", "monto_promedio_reclamado"])

    work = canonical_df[["id_proveedor", "monto_reclamado"]].copy() if "monto_reclamado" in canonical_df.columns \
        else canonical_df[["id_proveedor"]].copy()
    work = work.dropna(subset=["id_proveedor"])

    if "monto_reclamado" in work.columns:
        stats = work.groupby("id_proveedor").agg(
            reclamos_asociados=("id_proveedor", "count"),
            monto_promedio_reclamado=("monto_reclamado", "mean"),
        ).reset_index()
    else:
        stats = work.groupby("id_proveedor").size().reset_index(name="reclamos_asociados")
        stats["monto_promedio_reclamado"] = 0.0

    return stats


def _assign_nivel_observacion(count: int) -> str:
    """Assign observation level based on claim count."""
    if count >= 20:
        return "alto"
    if count >= 10:
        return "medio"
    return "normal"
