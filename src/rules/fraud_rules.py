"""
Fraud rule engine for insurance claims.

Applies rule flags, computes risk scores, generates alerts and explanations.
"""

import pandas as pd
import numpy as np
from typing import Tuple, List

from .catalog_rules import RULES, CRITICAL_RULE_CODES


# Mapping from flag column name to (rule_code, points)
FLAG_TO_RULE = {
    "flag_borde_vigencia":              ("RF-05", RULES["RF-05"]["points"]),
    "flag_robo_denuncia_tardia":        ("RF-06", RULES["RF-06"]["points"]),
    "flag_reporte_tardio":              ("RF-TEMP-01", RULES["RF-TEMP-01"]["points"]),
    "flag_monto_atipico":               ("RF-MONTO-01", RULES["RF-MONTO-01"]["points"]),
    "flag_documentos_incompletos":      ("RF-DOC-01", RULES["RF-DOC-01"]["points"]),
    "flag_documentos_inconsistentes":   ("RF-DOC-02", RULES["RF-DOC-02"]["points"]),
    "flag_proveedor_recurrente":        ("RF-PROV-01", RULES["RF-PROV-01"]["points"]),
    # RF-PROV-02 merged into RF-03 (lista restrictiva) in new catalog
    "flag_proveedor_lista_restrictiva": ("RF-03", RULES["RF-03"]["points"]),
    "flag_alta_frecuencia_asegurado":   ("RF-FREC-01", RULES["RF-FREC-01"]["points"]),
    "flag_alta_frecuencia_vehiculo":    ("RF-FREC-02", RULES["RF-FREC-02"]["points"]),
    "flag_alta_frecuencia_conductor":   ("RF-FREC-03", RULES["RF-FREC-03"]["points"]),
    "flag_dinamica_sospechosa":         ("RF-04", RULES["RF-04"]["points"]),
    "flag_narrativa_clonada":           ("RF-07", RULES["RF-07"]["points"]),
    "flag_cobertura_robo_total":        ("RF-01", RULES["RF-01"]["points"]),
}

# Suspicious narrative keywords suggesting impossible dynamics
IMPOSSIBLE_DYNAMICS_KEYWORDS = [
    "imposible", "inexplicable", "sin frenos", "sin control",
    "vehículo en el aire", "saltó", "desapareció", "sin testigos",
    "nadie vio", "solo", "vacío", "no había nadie",
]

# Keywords indicating theft coverage
THEFT_COVERAGE_KEYWORDS = [
    "robo", "hurto", "sustracción", "theft", "stolen",
    "pérdida total", "perdida total",
]

# Keywords indicating total loss coverage
TOTAL_LOSS_KEYWORDS = [
    "pérdida total", "perdida total", "total loss", "robo total",
    "pérdida total por robo",
]


def _safe_bool(val) -> bool:
    """Safely coerce a value to bool, treating NaN/None as False."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return False
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float, np.integer, np.floating)):
        return bool(val)
    v = str(val).strip().lower()
    return v in {"true", "1", "yes", "si", "sí", "t", "y", "s", "verdadero"}


def _safe_float(val, default=0.0) -> float:
    """Safely coerce to float."""
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _safe_int(val, default=0) -> int:
    """Safely coerce to int."""
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def apply_rule_flags(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all rule flag columns (0 or 1) based on feature values.

    Args:
        df: DataFrame with feature columns from build_features.

    Returns:
        DataFrame with all flag columns added.
    """
    df = df.copy()

    # --- RF-05: Borde de vigencia ---
    if "borde_vigencia" in df.columns:
        df["flag_borde_vigencia"] = df["borde_vigencia"].apply(lambda v: 1 if _safe_bool(v) else 0)
    else:
        df["flag_borde_vigencia"] = 0

    # --- RF-06: Robo con denuncia tardía (>4 days for theft coverage) ---
    days_col = df.get("dias_entre_ocurrencia_reporte", pd.Series(0, index=df.index)) if "dias_entre_ocurrencia_reporte" in df.columns else pd.Series(0, index=df.index)
    cobertura_col = df["cobertura"].astype(str).str.lower() if "cobertura" in df.columns else pd.Series("", index=df.index)
    is_theft = cobertura_col.apply(lambda c: any(kw in c for kw in THEFT_COVERAGE_KEYWORDS))
    days_numeric = pd.to_numeric(days_col, errors="coerce").fillna(0)
    df["flag_robo_denuncia_tardia"] = ((is_theft) & (days_numeric > 4)).astype(int)

    # --- RF-TEMP-01: Reporte tardío (>7 days) ---
    df["flag_reporte_tardio"] = (days_numeric > 7).astype(int)

    # --- RF-MONTO-01: Monto atípico (ratio >= 0.90) ---
    if "ratio_monto_suma_asegurada" in df.columns:
        ratio = pd.to_numeric(df["ratio_monto_suma_asegurada"], errors="coerce").fillna(0)
        df["flag_monto_atipico"] = (ratio >= 0.90).astype(int)
    else:
        df["flag_monto_atipico"] = 0

    # --- RF-DOC-01: Documentos incompletos ---
    if "documentos_faltantes" in df.columns:
        doc_falt = pd.to_numeric(df["documentos_faltantes"], errors="coerce").fillna(0)
        df["flag_documentos_incompletos"] = (doc_falt > 0).astype(int)
    else:
        df["flag_documentos_incompletos"] = 0

    # --- RF-DOC-02: Documentos inconsistentes ---
    if "documentos_inconsistentes" in df.columns:
        doc_incon = pd.to_numeric(df["documentos_inconsistentes"], errors="coerce").fillna(0)
        df["flag_documentos_inconsistentes"] = (doc_incon > 0).astype(int)
    else:
        df["flag_documentos_inconsistentes"] = 0

    # --- RF-PROV-01: Proveedor recurrente (>10 claims) ---
    if "frecuencia_proveedor" in df.columns:
        freq_prov = pd.to_numeric(df["frecuencia_proveedor"], errors="coerce").fillna(0)
        df["flag_proveedor_recurrente"] = (freq_prov > 10).astype(int)
    else:
        df["flag_proveedor_recurrente"] = 0

    # --- RF-PROV-02 / RF-03: Proveedor en lista restrictiva ---
    if "en_lista_restrictiva" in df.columns:
        df["flag_proveedor_lista_restrictiva"] = df["en_lista_restrictiva"].apply(
            lambda v: 1 if _safe_bool(v) else 0
        )
    else:
        df["flag_proveedor_lista_restrictiva"] = 0

    # --- RF-FREC-01: Alta frecuencia asegurado (>=3) ---
    if "historial_siniestros_asegurado" in df.columns:
        hist_aseg = pd.to_numeric(df["historial_siniestros_asegurado"], errors="coerce").fillna(0)
        df["flag_alta_frecuencia_asegurado"] = (hist_aseg >= 3).astype(int)
    else:
        df["flag_alta_frecuencia_asegurado"] = 0

    # --- RF-FREC-02: Alta frecuencia vehículo (>=3) ---
    if "historial_siniestros_vehiculo" in df.columns:
        hist_veh = pd.to_numeric(df["historial_siniestros_vehiculo"], errors="coerce").fillna(0)
        df["flag_alta_frecuencia_vehiculo"] = (hist_veh >= 3).astype(int)
    else:
        df["flag_alta_frecuencia_vehiculo"] = 0

    # --- RF-FREC-03: Alta frecuencia conductor (>=3) ---
    if "historial_siniestros_conductor" in df.columns:
        hist_cond = pd.to_numeric(df["historial_siniestros_conductor"], errors="coerce").fillna(0)
        df["flag_alta_frecuencia_conductor"] = (hist_cond >= 3).astype(int)
    else:
        df["flag_alta_frecuencia_conductor"] = 0

    # --- RF-DIN-01: Siniestro severo sin tercero identificado ---
    if "tercero_identificado" in df.columns and "severidad_accidente" in df.columns:
        no_tercero = df["tercero_identificado"].apply(lambda v: not _safe_bool(v))
        alta_severidad = df["severidad_accidente"].astype(str).str.lower().isin(["alta", "grave", "severa", "total"])
        df["flag_sin_tercero_identificado"] = (no_tercero & alta_severidad).astype(int)
    else:
        # Proxy: high monto ratio and no tercero info
        if "ratio_monto_suma_asegurada" in df.columns:
            ratio = pd.to_numeric(df["ratio_monto_suma_asegurada"], errors="coerce").fillna(0)
            df["flag_sin_tercero_identificado"] = (ratio >= 0.85).astype(int)
        else:
            df["flag_sin_tercero_identificado"] = 0

    # --- RF-04: Dinámica sospechosa (keyword heuristic on description) ---
    if "descripcion" in df.columns:
        desc = df["descripcion"].astype(str).str.lower()
        has_impossible = desc.apply(
            lambda d: any(kw in d for kw in IMPOSSIBLE_DYNAMICS_KEYWORDS)
        )
        df["flag_dinamica_sospechosa"] = has_impossible.astype(int)
    else:
        df["flag_dinamica_sospechosa"] = 0

    # --- RF-07: Narrativa clonada (duplicate description detection) ---
    if "descripcion" in df.columns:
        desc_normalized = df["descripcion"].astype(str).str.lower().str.strip()
        # Count occurrences of each description
        desc_counts = desc_normalized.map(desc_normalized.value_counts())
        # Flag if the exact same description appears more than once and is not empty/null
        df["flag_narrativa_clonada"] = (
            (desc_counts > 1) & (desc_normalized.str.len() > 10)
        ).astype(int)
    else:
        df["flag_narrativa_clonada"] = 0

    # --- RF-01: Cobertura pérdida total por robo ---
    if "cobertura" in df.columns:
        cob = df["cobertura"].astype(str).str.lower()
        df["flag_cobertura_robo_total"] = cob.apply(
            lambda c: 1 if any(kw in c for kw in TOTAL_LOSS_KEYWORDS) else 0
        )
    else:
        df["flag_cobertura_robo_total"] = 0

    return df


def apply_rule_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute score_reglas (0-100) and nivel_reglas (Verde/Amarillo/Rojo) per row.

    Maps each active flag to its rule's points and sums them.
    Caps at 100.

    Args:
        df: DataFrame with flag columns from apply_rule_flags.

    Returns:
        DataFrame with score_reglas and nivel_reglas columns added.
    """
    df = df.copy()

    present_flags = [f for f in FLAG_TO_RULE if f in df.columns]

    def _compute_score(row):
        total = 0
        for flag_col in present_flags:
            val = row.get(flag_col, 0)
            if _safe_int(val) == 1:
                total += FLAG_TO_RULE[flag_col][1]
        return min(total, 100)

    df["score_reglas"] = df.apply(_compute_score, axis=1)
    df["score_heuristico"] = df["score_reglas"]

    def _nivel(score):
        if score > 75:
            return "Rojo"
        if score > 40:
            return "Amarillo"
        return "Verde"

    df["nivel_reglas"] = df["score_reglas"].apply(_nivel)
    df["nivel_riesgo"] = df["nivel_reglas"]

    return df


def generate_alert_lists(row: pd.Series) -> Tuple[List[str], List[str]]:
    """
    Generate lists of activated rule codes and corresponding alert descriptions.

    Args:
        row: A single row from the scored DataFrame.

    Returns:
        Tuple of (reglas_activadas, alertas_reglas) lists.
    """
    reglas_activadas = []
    alertas_reglas = []

    for flag_col, (rule_code, points) in FLAG_TO_RULE.items():
        val = row.get(flag_col, 0)
        if _safe_int(val) == 1:
            reglas_activadas.append(rule_code)
            rule_name = RULES[rule_code]["name"]
            alertas_reglas.append(f"{rule_code}: {rule_name} ({points} pts)")

    return reglas_activadas, alertas_reglas


def generate_rules_explanation(row: pd.Series) -> str:
    """
    Generate a deterministic template-based explanation for the rule score.

    Args:
        row: A single row from the scored DataFrame.

    Returns:
        Human-readable explanation string in Spanish.
    """
    score = _safe_int(row.get("score_reglas", 0))
    nivel = str(row.get("nivel_reglas", "Verde"))
    id_sin = str(row.get("id_siniestro", "N/D"))
    reglas_activadas = row.get("reglas_activadas", [])

    if isinstance(reglas_activadas, str):
        reglas_activadas = [r.strip() for r in reglas_activadas.split(",") if r.strip()]

    if not reglas_activadas:
        return (
            f"Siniestro {id_sin}: Sin indicadores de riesgo activos. "
            f"Puntaje de reglas: {score}/100. Nivel: {nivel}."
        )

    activated_count = len(reglas_activadas)
    rules_str = ", ".join(reglas_activadas)

    explanation = (
        f"Siniestro {id_sin}: Se activaron {activated_count} regla(s) de riesgo "
        f"({rules_str}) con puntaje total de {score}/100. "
        f"Nivel de riesgo: {nivel}. "
    )

    # Add contextual notes based on nivel
    if nivel == "Rojo":
        explanation += (
            "ACCION REQUERIDA: Este siniestro requiere revisión prioritaria por el "
            "equipo de investigación de fraude. Se recomienda suspender el pago hasta "
            "completar la investigación."
        )
    elif nivel == "Amarillo":
        explanation += (
            "Este siniestro presenta indicadores moderados de riesgo. "
            "Se recomienda documentación adicional y revisión por el analista asignado."
        )
    else:
        explanation += (
            "Los indicadores activos son de bajo impacto. "
            "Continuar con el proceso normal de ajuste."
        )

    return explanation


def apply_fraud_rules(df: pd.DataFrame) -> pd.DataFrame:
    """
    Orchestrate the full fraud rule application pipeline.

    Steps:
    1. Apply rule flags (binary indicators per rule)
    2. Compute rule scores and risk levels
    3. Generate alert lists and explanations per row
    4. Add mensaje_etico_reglas disclaimer column

    Args:
        df: DataFrame with feature columns.

    Returns:
        DataFrame with all rule flags, scores, alerts, and explanations added.
    """
    print("[INFO] apply_fraud_rules: applying rule flags...")
    df = apply_rule_flags(df)

    print("[INFO] apply_fraud_rules: computing rule scores...")
    df = apply_rule_scores(df)

    print("[INFO] apply_fraud_rules: generating alert lists and explanations...")

    reglas_list = []
    alertas_list = []
    explicaciones_list = []

    for _, row in df.iterrows():
        reglas, alertas = generate_alert_lists(row)
        explicacion = generate_rules_explanation(row)
        reglas_list.append(", ".join(reglas) if reglas else "")
        alertas_list.append(" | ".join(alertas) if alertas else "")
        explicaciones_list.append(explicacion)

    df["reglas_activadas"] = reglas_list
    df["alertas_reglas"] = alertas_list
    df["explicacion_reglas"] = explicaciones_list

    # Reglas críticas activadas (comma-separated codes)
    def _criticas(reglas_str: str) -> str:
        codes = [r.strip() for r in str(reglas_str).split(",") if r.strip()]
        return ", ".join(c for c in codes if c in CRITICAL_RULE_CODES)

    df["reglas_criticas_activadas"] = df["reglas_activadas"].apply(_criticas)

    # Accion sugerida
    def _accion(row) -> str:
        criticas = str(row.get("reglas_criticas_activadas", "") or "")
        score = _safe_int(row.get("score_heuristico", 0))
        if criticas.strip() and any(c in criticas for c in ("RF-02", "RF-03", "RF-04")):
            return "Escalar a revisión antifraude especializada."
        if score > 75 or criticas.strip():
            return "Escalar a revisión antifraude especializada."
        if score > 40:
            return "Escalar a revisión documental."
        return "Continuar flujo normal."

    df["accion_sugerida"] = df.apply(_accion, axis=1)

    df["mensaje_ia"] = (
        "Esta evaluación es una alerta para revisión humana, "
        "no una acusación automática ni una decisión de rechazo."
    )

    # Keep legacy column for backward compat
    df["mensaje_etico_reglas"] = df["mensaje_ia"]

    nivel_dist = df["nivel_reglas"].value_counts().to_dict()
    print(f"[INFO] apply_fraud_rules: score distribution — {nivel_dist}")

    return df
