"""
Proceso 4: Llamar al modelo ML y actualizar score_siniestro con campos prediccion_ml,
           probabilidad_ml y score_final para un siniestro.

Requiere que process_score ya haya corrido (score_heuristico debe existir).

Puede ejecutarse de forma autónoma:
    python -m src.realtime.process_ml <id_siniestro>
"""

from __future__ import annotations

import sys
import os
from typing import Dict, Any, List, Optional

from dotenv import load_dotenv

load_dotenv()

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)

# Mapping: alerta_regla.codigo_regla → FraudPredictRequest flag field
_CODE_TO_FLAG: Dict[str, str] = {
    "RF-05":      "flag_borde_vigencia",
    "RF-06":      "flag_robo_denuncia_tardia",
    "RF-TEMP-01": "flag_reporte_tardio",
    "RF-MONTO-01":"flag_monto_atipico",
    "RF-DOC-01":  "flag_documentos_incompletos",
    "RF-02":      "flag_documentos_inconsistentes",
    "RF-DOC-02":  "flag_documentos_inconsistentes",
    "RF-PROV-01": "flag_proveedor_recurrente",
    "RF-03":      "flag_proveedor_lista_restrictiva",
    "RF-FREC-01": "flag_alta_frecuencia_asegurado",
    "RF-FREC-02": "flag_alta_frecuencia_vehiculo",
    "RF-FREC-03": "flag_alta_frecuencia_conductor",
    "RF-04":      "flag_dinamica_sospechosa",
    "RF-07":      "flag_narrativa_similar_preliminar",
}

_MENSAJE_IA = (
    "Esta evaluación es una alerta para revisión humana, "
    "no una acusación automática ni una decisión de rechazo."
)


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _safe_int(val, default: int = 0) -> int:
    try:
        return int(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _nivel_from_score(score: float) -> str:
    """Map numeric score to DB-compatible nivel_riesgo: Verde/Amarillo/Rojo."""
    if score >= 75:
        return "Rojo"
    if score >= 40:
        return "Amarillo"
    return "Verde"


def _fetch_siniestro(client, id_siniestro: str) -> Optional[Dict]:
    res = client.table("siniestro").select("*").eq("id_siniestro", id_siniestro).execute()
    return res.data[0] if res.data else None


def _fetch_poliza(client, id_poliza: Optional[str]) -> Dict:
    if not id_poliza:
        return {}
    res = client.table("poliza").select("*").eq("id_poliza", id_poliza).execute()
    return res.data[0] if res.data else {}


def _fetch_variable_riesgo(client, id_siniestro: str) -> Dict:
    res = client.table("variable_riesgo").select("*").eq("id_siniestro", id_siniestro).execute()
    return res.data[0] if res.data else {}


def _fetch_alertas(client, id_siniestro: str) -> List[Dict]:
    res = client.table("alerta_regla").select("codigo_regla").eq(
        "id_siniestro", id_siniestro
    ).execute()
    return res.data or []


def _fetch_score(client, id_siniestro: str) -> Dict:
    res = client.table("score_siniestro").select("*").eq("id_siniestro", id_siniestro).execute()
    return res.data[0] if res.data else {}


def _fetch_proveedor(client, id_proveedor: Optional[str]) -> Dict:
    if not id_proveedor:
        return {}
    res = client.table("proveedor").select("*").eq("id_proveedor", id_proveedor).execute()
    return res.data[0] if res.data else {}


def _build_request(
    sin: Dict,
    pol: Dict,
    vr: Dict,
    alertas: List[Dict],
    prov: Dict,
    score_heuristico: float,
    nivel_heuristico: str,
) -> "FraudPredictRequest":
    from src.models.fraud import FraudPredictRequest

    # Build flag dict from active alerta_regla codes
    flags: Dict[str, int] = {}
    for row in alertas:
        flag_name = _CODE_TO_FLAG.get(row.get("codigo_regla", ""))
        if flag_name:
            flags[flag_name] = 1

    vr_bool = vr.get("borde_vigencia", False)
    if isinstance(vr_bool, str):
        vr_bool = vr_bool.lower() in ("true", "1")

    monto_rec = _safe_float(sin.get("monto_reclamado"))
    monto_est = _safe_float(sin.get("monto_estimado"), default=monto_rec)
    suma_aseg = _safe_float(pol.get("suma_asegurada"), default=monto_rec or 1.0)
    prima = _safe_float(pol.get("prima"))

    return FraudPredictRequest(
        id_siniestro=sin.get("id_siniestro"),
        # Montos
        monto_reclamado=monto_rec,
        monto_estimado=monto_est,
        monto_pagado=_safe_float(sin.get("monto_pagado")),
        prima=prima,
        suma_asegurada=suma_aseg,
        deducible=_safe_float(pol.get("deducible")),
        # Días
        dias_desde_inicio_poliza=_safe_int(vr.get("dias_desde_inicio_poliza")),
        dias_desde_fin_poliza=_safe_int(vr.get("dias_desde_fin_poliza")),
        dias_entre_ocurrencia_reporte=_safe_int(vr.get("dias_entre_ocurrencia_reporte")),
        # Ratios
        ratio_monto_suma_asegurada=_safe_float(vr.get("ratio_monto_suma_asegurada")),
        ratio_monto_estimado=_safe_float(vr.get("ratio_monto_estimado"), default=1.0),
        diferencia_monto_reclamado_estimado=_safe_float(
            vr.get("diferencia_monto_reclamado_estimado")
        ),
        # Historiales
        historial_siniestros_asegurado=_safe_int(vr.get("historial_siniestros_asegurado")),
        historial_siniestros_vehiculo=_safe_int(vr.get("historial_siniestros_vehiculo")),
        historial_siniestros_conductor=_safe_int(vr.get("historial_siniestros_conductor")),
        # Proveedor
        frecuencia_proveedor=_safe_int(vr.get("frecuencia_proveedor")),
        monto_promedio_proveedor=_safe_float(prov.get("monto_promedio_reclamado")),
        porcentaje_casos_observados_proveedor=_safe_float(
            prov.get("porcentaje_casos_observados")
        ),
        # Score heurístico como feature
        score_reglas=int(score_heuristico),
        # Calidad del registro
        data_quality_score=_safe_float(sin.get("data_quality_score"), default=1.0),
        mapping_confidence=_safe_float(sin.get("mapping_confidence"), default=1.0),
        # Documentos
        documentos_faltantes=_safe_int(vr.get("documentos_faltantes")),
        documentos_inconsistentes=_safe_int(vr.get("documentos_inconsistentes")),
        documentos_completos=1 if sin.get("documentos_completos") else 0,
        # Flags derivados de alerta_regla
        flag_borde_vigencia=flags.get("flag_borde_vigencia", 0),
        flag_robo_denuncia_tardia=flags.get("flag_robo_denuncia_tardia", 0),
        flag_reporte_tardio=flags.get("flag_reporte_tardio", 0),
        flag_monto_atipico=flags.get("flag_monto_atipico", 0),
        flag_documentos_incompletos=flags.get("flag_documentos_incompletos", 0),
        flag_documentos_inconsistentes=flags.get("flag_documentos_inconsistentes", 0),
        flag_proveedor_recurrente=flags.get("flag_proveedor_recurrente", 0),
        flag_proveedor_lista_restrictiva=flags.get("flag_proveedor_lista_restrictiva", 0),
        flag_alta_frecuencia_asegurado=flags.get("flag_alta_frecuencia_asegurado", 0),
        flag_alta_frecuencia_vehiculo=flags.get("flag_alta_frecuencia_vehiculo", 0),
        flag_alta_frecuencia_conductor=flags.get("flag_alta_frecuencia_conductor", 0),
        flag_sin_tercero_identificado=0,
        flag_dinamica_sospechosa=flags.get("flag_dinamica_sospechosa", 0),
        flag_narrativa_similar_preliminar=flags.get("flag_narrativa_similar_preliminar", 0),
        # Binarios directos
        proveedor_recurrente=1 if vr.get("proveedor_recurrente") else 0,
        proveedor_en_lista_restrictiva=1 if prov.get("en_lista_restrictiva") else 0,
        monto_atipico=1 if vr.get("monto_atipico") else 0,
        reporte_tardio=1 if vr.get("reporte_tardio") else 0,
        borde_vigencia=1 if vr_bool else 0,
        # Categóricas
        ramo=sin.get("ramo") or "Vehículos",
        cobertura=sin.get("cobertura") or "Daño propio",
        estado=sin.get("estado") or "Reserva",
        sucursal=sin.get("sucursal") or "Quito Norte",
        nivel_reglas=nivel_heuristico,
    )


def run(id_siniestro: str, client=None) -> Dict[str, Any]:
    """
    Run ML prediction for one siniestro and update score_siniestro with ML fields.

    Returns dict with all updated score_siniestro fields.
    """
    if client is None:
        from src.persistence.supabase_client import get_client
        client = get_client()

    sin = _fetch_siniestro(client, id_siniestro)
    if not sin:
        raise ValueError(f"Siniestro {id_siniestro} not found.")

    pol = _fetch_poliza(client, sin.get("id_poliza"))
    vr = _fetch_variable_riesgo(client, id_siniestro)
    alertas = _fetch_alertas(client, id_siniestro)
    prov = _fetch_proveedor(client, sin.get("id_proveedor"))
    score_row = _fetch_score(client, id_siniestro)

    score_heuristico = _safe_float(score_row.get("score_heuristico"), default=0.0)
    nivel_heuristico = score_row.get("nivel_riesgo") or "Verde"

    req = _build_request(sin, pol, vr, alertas, prov, score_heuristico, nivel_heuristico)

    from src.services.fraud_predictor import FraudPredictor
    predictor = FraudPredictor.get()
    resp = predictor.predict_batch([req])[0]

    score_final = float(resp.score_final)
    nivel_riesgo = _nivel_from_score(score_final)

    update = {
        "prediccion_ml": 1 if resp.probabilidad_ml >= 0.40 else 0,
        "probabilidad_ml": round(resp.probabilidad_ml, 6),
        "score_final": score_final,
        "nivel_riesgo": nivel_riesgo,
        "accion_sugerida": resp.acciones_recomendadas[0] if resp.acciones_recomendadas else "Continuar flujo normal.",
        "explicacion_final": resp.resumen_ejecutivo,
        "mensaje_ia": _MENSAJE_IA,
        "version_modelo": f"xgb_v1+heuristic (ML={predictor._weight_ml:.2f}/rules={predictor._weight_rules:.2f})",
    }

    try:
        res = client.table("score_siniestro").update(update).eq("id_siniestro", id_siniestro).execute()
        if not res.data:
            # process_score row missing — insert with defaults for missing PK fields
            client.table("score_siniestro").insert({"id_siniestro": id_siniestro, **update}).execute()
    except Exception as exc:
        raise RuntimeError(f"[ml] Failed to write score_siniestro for {id_siniestro}: {exc}") from exc

    print(
        f"[ml] score_siniestro updated for {id_siniestro}: "
        f"prediccion_ml={update['prediccion_ml']} "
        f"probabilidad_ml={update['probabilidad_ml']:.4f} "
        f"score_final={score_final:.1f} "
        f"nivel={nivel_riesgo}"
    )

    return {"id_siniestro": id_siniestro, **update}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m src.realtime.process_ml <id_siniestro>")
        sys.exit(1)
    import json
    result = run(sys.argv[1])
    print(json.dumps(result, indent=2, default=str))
