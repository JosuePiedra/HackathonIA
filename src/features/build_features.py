"""
Feature engineering for insurance fraud detection.

Builds all risk variables from the canonical claims DataFrame joined
with normalized tables.
"""

import pandas as pd
import numpy as np


def calculate_date_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate time-based features from policy and claim dates.

    Adds:
    - dias_desde_inicio_poliza: days between policy start and incident
    - dias_desde_fin_poliza: days between incident and policy end (negative = after expiry)
    - dias_entre_ocurrencia_reporte: days between incident and claim report

    Args:
        df: DataFrame with date columns.

    Returns:
        DataFrame with new date feature columns added.
    """
    df = df.copy()
    ref_today = pd.Timestamp.today().normalize()

    fecha_occ = pd.to_datetime(df.get("fecha_ocurrencia", pd.Series(dtype="object")), errors="coerce")
    fecha_rep = pd.to_datetime(df.get("fecha_reporte", pd.Series(dtype="object")), errors="coerce")
    fecha_ini = pd.to_datetime(df.get("fecha_inicio_poliza", pd.Series(dtype="object")), errors="coerce")
    fecha_fin = pd.to_datetime(df.get("fecha_fin_poliza", pd.Series(dtype="object")), errors="coerce")

    df["dias_desde_inicio_poliza"] = (fecha_occ - fecha_ini).dt.days
    df["dias_desde_fin_poliza"] = (fecha_fin - fecha_occ).dt.days
    df["dias_entre_ocurrencia_reporte"] = (fecha_rep - fecha_occ).dt.days

    return df


def calculate_amount_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate monetary ratio features.

    Adds:
    - ratio_monto_suma_asegurada: monto_reclamado / suma_asegurada
    - ratio_monto_estimado: monto_reclamado / monto_estimado
    - diferencia_monto_reclamado_estimado: monto_reclamado - monto_estimado

    Args:
        df: DataFrame with monetary columns.

    Returns:
        DataFrame with new amount feature columns added.
    """
    df = df.copy()

    monto_rec = pd.to_numeric(df.get("monto_reclamado"), errors="coerce")
    suma_aseg = pd.to_numeric(df.get("suma_asegurada"), errors="coerce")
    monto_est = pd.to_numeric(df.get("monto_estimado"), errors="coerce")

    # ratio_monto_suma_asegurada: clamp to 0-1+ range
    with np.errstate(divide="ignore", invalid="ignore"):
        df["ratio_monto_suma_asegurada"] = np.where(
            suma_aseg > 0,
            (monto_rec / suma_aseg).round(4),
            np.nan,
        )

    # ratio_monto_estimado
    with np.errstate(divide="ignore", invalid="ignore"):
        df["ratio_monto_estimado"] = np.where(
            monto_est > 0,
            (monto_rec / monto_est).round(4),
            np.nan,
        )

    df["diferencia_monto_reclamado_estimado"] = (monto_rec - monto_est).round(2)

    return df


def calculate_history_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate historical frequency features per insured, vehicle, driver, and provider.

    Adds:
    - historial_siniestros_asegurado: total claims per asegurado in dataset
    - historial_siniestros_vehiculo: total claims per vehiculo in dataset
    - historial_siniestros_conductor: total claims per conductor in dataset
    - frecuencia_proveedor: total claims per proveedor in dataset

    Args:
        df: DataFrame with id columns.

    Returns:
        DataFrame with new history feature columns added.
    """
    df = df.copy()

    freq_map = {
        "historial_siniestros_asegurado": "id_asegurado",
        "historial_siniestros_vehiculo": "id_vehiculo",
        "historial_siniestros_conductor": "id_conductor",
        "frecuencia_proveedor": "id_proveedor",
    }

    for feature_col, id_col in freq_map.items():
        if id_col in df.columns:
            counts = df[id_col].map(df[id_col].value_counts())
            df[feature_col] = counts.fillna(0).astype(int)
        else:
            df[feature_col] = 0

    return df


def calculate_document_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate document-based risk features.

    Adds:
    - documentos_faltantes: count of missing documents (from docs table or flag)
    - documentos_inconsistentes: flag for document inconsistencies

    Args:
        df: DataFrame that may contain document columns.

    Returns:
        DataFrame with document feature columns ensured.
    """
    df = df.copy()

    # documentos_faltantes
    if "documentos_faltantes" not in df.columns:
        if "documentos_completos" in df.columns:
            def _missing_docs(val):
                if val is True or str(val).lower() in ("true", "1"):
                    return 0
                return 2  # Estimate 2 missing docs when incomplete
            df["documentos_faltantes"] = df["documentos_completos"].apply(_missing_docs)
        else:
            df["documentos_faltantes"] = 0

    # documentos_inconsistentes
    if "documentos_inconsistentes" not in df.columns:
        df["documentos_inconsistentes"] = 0

    # Ensure numeric types
    df["documentos_faltantes"] = pd.to_numeric(df["documentos_faltantes"], errors="coerce").fillna(0).astype(int)
    df["documentos_inconsistentes"] = pd.to_numeric(df["documentos_inconsistentes"], errors="coerce").fillna(0).astype(int)

    return df


def calculate_boolean_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate boolean risk indicator features.

    Adds:
    - proveedor_recurrente: True if frecuencia_proveedor > 10
    - monto_atipico: True if ratio_monto_suma_asegurada >= 0.9
    - reporte_tardio: True if dias_entre_ocurrencia_reporte > 7
    - borde_vigencia: True if incident is within 30 days of policy start or end

    Args:
        df: DataFrame with computed numeric features.

    Returns:
        DataFrame with boolean indicator columns added.
    """
    df = df.copy()

    # proveedor_recurrente
    if "frecuencia_proveedor" in df.columns:
        df["proveedor_recurrente"] = df["frecuencia_proveedor"] > 10
    else:
        df["proveedor_recurrente"] = False

    # monto_atipico
    if "ratio_monto_suma_asegurada" in df.columns:
        df["monto_atipico"] = df["ratio_monto_suma_asegurada"] >= 0.90
    else:
        df["monto_atipico"] = False

    # reporte_tardio
    if "dias_entre_ocurrencia_reporte" in df.columns:
        df["reporte_tardio"] = df["dias_entre_ocurrencia_reporte"] > 7
    else:
        df["reporte_tardio"] = False

    # borde_vigencia: within 30 days of start OR within 30 days of end
    if "dias_desde_inicio_poliza" in df.columns and "dias_desde_fin_poliza" in df.columns:
        cerca_inicio = (df["dias_desde_inicio_poliza"] >= 0) & (df["dias_desde_inicio_poliza"] <= 30)
        cerca_fin = (df["dias_desde_fin_poliza"] >= 0) & (df["dias_desde_fin_poliza"] <= 30)
        df["borde_vigencia"] = cerca_inicio | cerca_fin
    else:
        df["borde_vigencia"] = False

    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Orchestrate all feature engineering steps.

    Applies in order:
    1. Date features
    2. Amount features
    3. History features
    4. Document features
    5. Boolean indicator features

    Args:
        df: Merged canonical + normalized DataFrame.

    Returns:
        DataFrame enriched with all feature columns.
    """
    print("[INFO] build_features: starting feature engineering...")
    df = calculate_date_features(df)
    print("[INFO] build_features: date features computed.")

    df = calculate_amount_features(df)
    print("[INFO] build_features: amount features computed.")

    df = calculate_history_features(df)
    print("[INFO] build_features: history features computed.")

    df = calculate_document_features(df)
    print("[INFO] build_features: document features computed.")

    df = calculate_boolean_features(df)
    print("[INFO] build_features: boolean indicator features computed.")

    feature_cols = [
        "dias_desde_inicio_poliza", "dias_desde_fin_poliza", "dias_entre_ocurrencia_reporte",
        "ratio_monto_suma_asegurada", "ratio_monto_estimado", "diferencia_monto_reclamado_estimado",
        "historial_siniestros_asegurado", "historial_siniestros_vehiculo",
        "historial_siniestros_conductor", "frecuencia_proveedor",
        "documentos_faltantes", "documentos_inconsistentes",
        "proveedor_recurrente", "monto_atipico", "reporte_tardio", "borde_vigencia",
    ]
    present_features = [c for c in feature_cols if c in df.columns]
    print(f"[INFO] build_features: {len(present_features)} feature columns built.")

    return df
