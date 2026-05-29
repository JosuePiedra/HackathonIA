"""
Proceso 1: Calcular variable_riesgo para un siniestro.

Puede ejecutarse de forma autónoma:
    python -m src.realtime.process_features <id_siniestro>
"""

from __future__ import annotations

import sys
import os
from typing import Optional, Dict, Any

from dotenv import load_dotenv

load_dotenv()

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)


def _fetch_siniestro(client, id_siniestro: str) -> Optional[Dict]:
    res = client.table("siniestro").select("*").eq("id_siniestro", id_siniestro).execute()
    return res.data[0] if res.data else None


def _fetch_poliza(client, id_poliza: Optional[str]) -> Dict:
    if not id_poliza:
        return {}
    res = client.table("poliza").select("*").eq("id_poliza", id_poliza).execute()
    return res.data[0] if res.data else {}


def _count_siniestros(client, field: str, value: Optional[str]) -> int:
    if not value:
        return 0
    res = client.table("siniestro").select("id_siniestro", count="exact").eq(field, value).execute()
    return res.count or 0


def _fetch_doc_stats(client, id_siniestro: str) -> Dict[str, int]:
    res = client.table("documento").select("obligatorio,entregado,inconsistencia_detectada").eq(
        "id_siniestro", id_siniestro
    ).execute()
    docs = res.data or []
    faltantes = sum(1 for d in docs if d.get("obligatorio") and not d.get("entregado"))
    inconsistentes = sum(1 for d in docs if d.get("inconsistencia_detectada"))
    return {"documentos_faltantes": faltantes, "documentos_inconsistentes": inconsistentes}


def _safe_date(val) -> Optional[Any]:
    if not val:
        return None
    from datetime import date
    try:
        if isinstance(val, str):
            return date.fromisoformat(val[:10])
        return val
    except Exception:
        return None


def _date_diff_days(a, b) -> Optional[int]:
    da, db = _safe_date(a), _safe_date(b)
    if da is None or db is None:
        return None
    return (db - da).days


def _safe_float(val) -> Optional[float]:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def compute_variable_riesgo(id_siniestro: str, client=None) -> Dict[str, Any]:
    """
    Compute all variable_riesgo fields for one siniestro.

    Returns a dict ready to upsert into the variable_riesgo table.
    """
    if client is None:
        from src.persistence.supabase_client import get_client
        client = get_client()

    sin = _fetch_siniestro(client, id_siniestro)
    if not sin:
        raise ValueError(f"Siniestro {id_siniestro} not found in database.")

    pol = _fetch_poliza(client, sin.get("id_poliza"))

    # Temporal
    dias_inicio = _date_diff_days(pol.get("fecha_inicio"), sin.get("fecha_ocurrencia"))
    dias_fin = _date_diff_days(sin.get("fecha_ocurrencia"), pol.get("fecha_fin"))
    dias_reporte = _date_diff_days(sin.get("fecha_ocurrencia"), sin.get("fecha_reporte"))

    # Financiero
    monto_rec = _safe_float(sin.get("monto_reclamado"))
    monto_est = _safe_float(sin.get("monto_estimado"))
    suma_aseg = _safe_float(pol.get("suma_asegurada"))

    ratio_suma = round(monto_rec / suma_aseg, 4) if monto_rec and suma_aseg and suma_aseg > 0 else None
    ratio_est = round(monto_rec / monto_est, 4) if monto_rec and monto_est and monto_est > 0 else None
    diferencia = round((monto_rec or 0) - (monto_est or 0), 2)

    # Frecuencias históricas
    freq_aseg = _count_siniestros(client, "id_asegurado", sin.get("id_asegurado"))
    freq_veh = _count_siniestros(client, "id_vehiculo", sin.get("id_vehiculo"))
    freq_cond = _count_siniestros(client, "id_conductor", sin.get("id_conductor"))
    freq_prov = _count_siniestros(client, "id_proveedor", sin.get("id_proveedor"))

    # Documentos
    doc_stats = _fetch_doc_stats(client, id_siniestro)
    faltantes = doc_stats["documentos_faltantes"]
    inconsistentes = doc_stats["documentos_inconsistentes"]

    # Si no hay documentos en la tabla, inferir desde campo documentos_completos
    if faltantes == 0 and not sin.get("documentos_completos"):
        faltantes = 1

    # Booleanos
    proveedor_recurrente = freq_prov > 10
    monto_atipico = bool(ratio_suma and ratio_suma >= 0.90)
    reporte_tardio = bool(dias_reporte and dias_reporte > 7)
    borde_vigencia = bool(
        (dias_inicio is not None and dias_inicio <= 30)
        or (dias_fin is not None and dias_fin <= 30)
    )

    return {
        "id_siniestro": id_siniestro,
        "dias_desde_inicio_poliza": dias_inicio,
        "dias_desde_fin_poliza": dias_fin,
        "dias_entre_ocurrencia_reporte": dias_reporte,
        "ratio_monto_suma_asegurada": ratio_suma,
        "ratio_monto_estimado": ratio_est,
        "diferencia_monto_reclamado_estimado": diferencia,
        "historial_siniestros_asegurado": freq_aseg,
        "historial_siniestros_vehiculo": freq_veh,
        "historial_siniestros_conductor": freq_cond,
        "frecuencia_proveedor": freq_prov,
        "documentos_faltantes": faltantes,
        "documentos_inconsistentes": inconsistentes,
        "proveedor_recurrente": proveedor_recurrente,
        "monto_atipico": monto_atipico,
        "reporte_tardio": reporte_tardio,
        "borde_vigencia": borde_vigencia,
    }


def run(id_siniestro: str, client=None) -> Dict[str, Any]:
    """Compute and upsert variable_riesgo for one siniestro. Returns upserted row."""
    if client is None:
        from src.persistence.supabase_client import get_client
        client = get_client()

    vr = compute_variable_riesgo(id_siniestro, client)
    client.table("variable_riesgo").upsert(vr, on_conflict="id_siniestro").execute()
    print(f"[features] variable_riesgo upserted for {id_siniestro}")
    return vr


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m src.realtime.process_features <id_siniestro>")
        sys.exit(1)
    result = run(sys.argv[1])
    import json
    print(json.dumps(result, indent=2, default=str))
