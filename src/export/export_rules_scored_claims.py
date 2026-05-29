"""
Export module for the rules-scored claims dataset.

Handles writing final output files and data dictionaries.
"""

import json
import os
from typing import Dict, List

import pandas as pd

from ..mapping.canonical_schema import CANONICAL_FIELDS
from ..rules.catalog_rules import RULES
from ..rules.fraud_rules import FLAG_TO_RULE


# Columns to include in the final export (ordered)
EXPORT_COLUMNS_PRIORITY = [
    # Identifiers
    "id_siniestro", "id_poliza", "id_asegurado", "id_vehiculo", "id_proveedor", "id_conductor",
    # Classification
    "ramo", "cobertura", "estado", "ciudad", "provincia", "sucursal",
    # Dates
    "fecha_ocurrencia", "fecha_reporte", "fecha_inicio_poliza", "fecha_fin_poliza",
    # Financial
    "monto_reclamado", "monto_estimado", "monto_pagado", "suma_asegurada", "deducible",
    # Content
    "descripcion", "documentos_completos",
    # Date features
    "dias_desde_inicio_poliza", "dias_desde_fin_poliza", "dias_entre_ocurrencia_reporte",
    # Amount features
    "ratio_monto_suma_asegurada", "ratio_monto_estimado", "diferencia_monto_reclamado_estimado",
    # History features
    "historial_siniestros_asegurado", "historial_siniestros_vehiculo",
    "historial_siniestros_conductor", "frecuencia_proveedor",
    # Document features
    "documentos_faltantes", "documentos_inconsistentes",
    # Boolean features
    "proveedor_recurrente", "monto_atipico", "reporte_tardio", "borde_vigencia",
    # Rule flags
    "flag_borde_vigencia", "flag_robo_denuncia_tardia", "flag_reporte_tardio",
    "flag_monto_atipico", "flag_documentos_incompletos", "flag_documentos_inconsistentes",
    "flag_proveedor_recurrente", "flag_proveedor_lista_restrictiva",
    "flag_alta_frecuencia_asegurado", "flag_alta_frecuencia_vehiculo",
    "flag_alta_frecuencia_conductor", "flag_sin_tercero_identificado",
    "flag_dinamica_sospechosa", "flag_narrativa_clonada", "flag_cobertura_robo_total",
    # Scores and levels
    "score_reglas", "nivel_reglas",
    # Alerts and explanations
    "reglas_activadas", "alertas_reglas", "explicacion_reglas",
    # Ground truth (synthetic only)
    "etiqueta_fraude_simulada",
    # Metadata
    "source_file", "mapping_confidence", "data_quality_score",
    "limitacion_registro", "mensaje_etico_reglas",
]


def export_rules_scored_claims(df: pd.DataFrame, path: str) -> None:
    """
    Export the rules-scored claims DataFrame to CSV.

    Columns are ordered per EXPORT_COLUMNS_PRIORITY, with any remaining
    columns appended at the end.

    Args:
        df: DataFrame with all rule flags, scores, and explanations.
        path: Absolute path for the output CSV file.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)

    # Order columns: priority list first, then remaining
    ordered = [c for c in EXPORT_COLUMNS_PRIORITY if c in df.columns]
    remaining = [c for c in df.columns if c not in ordered]
    final_cols = ordered + remaining

    df_export = df[final_cols].copy()
    df_export.to_csv(path, index=False, encoding="utf-8")

    total = len(df_export)
    rojo = (df_export.get("nivel_reglas", pd.Series()) == "Rojo").sum() if "nivel_reglas" in df_export.columns else 0
    amarillo = (df_export.get("nivel_reglas", pd.Series()) == "Amarillo").sum() if "nivel_reglas" in df_export.columns else 0
    verde = (df_export.get("nivel_reglas", pd.Series()) == "Verde").sum() if "nivel_reglas" in df_export.columns else 0

    print(f"[INFO] export_rules_scored_claims: {total} records exported to: {path}")
    print(f"[INFO] Risk distribution — Rojo: {rojo} | Amarillo: {amarillo} | Verde: {verde}")


def export_data_dictionary(columns_info: List[Dict], path: str) -> None:
    """
    Export a data dictionary as a JSON file.

    Args:
        columns_info: List of dicts with column metadata.
                      Each dict should have: name, type, description, source.
        path: Absolute path for the output JSON file.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)

    # Build comprehensive dictionary from canonical schema + rules + features
    full_dict = []

    # Canonical fields
    for field, meta in CANONICAL_FIELDS.items():
        full_dict.append({
            "name": field,
            "type": meta.get("type", "string"),
            "description": meta.get("description", ""),
            "required": meta.get("required", False),
            "source": "canonical_schema",
            "category": "canonical",
        })

    # Feature columns
    feature_entries = [
        {"name": "dias_desde_inicio_poliza", "type": "numeric", "description": "Días entre inicio de póliza y ocurrencia del siniestro.", "required": False, "source": "computed", "category": "feature_temporal"},
        {"name": "dias_desde_fin_poliza", "type": "numeric", "description": "Días entre ocurrencia del siniestro y fin de póliza (negativo si ocurrió después del vencimiento).", "required": False, "source": "computed", "category": "feature_temporal"},
        {"name": "dias_entre_ocurrencia_reporte", "type": "numeric", "description": "Días transcurridos entre la ocurrencia del siniestro y su reporte a la aseguradora.", "required": False, "source": "computed", "category": "feature_temporal"},
        {"name": "ratio_monto_suma_asegurada", "type": "numeric", "description": "Razón entre monto reclamado y suma asegurada. Valores >= 0.9 son atípicos.", "required": False, "source": "computed", "category": "feature_financiero"},
        {"name": "ratio_monto_estimado", "type": "numeric", "description": "Razón entre monto reclamado y monto estimado por el ajustador.", "required": False, "source": "computed", "category": "feature_financiero"},
        {"name": "diferencia_monto_reclamado_estimado", "type": "numeric", "description": "Diferencia absoluta entre monto reclamado y estimado.", "required": False, "source": "computed", "category": "feature_financiero"},
        {"name": "historial_siniestros_asegurado", "type": "numeric", "description": "Número total de siniestros del asegurado en el dataset analizado.", "required": False, "source": "computed", "category": "feature_frecuencia"},
        {"name": "historial_siniestros_vehiculo", "type": "numeric", "description": "Número total de siniestros del vehículo en el dataset.", "required": False, "source": "computed", "category": "feature_frecuencia"},
        {"name": "historial_siniestros_conductor", "type": "numeric", "description": "Número total de siniestros del conductor en el dataset.", "required": False, "source": "computed", "category": "feature_frecuencia"},
        {"name": "frecuencia_proveedor", "type": "numeric", "description": "Número total de siniestros asociados al proveedor de servicios.", "required": False, "source": "computed", "category": "feature_proveedor"},
    ]
    full_dict.extend(feature_entries)

    # Rule flag columns
    for flag_col, (rule_code, points) in FLAG_TO_RULE.items():
        rule = RULES.get(rule_code, {})
        full_dict.append({
            "name": flag_col,
            "type": "integer",
            "description": f"Indicador de regla {rule_code}: {rule.get('name', '')}. Valor 1 = regla activada. Puntaje: {points} pts.",
            "required": False,
            "source": "rule_engine",
            "category": "flag_regla",
        })

    # Score columns
    full_dict.extend([
        {"name": "score_reglas", "type": "integer", "description": "Puntaje total de riesgo basado en reglas (0-100). Suma de puntos de todas las reglas activadas.", "required": False, "source": "rule_engine", "category": "score"},
        {"name": "nivel_reglas", "type": "string", "description": "Nivel de riesgo: Verde (score<20), Amarillo (20-39), Rojo (>=40).", "required": False, "source": "rule_engine", "category": "score"},
        {"name": "reglas_activadas", "type": "string", "description": "Códigos de las reglas activadas para este siniestro, separados por coma.", "required": False, "source": "rule_engine", "category": "score"},
        {"name": "alertas_reglas", "type": "string", "description": "Descripciones de las alertas generadas por cada regla activada.", "required": False, "source": "rule_engine", "category": "score"},
        {"name": "explicacion_reglas", "type": "string", "description": "Explicación en lenguaje natural del puntaje y nivel de riesgo asignado.", "required": False, "source": "rule_engine", "category": "score"},
        {"name": "mensaje_etico_reglas", "type": "string", "description": "Aviso ético recordando que el sistema es de apoyo y no reemplaza juicio humano.", "required": False, "source": "rule_engine", "category": "metadata"},
    ])

    # Merge with any extra columns_info provided
    existing_names = {entry["name"] for entry in full_dict}
    for col_info in columns_info:
        if col_info.get("name") not in existing_names:
            full_dict.append(col_info)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(full_dict, f, ensure_ascii=False, indent=2)

    print(f"[INFO] export_data_dictionary: {len(full_dict)} fields documented at: {path}")
