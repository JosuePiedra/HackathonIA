"""
Orquestador de los 3 procesos para un siniestro individual.

Orden: variable_riesgo → alerta_regla → score_siniestro
"""

from __future__ import annotations

import sys
import os
from typing import Dict, Any

from dotenv import load_dotenv

load_dotenv()

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)


def process_siniestro(id_siniestro: str, client=None) -> Dict[str, Any]:
    """
    Run the full pipeline for one siniestro:
      1. Calculate + upsert variable_riesgo
      2. Evaluate rules + upsert alerta_regla
      3. Calculate + upsert score_siniestro (heuristic fields)
      4. Run ML model + update score_siniestro (prediccion_ml, probabilidad_ml, score_final)

    Args:
        id_siniestro: Primary key of the siniestro to process.
        client: Optional Supabase client (shared across calls).

    Returns:
        Dict with variable_riesgo, alertas count, and final score summary.
    """
    if client is None:
        from src.persistence.supabase_client import get_client
        client = get_client()

    print(f"\n[processor] ── Processing siniestro: {id_siniestro} ──")

    from src.realtime.process_features import run as run_features
    from src.realtime.process_rules import run as run_rules
    from src.realtime.process_score import run as run_score
    from src.realtime.process_ml import run as run_ml

    vr = run_features(id_siniestro, client)
    alertas = run_rules(id_siniestro, client)
    score = run_score(id_siniestro, client)
    ml = run_ml(id_siniestro, client)

    print(
        f"[processor] Done: {id_siniestro} | "
        f"alertas={len(alertas)} | "
        f"score_heuristico={score['score_heuristico']} | "
        f"score_final={ml['score_final']} | "
        f"prediccion_ml={ml['prediccion_ml']} | "
        f"nivel={ml['nivel_riesgo']}"
    )

    return {
        "id_siniestro": id_siniestro,
        "variable_riesgo": vr,
        "alertas_count": len(alertas),
        "score_heuristico": score["score_heuristico"],
        "prediccion_ml": ml["prediccion_ml"],
        "probabilidad_ml": ml["probabilidad_ml"],
        "score_final": ml["score_final"],
        "nivel_riesgo": ml["nivel_riesgo"],
        "accion_sugerida": ml["accion_sugerida"],
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m src.realtime.processor <id_siniestro>")
        sys.exit(1)
    import json
    result = process_siniestro(sys.argv[1])
    print(json.dumps(result, indent=2, default=str))
