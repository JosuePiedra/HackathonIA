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

from src.rules.catalog_rules import RULES, CRITICAL_RULE_CODES, compute_graduated_points


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


def _make_alerta(id_siniestro: str, code: str, variable: str, valor: str, explicacion: str, puntos: int = 0) -> Dict:
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
        "puntos": float(puntos),
    }


def evaluate_rules(sin: Dict, vr: Dict, proveedor: Dict) -> List[Dict]:
    """
    Evaluate all fraud rules against a siniestro row.
    Returns list of alerta_regla dicts with graduated puntos.
    """
    id_sin = sin["id_siniestro"]
    cobertura = str(sin.get("cobertura") or "").lower()
    descripcion = str(sin.get("descripcion") or "").lower()
    dias_rep = vr.get("dias_entre_ocurrencia_reporte")
    alertas: List[Dict] = []

    def add(code: str, variable: str, valor: str, explicacion: str, puntos: int):
        alertas.append(_make_alerta(id_sin, code, variable, valor, explicacion, puntos))

    # RF-01: Cobertura pérdida total por robo
    if "pérdida total" in cobertura or "perdida total" in cobertura or "robo total" in cobertura:
        add("RF-01", "cobertura", sin.get("cobertura", ""),
            "Cobertura de pérdida total o robo. Requiere validación exhaustiva.",
            puntos=12)

    # RF-02: Falsificación documental (documentos_inconsistentes > 0)
    incon = _safe_int(vr.get("documentos_inconsistentes"))
    if incon > 0:
        add("RF-02", "documentos_inconsistentes", str(incon),
            "Se detectaron documentos con inconsistencias en el expediente.",
            puntos=18)

    # RF-03: Lista restrictiva + casos observados (graduated)
    if _safe_bool(proveedor.get("en_lista_restrictiva")):
        add("RF-03", "en_lista_restrictiva", "true",
            "El proveedor asociado aparece en la lista restrictiva.",
            puntos=10)
    elif _safe_float(proveedor.get("porcentaje_casos_observados", 0)) > 0:
        casos_obs = _safe_int(
            _safe_float(proveedor.get("porcentaje_casos_observados", 0)) *
            _safe_int(proveedor.get("reclamos_asociados", 0)) / 100
        )
        if casos_obs > 2:
            add("RF-03", "porcentaje_casos_observados",
                str(proveedor.get("porcentaje_casos_observados")),
                "Proveedor con más de 2 casos observados este año.",
                puntos=5)

    # RF-04: Dinámica físicamente imposible
    keywords_imposible = [
        "imposible", "inexplicable", "sin frenos", "sin control",
        "desapareció", "nadie vio", "sin testigos", "relato ilógico",
        "volcadura", "múltiple", "frontal", "posterior"
    ]
    matching = [kw for kw in keywords_imposible if kw in descripcion]
    if matching:
        pts = 15 if any(k in matching for k in ["imposible", "inexplicable", "sin frenos"]) else 6
        add("RF-04", "descripcion", descripcion[:80],
            "La narrativa contiene indicios de dinámica físicamente imposible o accidente sospechoso.",
            puntos=pts)

    # RF-05: Borde de vigencia — GRADUATED (≤10 días: 8pts, 11-30 días: 4pts)
    d_inicio = vr.get("dias_desde_inicio_poliza")
    d_fin = vr.get("dias_desde_fin_poliza")
    min_dias = None
    if d_inicio is not None and d_fin is not None:
        min_dias = min(int(d_inicio), int(d_fin))
    elif d_inicio is not None:
        min_dias = int(d_inicio)
    elif d_fin is not None:
        min_dias = int(d_fin)

    if min_dias is not None:
        pts = compute_graduated_points("RF-05", min_dias)
        if pts > 0:
            add("RF-05", "borde_vigencia",
                f"dias_inicio={d_inicio} dias_fin={d_fin}",
                f"Siniestro ocurrido a {min_dias} día(s) del inicio/fin de vigencia.",
                puntos=pts)

    # RF-06: Demora atípica en denuncia de robo — GRADUATED (>2 días=8pts, 1-2 días=4pts)
    if "robo" in cobertura and dias_rep is not None:
        pts = compute_graduated_points("RF-06", dias_rep)
        if pts > 0:
            add("RF-06", "dias_entre_ocurrencia_reporte", str(dias_rep),
                f"Robo reportado con demora de {dias_rep} día(s) desde la ocurrencia.",
                puntos=pts)

    # RF-TEMP-01: Reporte tardío — GRADUATED (>7 días=5pts, 4-7 días=3pts)
    if dias_rep is not None:
        pts = compute_graduated_points("RF-TEMP-01", dias_rep)
        if pts > 0:
            add("RF-TEMP-01", "dias_entre_ocurrencia_reporte", str(dias_rep),
                f"Siniestro reportado {dias_rep} día(s) después de la ocurrencia.",
                puntos=pts)

    # RF-MONTO-01: Monto cercano a suma asegurada
    if _safe_bool(vr.get("monto_atipico")):
        ratio = _safe_float(vr.get("ratio_monto_suma_asegurada"))
        add("RF-MONTO-01", "ratio_monto_suma_asegurada", str(ratio),
            f"Monto reclamado representa {ratio:.0%} de la suma asegurada.",
            puntos=4)

    # RF-DOC-01: Documentos incompletos
    faltantes = _safe_int(vr.get("documentos_faltantes"))
    if faltantes > 0:
        add("RF-DOC-01", "documentos_faltantes", str(faltantes),
            f"Faltan {faltantes} documento(s) obligatorio(s) en el expediente.",
            puntos=4)

    # RF-DOC-02: Documentos inconsistentes (solo si no activó RF-02)
    if incon > 0 and not any(a["codigo_regla"] == "RF-02" for a in alertas):
        add("RF-DOC-02", "documentos_inconsistentes", str(incon),
            "Existen inconsistencias en los documentos del expediente.",
            puntos=10)

    # RF-PROV-01: Proveedor recurrente
    if _safe_bool(vr.get("proveedor_recurrente")):
        add("RF-PROV-01", "frecuencia_proveedor",
            str(vr.get("frecuencia_proveedor")),
            "Proveedor asociado a más de 10 siniestros.",
            puntos=5)

    # RF-FREC-01: Alta frecuencia por asegurado — GRADUATED
    hist_a = _safe_int(vr.get("historial_siniestros_asegurado"))
    pts = compute_graduated_points("RF-FREC-01", hist_a)
    if pts > 0:
        add("RF-FREC-01", "historial_siniestros_asegurado", str(hist_a),
            f"Asegurado con {hist_a} siniestro(s) en el período evaluado.",
            puntos=pts)

    # RF-FREC-02: Alta frecuencia por vehículo — GRADUATED
    hist_v = _safe_int(vr.get("historial_siniestros_vehiculo"))
    pts = compute_graduated_points("RF-FREC-02", hist_v)
    if pts > 0:
        add("RF-FREC-02", "historial_siniestros_vehiculo", str(hist_v),
            f"Vehículo con {hist_v} siniestro(s) en el período evaluado.",
            puntos=pts)

    # RF-FREC-03: Alta frecuencia por conductor — GRADUATED
    hist_c = _safe_int(vr.get("historial_siniestros_conductor"))
    pts = compute_graduated_points("RF-FREC-03", hist_c)
    if pts > 0:
        add("RF-FREC-03", "historial_siniestros_conductor", str(hist_c),
            f"Conductor con {hist_c} siniestro(s) en el período evaluado.",
            puntos=pts)

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

    # RF-07: narrativa clonada — exact match check against existing records
    desc = str(sin.get("descripcion") or "").strip()
    if len(desc) > 10:
        res = client.table("siniestro").select("id_siniestro", count="exact").neq(
            "id_siniestro", id_siniestro
        ).eq("descripcion", sin.get("descripcion")).execute()
        if (res.count or 0) > 0:
            alertas.append(_make_alerta(
                id_siniestro, "RF-07", "descripcion", desc[:80],
                "La narrativa es idéntica a otra denuncia del dataset.",
                puntos=8,
            ))

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
