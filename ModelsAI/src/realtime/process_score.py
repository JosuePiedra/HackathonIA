"""
Proceso 3: Calcular score_siniestro para un siniestro.

Lee alertas de alerta_regla + puntajes de catalogo_regla y agrega el score.

Puede ejecutarse de forma autónoma:
    python -m src.realtime.process_score <id_siniestro>
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

_MENSAJE_IA = (
    "Esta evaluación es una alerta para revisión humana, "
    "no una acusación automática ni una decisión de rechazo."
)


def _fetch_alertas(client, id_siniestro: str) -> List[Dict]:
    res = client.table("alerta_regla").select("codigo_regla,nombre_regla,puntos").eq(
        "id_siniestro", id_siniestro
    ).execute()
    return res.data or []


def compute_score(alertas: List[Dict]) -> Dict[str, Any]:
    """
    Compute score fields from a list of alerta_regla dicts.
    Uses stored 'puntos' for graduated scoring; falls back to catalog if missing.

    Returns score_siniestro fields (without id_siniestro).
    """
    total_pts = 0
    criticas: List[str] = []
    factores: List[str] = []

    for alerta in alertas:
        code = alerta.get("codigo_regla", "")
        rule = RULES.get(code, {})
        # Prefer stored graduated puntos over fixed catalog points
        stored_pts = alerta.get("puntos")
        if stored_pts is not None:
            try:
                pts = int(float(stored_pts))
            except (TypeError, ValueError):
                pts = 0
        else:
            pts = int(rule.get("points", 0))
        total_pts += pts
        if code in CRITICAL_RULE_CODES:
            criticas.append(code)
        if pts >= 5:
            factores.append(alerta.get("nombre_regla") or rule.get("name", code))

    score = min(total_pts, 100)

    if score > 75:
        nivel = "Rojo"
    elif score > 40:
        nivel = "Amarillo"
    else:
        nivel = "Verde"

    has_critical_red = any(code in ("RF-02", "RF-03", "RF-04") for code in criticas)
    if has_critical_red or score > 75:
        accion = "Escalar a revisión antifraude especializada."
    elif score > 40 or criticas:
        accion = "Escalar a revisión documental."
    else:
        accion = "Continuar flujo normal."

    explicacion = (
        f"Evaluación determinística basada en {len(alertas)} regla(s) activa(s). "
        f"Puntaje heurístico: {score}/100. Nivel de riesgo: {nivel}."
    )

    return {
        "score_heuristico": float(score),
        "prediccion_ml": None,
        "probabilidad_ml": None,
        "score_final": None,
        "nivel_riesgo": nivel,
        "reglas_criticas_activadas": ", ".join(criticas) if criticas else None,
        "factores_principales": " | ".join(factores) if factores else None,
        "explicacion_final": explicacion,
        "accion_sugerida": accion,
        "mensaje_ia": _MENSAJE_IA,
        "version_modelo": "heuristic-v1.0",
    }


def run(id_siniestro: str, client=None) -> Dict[str, Any]:
    """
    Compute and upsert score_siniestro for one siniestro.

    If alerta_regla rows don't exist yet, triggers process_rules first.
    Returns upserted score row.
    """
    if client is None:
        from src.persistence.supabase_client import get_client
        client = get_client()

    alertas = _fetch_alertas(client, id_siniestro)
    if not alertas:
        print(f"[score] No alertas found for {id_siniestro}; running process_rules first...")
        from src.realtime.process_rules import run as run_rules
        run_rules(id_siniestro, client)
        alertas = _fetch_alertas(client, id_siniestro)

    score_data = compute_score(alertas)
    score_data["id_siniestro"] = id_siniestro

    client.table("score_siniestro").upsert(score_data, on_conflict="id_siniestro").execute()
    print(
        f"[score] score_siniestro upserted for {id_siniestro}: "
        f"score={score_data['score_heuristico']} nivel={score_data['nivel_riesgo']}"
    )
    return score_data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m src.realtime.process_score <id_siniestro>")
        sys.exit(1)
    result = run(sys.argv[1])
    import json
    print(json.dumps(result, indent=2, default=str))
