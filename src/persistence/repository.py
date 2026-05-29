"""
Low-level Supabase upsert operations per table.
Each function receives a list of dicts and upserts by primary key.
"""

from typing import Any, Dict, List

from .supabase_client import get_client

_BATCH = 500


def _upsert(table: str, rows: List[Dict], on_conflict: str) -> int:
    if not rows:
        return 0
    client = get_client()
    inserted = 0
    for i in range(0, len(rows), _BATCH):
        batch = rows[i : i + _BATCH]
        client.table(table).upsert(batch, on_conflict=on_conflict).execute()
        inserted += len(batch)
    return inserted


def upsert_asegurado(rows: List[Dict]) -> int:
    return _upsert("asegurado", rows, "id_asegurado")


def upsert_poliza(rows: List[Dict]) -> int:
    return _upsert("poliza", rows, "id_poliza")


def upsert_vehiculo(rows: List[Dict]) -> int:
    return _upsert("vehiculo", rows, "id_vehiculo")


def upsert_proveedor(rows: List[Dict]) -> int:
    return _upsert("proveedor", rows, "id_proveedor")


def upsert_siniestro(rows: List[Dict]) -> int:
    return _upsert("siniestro", rows, "id_siniestro")


def upsert_documento(rows: List[Dict]) -> int:
    return _upsert("documento", rows, "id_documento")


def upsert_variable_riesgo(rows: List[Dict]) -> int:
    return _upsert("variable_riesgo", rows, "id_siniestro")


def upsert_alerta_regla(rows: List[Dict]) -> int:
    return _upsert("alerta_regla", rows, "id_alerta")


def upsert_score_siniestro(rows: List[Dict]) -> int:
    return _upsert("score_siniestro", rows, "id_siniestro")


def upsert_mapeo_esquema(rows: List[Dict]) -> int:
    return _upsert("mapeo_esquema", rows, "id_mapping")
