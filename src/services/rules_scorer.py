"""
Motor de scoring heurístico basado en reglas de negocio.

Cada regla devuelve los puntos según los umbrales del documento de detección de fraude.
El score total se normaliza sobre MAX_SCORE para obtener una probabilidad (0.0 – 1.0).

Reglas implementadas y sus puntos máximos:
  RF-01  Borde de vigencia              8 pts
  RF-02  Demora denuncia robo           8 pts
  RF-03  Alta frecuencia asegurado      8 pts
  RF-04  Alta frecuencia vehículo       6 pts
  RF-05  Alta frecuencia conductor      8 pts
  RF-06  Proveedor recurrente/lista    10 pts
  RF-07  Documentos incompletos         4 pts
  RF-08  Dinámica sospechosa            6 pts
  RF-09  Sin tercero identificado       6 pts
  RF-10  Documentos inconsistentes     10 pts
  RF-11  Reporte tardío                 5 pts
  RF-12  Narrativas similares           8 pts
  RF-13  Monto cercano suma asegurada   5 pts
  -----------------------------------------------
  Total implementado                   92 pts
  MAX_SCORE (reserva RC futura)        98 pts
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.models.fraud import FraudPredictRequest

MAX_SCORE: float = 98.0

_ACCIDENTES_SOSPECHOSOS = {"choque frontal", "choque posterior", "volcadura", "accidente múltiple"}
_COBERTURAS_ROBO = {"robo total", "robo parcial"}


@dataclass
class RuleResult:
    codigo: str
    descripcion: str
    puntos: float
    puntos_max: float


@dataclass
class HeuristicResult:
    score_raw: float = 0.0
    probabilidad: float = 0.0
    reglas_activadas: list[RuleResult] = field(default_factory=list)

    def add(self, result: RuleResult) -> None:
        if result.puntos > 0:
            self.reglas_activadas.append(result)
            self.score_raw += result.puntos


def compute_heuristic(req: "FraudPredictRequest") -> HeuristicResult:
    result = HeuristicResult()

    # ── RF-01: Borde de vigencia (8 pts) ────────────────────────────────────
    min_dias = min(req.dias_desde_inicio_poliza, req.dias_desde_fin_poliza)
    if min_dias <= 10:
        pts = 8.0
    elif min_dias <= 30:
        pts = 4.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-01", "Reclamo en borde de vigencia", pts, 8.0))

    # ── RF-02: Demora denuncia por robo (8 pts) ──────────────────────────────
    es_robo = (
        req.cobertura.lower() in _COBERTURAS_ROBO
        or "robo" in req.tipo_accidente.lower()
    )
    if es_robo:
        horas = req.dias_entre_ocurrencia_reporte * 24
        if horas > 48:
            pts = 8.0
        elif horas >= 24:
            pts = 4.0
        else:
            pts = 0.0
        result.add(RuleResult("RF-02", "Demora denuncia por robo", pts, 8.0))

    # ── RF-03: Alta frecuencia asegurado (8 pts) ─────────────────────────────
    n = req.historial_siniestros_asegurado
    if n >= 3:
        pts = 8.0
    elif n == 2:
        pts = 4.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-03", "Alta frecuencia reclamos asegurado", pts, 8.0))

    # ── RF-04: Alta frecuencia vehículo (6 pts) ──────────────────────────────
    n = req.historial_siniestros_vehiculo
    if n >= 3:
        pts = 6.0
    elif n == 2:
        pts = 3.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-04", "Alta frecuencia reclamos vehículo", pts, 6.0))

    # ── RF-05: Alta frecuencia conductor (8 pts) ─────────────────────────────
    n = req.historial_siniestros_conductor
    if n >= 3:
        pts = 8.0
    elif n == 2:
        pts = 4.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-05", "Alta frecuencia reclamos conductor", pts, 8.0))

    # ── RF-06: Proveedor recurrente / lista restrictiva (10 pts) ─────────────
    if req.proveedor_en_lista_restrictiva:
        pts = 10.0
    elif req.porcentaje_casos_observados_proveedor >= 0.10:
        pts = 5.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-06", "Proveedor recurrente o en lista restrictiva", pts, 10.0))

    # ── RF-07: Documentos incompletos (4 pts) ────────────────────────────────
    if req.documentos_faltantes > 0 or req.flag_documentos_incompletos:
        pts = 4.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-07", "Documentos incompletos", pts, 4.0))

    # ── RF-08: Dinámica sospechosa (6 pts) ───────────────────────────────────
    tipo_lower = req.tipo_accidente.lower()
    if req.flag_dinamica_sospechosa:
        pts = 6.0
    elif "múltiple" in tipo_lower or "multiple" in tipo_lower:
        try:
            hora_num = int(req.hora_evento.split(":")[0])
        except (ValueError, AttributeError):
            hora_num = 12
        pts = 3.0 if 0 <= hora_num <= 5 else 0.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-08", "Dinámica de accidente sospechosa", pts, 6.0))

    # ── RF-09: Sin tercero identificado (6 pts → condición da 5 pts) ─────────
    sin_tercero = (
        req.flag_sin_tercero_identificado
        or req.tercero_identificado == 0.0
        or req.tercero_identificado is None
    )
    result.add(RuleResult("RF-09", "Evento sin tercero identificado", 5.0 if sin_tercero else 0.0, 6.0))

    # ── RF-10: Documentos inconsistentes (10 pts) ────────────────────────────
    if req.documentos_inconsistentes > 0 or req.flag_documentos_inconsistentes:
        pts = 10.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-10", "Documentos inconsistentes o adulterados", pts, 10.0))

    # ── RF-11: Reporte tardío (5 pts) ────────────────────────────────────────
    d = req.dias_entre_ocurrencia_reporte
    if d > 7:
        pts = 5.0
    elif d >= 4:
        pts = 3.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-11", "Reporte tardío del siniestro", pts, 5.0))

    # ── RF-12: Narrativas similares (8 pts) ──────────────────────────────────
    if req.flag_narrativa_similar_preliminar:
        pts = 8.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-12", "Narrativa similar a otro reclamo", pts, 8.0))

    # ── RF-13: Monto cercano o superior a suma asegurada (5 pts) ─────────────
    if req.ratio_monto_suma_asegurada >= 0.95:
        pts = 4.0
    else:
        pts = 0.0
    result.add(RuleResult("RF-13", "Monto cercano o superior a suma asegurada", pts, 5.0))

    result.probabilidad = min(result.score_raw / MAX_SCORE, 1.0)
    return result
