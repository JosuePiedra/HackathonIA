"""
Orchestrates the full upsert sequence to Supabase.

Insertion order respects FK dependencies:
asegurado → poliza → vehiculo → proveedor → siniestro
→ documento → variable_riesgo → alerta_regla → score_siniestro → mapeo_esquema
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, List

import pandas as pd

from . import repository as repo


def _gen_id(prefix: str, n: int) -> str:
    return f"{prefix}-{str(n).zfill(6)}"


def _safe_val(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    return val


def _row_to_dict(row: pd.Series, cols: List[str]) -> Dict:
    return {c: _safe_val(row.get(c)) for c in cols if c in row.index}


# ── Asegurado ──────────────────────────────────────────────

def build_asegurado_rows(df: pd.DataFrame, source_type: str) -> List[Dict]:
    cols = ["id_asegurado", "segmento", "antiguedad_cliente", "ciudad",
            "numero_polizas", "reclamos_ultimos_12_meses", "mora_actual",
            "score_cliente_simulado"]
    rows = []
    seen = set()
    for i, (_, row) in enumerate(df.iterrows()):
        aid = _safe_val(row.get("id_asegurado"))
        if not aid:
            if source_type in ("synthetic", "demo"):
                aid = _gen_id("ASEG", i + 1)
            else:
                continue
        if aid in seen:
            continue
        seen.add(aid)
        r = _row_to_dict(row, cols)
        r["id_asegurado"] = aid
        rows.append(r)
    return rows


# ── Poliza ─────────────────────────────────────────────────

def build_poliza_rows(df: pd.DataFrame, source_type: str) -> List[Dict]:
    cols = ["id_poliza", "id_asegurado", "ramo", "fecha_inicio", "fecha_fin",
            "prima", "suma_asegurada", "deducible", "canal_venta", "ciudad",
            "estado_poliza"]
    rows = []
    seen = set()
    for i, (_, row) in enumerate(df.iterrows()):
        pid = _safe_val(row.get("id_poliza"))
        if not pid:
            if source_type in ("synthetic", "demo"):
                pid = _gen_id("POL", i + 1)
            else:
                continue
        if pid in seen:
            continue
        seen.add(pid)
        r = _row_to_dict(row, cols)
        r["id_poliza"] = pid
        # canonical uses fecha_inicio_poliza / fecha_fin_poliza
        if "fecha_inicio" not in r or r["fecha_inicio"] is None:
            r["fecha_inicio"] = _safe_val(row.get("fecha_inicio_poliza"))
        if "fecha_fin" not in r or r["fecha_fin"] is None:
            r["fecha_fin"] = _safe_val(row.get("fecha_fin_poliza"))
        rows.append(r)
    return rows


# ── Vehiculo ───────────────────────────────────────────────

def build_vehiculo_rows(df: pd.DataFrame, source_type: str) -> List[Dict]:
    cols = ["id_vehiculo", "id_asegurado", "placa_anonimizada", "chasis_anonimizado",
            "motor_anonimizado", "marca", "modelo", "anio", "tipo_vehiculo",
            "valor_referencial", "uso_vehiculo"]
    rows = []
    seen = set()
    for i, (_, row) in enumerate(df.iterrows()):
        vid = _safe_val(row.get("id_vehiculo"))
        if not vid:
            if source_type in ("synthetic", "demo"):
                vid = _gen_id("VEH", i + 1)
            else:
                continue
        if vid in seen:
            continue
        seen.add(vid)
        r = _row_to_dict(row, cols)
        r["id_vehiculo"] = vid
        rows.append(r)
    return rows


# ── Proveedor ──────────────────────────────────────────────

def build_proveedor_rows(df: pd.DataFrame, source_type: str) -> List[Dict]:
    cols = ["id_proveedor", "nombre_proveedor_sintetico", "tipo", "ciudad",
            "reclamos_asociados", "monto_promedio_reclamado",
            "porcentaje_casos_observados", "antiguedad",
            "en_lista_restrictiva", "nivel_observacion"]
    rows = []
    seen = set()
    for i, (_, row) in enumerate(df.iterrows()):
        prid = _safe_val(row.get("id_proveedor"))
        if not prid:
            if source_type in ("synthetic", "demo"):
                prid = _gen_id("PROV", i + 1)
            else:
                continue
        if prid in seen:
            continue
        seen.add(prid)
        r = _row_to_dict(row, cols)
        r["id_proveedor"] = prid
        r.setdefault("en_lista_restrictiva", False)
        rows.append(r)
    return rows


# ── Siniestro ──────────────────────────────────────────────

def build_siniestro_rows(df: pd.DataFrame, source_type: str) -> List[Dict]:
    cols = ["id_siniestro", "id_poliza", "id_asegurado", "id_vehiculo",
            "id_proveedor", "id_conductor", "ramo", "cobertura", "estado",
            "sucursal", "ciudad", "provincia", "fecha_ocurrencia", "fecha_reporte",
            "monto_reclamado", "monto_estimado", "monto_pagado",
            "descripcion", "documentos_completos", "etiqueta_fraude_simulada",
            "source_file", "mapping_confidence", "data_quality_score"]
    rows = []
    seen = set()
    for i, (_, row) in enumerate(df.iterrows()):
        sid = _safe_val(row.get("id_siniestro"))
        if not sid:
            if source_type in ("synthetic", "demo"):
                sid = _gen_id("SIN", i + 1)
            else:
                continue
        if sid in seen:
            continue
        seen.add(sid)
        r = _row_to_dict(row, cols)
        r["id_siniestro"] = sid
        rows.append(r)
    return rows


# ── Documento ──────────────────────────────────────────────

def build_documento_rows(df: pd.DataFrame) -> List[Dict]:
    rows = []
    for i, (_, row) in enumerate(df.iterrows()):
        sid = _safe_val(row.get("id_siniestro"))
        if not sid:
            continue
        rows.append({
            "id_documento": str(uuid.uuid4()),
            "id_siniestro": sid,
            "entregado": _safe_val(row.get("documentos_completos")) or False,
            "inconsistencia_detectada": bool(_safe_val(row.get("documentos_inconsistentes", 0))),
            "obligatorio": False,
        })
    return rows


# ── Variable riesgo ────────────────────────────────────────

def build_variable_riesgo_rows(features_df: pd.DataFrame) -> List[Dict]:
    cols = [
        "id_siniestro",
        "dias_desde_inicio_poliza", "dias_desde_fin_poliza",
        "dias_entre_ocurrencia_reporte",
        "ratio_monto_suma_asegurada", "ratio_monto_estimado",
        "diferencia_monto_reclamado_estimado",
        "historial_siniestros_asegurado", "historial_siniestros_vehiculo",
        "historial_siniestros_conductor", "frecuencia_proveedor",
        "documentos_faltantes", "documentos_inconsistentes",
        "proveedor_recurrente", "monto_atipico", "reporte_tardio", "borde_vigencia",
    ]
    rows = []
    for _, row in features_df.iterrows():
        sid = _safe_val(row.get("id_siniestro"))
        if not sid:
            continue
        r = _row_to_dict(row, cols)
        r["id_siniestro"] = sid
        # Convert numpy booleans to Python bool
        for bool_col in ("proveedor_recurrente", "monto_atipico", "reporte_tardio", "borde_vigencia"):
            if bool_col in r and r[bool_col] is not None:
                r[bool_col] = bool(r[bool_col])
        rows.append(r)
    return rows


# ── Alerta regla ───────────────────────────────────────────

def build_alerta_regla_rows(scored_df: pd.DataFrame) -> List[Dict]:
    """Build alerta_regla rows from scored DataFrame.

    The scored_df must have 'reglas_activadas' (comma-separated codes) and
    'alertas_reglas' (pipe-separated descriptions).
    """
    from ..rules.catalog_rules import RULES

    rows = []
    for _, row in scored_df.iterrows():
        sid = _safe_val(row.get("id_siniestro"))
        if not sid:
            continue
        reglas_str = str(row.get("reglas_activadas", "") or "")
        if not reglas_str.strip():
            continue
        for code in [r.strip() for r in reglas_str.split(",") if r.strip()]:
            rule = RULES.get(code, {})
            rows.append({
                "id_alerta": str(uuid.uuid4()),
                "id_siniestro": sid,
                "codigo_regla": code,
                "nombre_regla": rule.get("name", code),
                "clasificacion": rule.get("clasificacion", "Amarillo"),
                "severidad": rule.get("severity", "Media"),
                "variable_evaluada": rule.get("flag_column", ""),
                "explicacion": rule.get("description", "")[:500] if rule.get("description") else "",
            })
    return rows


# ── Score siniestro ────────────────────────────────────────

def build_score_siniestro_rows(scored_df: pd.DataFrame) -> List[Dict]:
    rows = []
    for _, row in scored_df.iterrows():
        sid = _safe_val(row.get("id_siniestro"))
        if not sid:
            continue
        rows.append({
            "id_siniestro": sid,
            "score_heuristico": _safe_val(row.get("score_heuristico")),
            "prediccion_ml": None,
            "probabilidad_ml": None,
            "score_final": None,
            "nivel_riesgo": _safe_val(row.get("nivel_riesgo")),
            "reglas_criticas_activadas": _safe_val(row.get("reglas_criticas_activadas", "")),
            "factores_principales": _safe_val(row.get("alertas_reglas", "")),
            "explicacion_final": _safe_val(row.get("explicacion_reglas", "")),
            "accion_sugerida": _safe_val(row.get("accion_sugerida", "")),
            "mensaje_ia": "Esta evaluación es una alerta para revisión humana, no una acusación automática ni una decisión de rechazo.",
            "version_modelo": "heuristic-v1.0",
        })
    return rows


# ── Mapeo esquema ──────────────────────────────────────────

def build_mapeo_esquema_rows(
    source_file: str,
    column_mapping: dict,
    column_profiles: list,
    mapping_confidence: float,
    mapping_origin: str = "llm",
    validation_status: str = "valid",
) -> List[Dict]:
    profile_map = {p["name"]: p for p in column_profiles}
    rows = []
    for src_col, canonical_col in column_mapping.items():
        profile = profile_map.get(src_col, {})
        rows.append({
            "id_mapping": str(uuid.uuid4()),
            "source_file": source_file,
            "source_column": src_col,
            "canonical_column": canonical_col,
            "detected_type": profile.get("detected_type", ""),
            "mapping_confidence": mapping_confidence,
            "mapping_origin": mapping_origin,
            "validation_status": validation_status,
        })
    return rows


# ── Full upsert sequence ───────────────────────────────────

def persist_all(
    canonical_df: pd.DataFrame,
    features_df: pd.DataFrame,
    scored_df: pd.DataFrame,
    source_type: str,
    source_file: str,
    column_mapping: dict,
    column_profiles: list,
    mapping_confidence: float,
    mapping_origin: str = "llm",
    validation_status: str = "valid",
) -> Dict[str, int]:
    results: Dict[str, int] = {}

    print("[SUPABASE] Upserting asegurado...")
    results["asegurado"] = repo.upsert_asegurado(build_asegurado_rows(canonical_df, source_type))

    print("[SUPABASE] Upserting poliza...")
    results["poliza"] = repo.upsert_poliza(build_poliza_rows(canonical_df, source_type))

    print("[SUPABASE] Upserting vehiculo...")
    results["vehiculo"] = repo.upsert_vehiculo(build_vehiculo_rows(canonical_df, source_type))

    print("[SUPABASE] Upserting proveedor...")
    results["proveedor"] = repo.upsert_proveedor(build_proveedor_rows(canonical_df, source_type))

    print("[SUPABASE] Upserting siniestro...")
    results["siniestro"] = repo.upsert_siniestro(build_siniestro_rows(canonical_df, source_type))

    print("[SUPABASE] Upserting documento...")
    results["documento"] = repo.upsert_documento(build_documento_rows(canonical_df))

    print("[SUPABASE] Upserting variable_riesgo...")
    results["variable_riesgo"] = repo.upsert_variable_riesgo(build_variable_riesgo_rows(features_df))

    print("[SUPABASE] Upserting alerta_regla...")
    results["alerta_regla"] = repo.upsert_alerta_regla(build_alerta_regla_rows(scored_df))

    print("[SUPABASE] Upserting score_siniestro...")
    results["score_siniestro"] = repo.upsert_score_siniestro(build_score_siniestro_rows(scored_df))

    print("[SUPABASE] Upserting mapeo_esquema...")
    results["mapeo_esquema"] = repo.upsert_mapeo_esquema(
        build_mapeo_esquema_rows(
            source_file, column_mapping, column_profiles,
            mapping_confidence, mapping_origin, validation_status,
        )
    )

    return results
