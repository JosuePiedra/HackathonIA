"""
Proceso 2: Aplicar reglas determinísticas y generar alerta_regla para un siniestro.

Requiere que variable_riesgo ya exista para el siniestro.

Puede ejecutarse de forma autónoma:
    python -m src.realtime.process_rules <id_siniestro>
"""

from __future__ import annotations

import sys
import os
import uuid
from typing import Dict, Any, List, Optional

from dotenv import load_dotenv

load_dotenv()

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)

from src.rules.catalog_rules import RULES, CRITICAL_RULE_CODES


def _safe_bool(val) -> bool:
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    return str(val).lower() in ("true", "1", "yes")


def _safe_int(val, default: int = 0) -> int:
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _fetch_siniestro(client, id_siniestro: str) -> Optional[Dict]:
    res = client.table("siniestro").select("*").eq("id_siniestro", id_siniestro).execute()
    return res.data[0] if res.data else None


def _fetch_variable_riesgo(client, id_siniestro: str) -> Optional[Dict]:
    res = client.table("variable_riesgo").select("*").eq("id_siniestro", id_siniestro).execute()
    return res.data[0] if res.data else None


def _fetch_proveedor(client, id_proveedor: Optional[str]) -> Dict:
    if not id_proveedor:
        return {}
    res = client.table("proveedor").select("*").eq("id_proveedor", id_proveedor).execute()
    return res.data[0] if res.data else {}


def _make_alerta(id_siniestro: str, code: str, variable: str, valor: str, explicacion: str) -> Dict:
    rule = RULES[code]
    return {
        "id_alerta": str(uuid.uuid4()),
        "id_siniestro": id_siniestro,
        "codigo_regla": code,
        "nombre_regla": rule["name"],
        "clasificacion": rule["clasificacion"],
        "severidad": rule["severity"],
        "variable_evaluada": variable,
        "valor_detectado": str(valor)[:200],
        "explicacion": explicacion[:500],
    }


def evaluate_rules(sin: Dict, vr: Dict, proveedor: Dict) -> List[Dict]:
    """
    Evaluate all fraud rules against a siniestro row.

    Returns list of alerta_regla dicts to insert.
    """
    id_sin = sin["id_siniestro"]
    cobertura = str(sin.get("cobertura") or "").lower()
    descripcion = str(sin.get("descripcion") or "").lower()
    alertas: List[Dict] = []

    def add(code: str, variable: str, valor: str, explicacion: str):
        alertas.append(_make_alerta(id_sin, code, variable, valor, explicacion))

    # RF-01: Cobertura pérdida total por robo
    if "pérdida total" in cobertura or "perdida total" in cobertura or "robo total" in cobertura:
        add("RF-01", "cobertura", sin.get("cobertura", ""),
            "Cobertura de pérdida total o robo. Requiere validación exhaustiva.")

    # RF-02: Falsificación documental (documentos_inconsistentes > 0)
    incon = _safe_int(vr.get("documentos_inconsistentes"))
    if incon > 0:
        add("RF-02", "documentos_inconsistentes", str(incon),
            "Se detectaron documentos con inconsistencias en el expediente.")

    # RF-03: Lista restrictiva (proveedor)
    if _safe_bool(proveedor.get("en_lista_restrictiva")):
        add("RF-03", "en_lista_restrictiva", "true",
            "El proveedor asociado aparece en la lista restrictiva.")

    # RF-04: Dinámica físicamente imposible
    keywords_imposible = ["imposible", "inexplicable", "sin frenos", "sin control",
                          "desapareció", "nadie vio", "sin testigos"]
    if any(kw in descripcion for kw in keywords_imposible):
        add("RF-04", "descripcion", descripcion[:80],
            "La narrativa contiene indicios de dinámica físicamente imposible.")

    # RF-05: Borde de vigencia (días ≤ 2)
    d_inicio = vr.get("dias_desde_inicio_poliza")
    d_fin = vr.get("dias_desde_fin_poliza")
    if (d_inicio is not None and d_inicio <= 2) or (d_fin is not None and d_fin <= 2):
        add("RF-05", "borde_vigencia",
            f"dias_inicio={d_inicio} dias_fin={d_fin}",
            "Siniestro ocurrido muy cerca del inicio o fin de vigencia.")

    # RF-06: Demora atípica en denuncia de robo
    dias_rep = vr.get("dias_entre_ocurrencia_reporte")
    if "robo" in cobertura and dias_rep is not None and dias_rep > 4:
        add("RF-06", "dias_entre_ocurrencia_reporte", str(dias_rep),
            "Robo reportado con demora superior a 4 días.")

    # RF-07: Narrativa clonada — verificar en Supabase si hay otra con misma descripción
    # (manejado por el listener, aquí solo se activa si el campo flag_narrativa_clonada existe)
    # No se puede verificar sin acceso a la DB desde aquí sin parámetro extra, se omite en standalone

    # RF-TEMP-01: Reporte tardío
    if _safe_bool(vr.get("reporte_tardio")):
        add("RF-TEMP-01", "dias_entre_ocurrencia_reporte", str(dias_rep),
            "Siniestro reportado más de 7 días después de la ocurrencia.")

    # RF-MONTO-01: Monto cercano a suma asegurada
    if _safe_bool(vr.get("monto_atipico")):
        add("RF-MONTO-01", "ratio_monto_suma_asegurada",
            str(vr.get("ratio_monto_suma_asegurada")),
            "Monto reclamado ≥ 90% de la suma asegurada.")

    # RF-DOC-01: Documentos incompletos
    faltantes = _safe_int(vr.get("documentos_faltantes"))
    if faltantes > 0:
        add("RF-DOC-01", "documentos_faltantes", str(faltantes),
            "Faltan documentos obligatorios en el expediente.")

    # RF-DOC-02: Documentos inconsistentes (operativa, sin duplicar RF-02)
    if incon > 0 and not any(a["codigo_regla"] == "RF-02" for a in alertas):
        add("RF-DOC-02", "documentos_inconsistentes", str(incon),
            "Existen inconsistencias en los documentos del expediente.")

    # RF-PROV-01: Proveedor recurrente
    if _safe_bool(vr.get("proveedor_recurrente")):
        add("RF-PROV-01", "frecuencia_proveedor",
            str(vr.get("frecuencia_proveedor")),
            "Proveedor asociado a más de 10 siniestros.")

    # RF-FREC-01
    if _safe_int(vr.get("historial_siniestros_asegurado")) >= 3:
        add("RF-FREC-01", "historial_siniestros_asegurado",
            str(vr.get("historial_siniestros_asegurado")),
            "Asegurado con 3 o más siniestros en el período.")

    # RF-FREC-02
    if _safe_int(vr.get("historial_siniestros_vehiculo")) >= 3:
        add("RF-FREC-02", "historial_siniestros_vehiculo",
            str(vr.get("historial_siniestros_vehiculo")),
            "Vehículo asociado a 3 o más siniestros en el período.")

    # RF-FREC-03
    if _safe_int(vr.get("historial_siniestros_conductor")) >= 3:
        add("RF-FREC-03", "historial_siniestros_conductor",
            str(vr.get("historial_siniestros_conductor")),
            "Conductor asociado a 3 o más siniestros en el período.")

    return alertas


def run(id_siniestro: str, client=None) -> List[Dict]:
    """
    Evaluate rules for one siniestro, delete old alerts, insert new ones.

    Returns list of inserted alerta_regla rows.
    """
    if client is None:
        from src.persistence.supabase_client import get_client
        client = get_client()

    sin = _fetch_siniestro(client, id_siniestro)
    if not sin:
        raise ValueError(f"Siniestro {id_siniestro} not found.")

    vr = _fetch_variable_riesgo(client, id_siniestro)
    if not vr:
        print(f"[rules] variable_riesgo not found for {id_siniestro}; computing on-the-fly...")
        from src.realtime.process_features import run as run_features
        vr = run_features(id_siniestro, client)

    prov = _fetch_proveedor(client, sin.get("id_proveedor"))

    alertas = evaluate_rules(sin, vr, prov)

    # RF-07 verificación de narrativa clonada
    desc = str(sin.get("descripcion") or "").strip()
    if len(desc) > 10:
        res = client.table("siniestro").select("id_siniestro", count="exact").neq(
            "id_siniestro", id_siniestro
        ).eq("descripcion", sin.get("descripcion")).execute()
        if (res.count or 0) > 0:
            alertas.append(_make_alerta(
                id_siniestro, "RF-07", "descripcion", desc[:80],
                "La narrativa es idéntica a otra denuncia del dataset."
            ))

    # Borrar alertas previas y reinsertar
    client.table("alerta_regla").delete().eq("id_siniestro", id_siniestro).execute()

    if alertas:
        client.table("alerta_regla").insert(alertas).execute()

    print(f"[rules] {len(alertas)} alertas insertadas para {id_siniestro}")
    return alertas


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m src.realtime.process_rules <id_siniestro>")
        sys.exit(1)
    result = run(sys.argv[1])
    import json
    print(json.dumps(result, indent=2, default=str))
