"""
Motor de predicción de fraude — inferencia pura con numpy.

Lee directamente el JSON exportado por XGBoost y recorre los árboles de decisión
usando numpy, sin necesidad de instalar xgboost ni scikit-learn en producción.

La diferencia numérica con la predicción de XGBoost es < 1e-7 (error de punto flotante).
"""

import json
import logging
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List

import numpy as np
from dotenv import load_dotenv

from src.models.fraud import (
    FraudPredictRequest,
    FraudPredictResponse,
    PrediccionMetadata,
    ReglaActivadaDetalle,
)
from src.services.rules_scorer import MAX_SCORE, compute_heuristic

load_dotenv()

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(os.getenv("MODEL_DIR", str(Path(__file__).parent.parent.parent)))
_MODEL_VERSION = "xgb_v1"

_SEV_MAP = {"Baja": 0, "Media": 1, "Alta": 2}
_FLAG_COLS = [
    "flag_borde_vigencia", "flag_robo_denuncia_tardia", "flag_reporte_tardio",
    "flag_monto_atipico", "flag_documentos_incompletos", "flag_documentos_inconsistentes",
    "flag_proveedor_recurrente", "flag_proveedor_lista_restrictiva",
    "flag_alta_frecuencia_asegurado", "flag_alta_frecuencia_vehiculo",
    "flag_alta_frecuencia_conductor", "flag_sin_tercero_identificado",
    "flag_dinamica_sospechosa", "flag_narrativa_similar_preliminar",
]

_ACCIONES_POR_REGLA = {
    "RF-01": "Verificar fecha real del siniestro vs fecha de contratación de la póliza",
    "RF-02": "Solicitar justificación documentada de la demora en denuncia formal",
    "RF-03": "Revisar historial completo de siniestros del asegurado en los últimos 18 meses",
    "RF-04": "Revisar historial completo de siniestros del vehículo en los últimos 18 meses",
    "RF-05": "Revisar historial completo de siniestros del conductor en los últimos 18 meses",
    "RF-06": "Escalar a área de control de proveedores para validación inmediata",
    "RF-07": "Solicitar documentación faltante antes de continuar el proceso",
    "RF-08": "Verificar relato del siniestro con análisis técnico de impacto",
    "RF-09": "Investigar testigos o registros de cámaras en la zona del evento",
    "RF-10": "Enviar expediente a revisión pericial especializada por adulteración documental",
    "RF-11": "Solicitar explicación formal de la demora en el reporte del siniestro",
    "RF-12": "Comparar narrativa con siniestros similares identificados en la base de datos",
    "RF-13": "Solicitar estimación pericial independiente para validar el monto reclamado",
}


# ─── Motor de inferencia puro (sin XGBoost) ─────────────────────────────────


class _TreeNode:
    """Representación compacta de un árbol de decisión en numpy arrays."""

    __slots__ = ("left", "right", "feature", "threshold", "default_left", "value")

    def __init__(self, tree_json: dict) -> None:
        self.left = np.array(tree_json["left_children"], dtype=np.int32)
        self.right = np.array(tree_json["right_children"], dtype=np.int32)
        self.feature = np.array(tree_json["split_indices"], dtype=np.int32)
        self.threshold = np.array(tree_json["split_conditions"], dtype=np.float64)
        self.default_left = np.array(tree_json["default_left"], dtype=np.int8)
        self.value = np.array(tree_json["base_weights"], dtype=np.float64)


class XGBPurePredictor:
    """
    Predictor XGBoost puro usando numpy.

    Lee el archivo JSON exportado por `xgb.save_model()` y recorre los árboles
    de decisión manualmente. Solo depende de numpy + json (stdlib).

    La función objetivo asumida es `binary:logistic` (clasificación binaria),
    que aplica una transformación sigmoide al score acumulado.
    """

    def __init__(self, model_path: str | Path) -> None:
        with open(model_path) as f:
            raw = json.load(f)

        learner = raw["learner"]
        gb = learner["gradient_booster"]["model"]

        # Base score: XGBoost lo almacena como probabilidad,
        # internamente se convierte a logit para sumarse con las hojas.
        bs_raw = float(learner["learner_model_param"]["base_score"].strip("[]"))
        self._base_score_logit: float = math.log(bs_raw / (1.0 - bs_raw))

        # best_iteration marca hasta qué árbol usar (early stopping)
        best_iter = int(learner["attributes"].get("best_iteration", len(gb["trees"]) - 1))
        self._num_trees: int = best_iter + 1

        # Parsear solo los árboles necesarios a arrays numpy
        self._trees: list[_TreeNode] = [
            _TreeNode(gb["trees"][i]) for i in range(self._num_trees)
        ]

        logger.info(
            "XGBPurePredictor cargado — %d árboles, base_score_logit=%.6f",
            self._num_trees, self._base_score_logit,
        )

    @staticmethod
    def _traverse(tree: _TreeNode, x: np.ndarray) -> float:
        """Recorre un árbol desde la raíz hasta una hoja."""
        node = 0
        left = tree.left
        right = tree.right
        feature = tree.feature
        threshold = tree.threshold
        default_left = tree.default_left
        value = tree.value

        while left[node] != -1:  # -1 = hoja
            fval = x[feature[node]]
            if np.isnan(fval):
                node = left[node] if default_left[node] else right[node]
            elif fval < threshold[node]:
                node = left[node]
            else:
                node = right[node]
        return float(value[node])

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predice probabilidades para un batch de muestras.

        Parameters
        ----------
        X : np.ndarray, shape (n_samples, n_features)

        Returns
        -------
        np.ndarray, shape (n_samples,) — probabilidad de fraude (clase 1)
        """
        n_samples = X.shape[0]
        raw_scores = np.full(n_samples, self._base_score_logit)

        for tree in self._trees:
            for i in range(n_samples):
                raw_scores[i] += self._traverse(tree, X[i])

        # Sigmoide (binary:logistic)
        return 1.0 / (1.0 + np.exp(-raw_scores))


# ─── Feature engineering & encoding ─────────────────────────────────────────


def _feature_engineer_row(payload: dict) -> dict:
    """Calcula las features derivadas para un siniestro individual."""
    hora_str = str(payload.get("hora_evento", "12:00"))
    try:
        hora_num = int(hora_str.split(":")[0])
    except (ValueError, AttributeError):
        hora_num = -1

    if 0 <= hora_num <= 5:
        franja = 0.0
    elif 6 <= hora_num <= 11:
        franja = 1.0
    elif 12 <= hora_num <= 17:
        franja = 2.0
    elif 18 <= hora_num <= 23:
        franja = 3.0
    else:
        franja = -1.0

    total_flags = sum(payload.get(c, 0) for c in _FLAG_COLS)

    monto_rec = payload.get("monto_reclamado", 0)
    monto_est = payload.get("monto_estimado", 0)
    diff_rel = (monto_rec - monto_est) / (monto_est + 1)
    presion = min(
        payload.get("dias_desde_inicio_poliza", 0),
        payload.get("dias_desde_fin_poliza", 0),
    )
    ratio_prima = payload.get("prima", 0) / (monto_rec + 1)
    sev_num = float(_SEV_MAP.get(payload.get("severidad_accidente", "Media"), -1))

    return {
        "hora_evento_num": hora_num,
        "franja_horaria": franja,
        "total_flags": total_flags,
        "diff_relativa_monto": diff_rel,
        "presion_vigencia": presion,
        "ratio_prima_reclamo": ratio_prima,
        "severidad_num": sev_num,
    }


def _build_feature_vector(
    payload: dict,
    features: list[str],
    encoders: dict[str, dict[str, int]],
) -> np.ndarray:
    """Construye el vector numérico de features en el orden que espera el modelo."""
    eng = _feature_engineer_row(payload)
    row: list[float] = []

    for f in features:
        if f in eng:
            row.append(float(eng[f]))
        elif f in encoders:
            val = str(payload.get(f, ""))
            row.append(float(encoders[f].get(val, -1)))
        else:
            raw_val = payload.get(f, -1)
            row.append(float(raw_val) if raw_val is not None else -1.0)

    return np.array(row, dtype=np.float64)


# ─── Utilidades de respuesta ─────────────────────────────────────────────────


def _nivel_riesgo(score: int) -> str:
    if score <= 25:
        return "Bajo"
    if score <= 50:
        return "Moderado"
    if score <= 75:
        return "Alto"
    return "Crítico"


# ─── Predictor principal (Singleton) ────────────────────────────────────────


class FraudPredictor:
    _instance: "FraudPredictor | None" = None

    def __init__(self) -> None:
        # Cargar modelo puro (sin xgboost)
        self._model = XGBPurePredictor(str(_MODEL_DIR / "xgb_fraude.json"))

        # Cargar metadata (features, encoders, threshold)
        with open(_MODEL_DIR / "model_metadata.json") as f:
            self._meta = json.load(f)

        self._features: list[str] = self._meta["features"]
        self._encoders: dict[str, dict[str, int]] = self._meta["encoders"]

        self._weight_ml: float = float(os.getenv("FRAUD_WEIGHT_ML", 0.6))
        self._weight_rules: float = float(os.getenv("FRAUD_WEIGHT_RULES", 0.4))
        self._threshold: float = float(os.getenv("FRAUD_THRESHOLD", self._meta["threshold"]))

        total = self._weight_ml + self._weight_rules
        self._weight_ml /= total
        self._weight_rules /= total

        logger.info(
            "FraudPredictor listo (PURE NUMPY) — pesos: ML=%.2f reglas=%.2f | "
            "threshold=%.4f | ROC-AUC entrenamiento=%.4f",
            self._weight_ml, self._weight_rules,
            self._threshold, self._meta["roc_auc_test"],
        )

    @classmethod
    def get(cls) -> "FraudPredictor":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _prepare_X(self, reqs: List[FraudPredictRequest]) -> np.ndarray:
        """Construye la matriz de features desde una lista de requests."""
        rows = []
        for req in reqs:
            payload = req.model_dump()
            row = _build_feature_vector(payload, self._features, self._encoders)
            rows.append(row)
        return np.vstack(rows)

    def _semaforo(self, proba: float) -> str:
        if proba >= self._threshold:
            return "ROJO"
        if proba >= self._threshold * 0.6:
            return "AMARILLO"
        return "VERDE"

    def _build_response(
        self,
        req: FraudPredictRequest,
        proba_ml: float,
        elapsed_ms: float,
    ) -> FraudPredictResponse:
        heuristic = compute_heuristic(req)

        proba_final = self._weight_ml * proba_ml + self._weight_rules * heuristic.probabilidad
        semaforo = self._semaforo(proba_final)
        score_final = int(proba_final * 100)
        nivel = _nivel_riesgo(score_final)

        # Reglas estructuradas, ordenadas de mayor a menor impacto
        reglas_detalle = sorted(
            [
                ReglaActivadaDetalle(
                    codigo=r.codigo,
                    descripcion=r.descripcion,
                    puntos_obtenidos=r.puntos,
                    puntos_max=r.puntos_max,
                    porcentaje_contribucion=round(r.puntos / MAX_SCORE * 100, 2),
                )
                for r in heuristic.reglas_activadas
            ],
            key=lambda x: x.puntos_obtenidos,
            reverse=True,
        )

        # Acciones deduplicadas, ordenadas por código de regla
        acciones = [
            _ACCIONES_POR_REGLA[r.codigo]
            for r in sorted(heuristic.reglas_activadas, key=lambda x: x.codigo)
            if r.codigo in _ACCIONES_POR_REGLA
        ]

        # Resumen ejecutivo
        n_reglas = len(reglas_detalle)
        if n_reglas == 0:
            resumen = (
                f"Siniestro con nivel de riesgo {nivel} ({score_final}/100). "
                "El modelo ML no detectó patrones históricos de fraude y no se activaron reglas de alerta."
            )
        else:
            top = reglas_detalle[0]
            resumen = (
                f"Siniestro con nivel de riesgo {nivel} ({score_final}/100). "
                f"Se activaron {n_reglas} regla(s) de alerta. "
                f"Factor principal: {top.descripcion} ({top.puntos_obtenidos:.0f}/{top.puntos_max:.0f} pts). "
                f"Score ML: {int(proba_ml*100)}/100 | Score reglas: {heuristic.score_raw:.0f}/{MAX_SCORE:.0f} pts."
            )

        logger.info(
            "[%s] score_final=%d nivel=%s semaforo=%s ml=%.3f reglas=%.3f "
            "reglas_activadas=%s tiempo_ms=%.1f",
            req.id_siniestro or "SIN-ID",
            score_final, nivel, semaforo,
            proba_ml, heuristic.probabilidad,
            [r.codigo for r in heuristic.reglas_activadas],
            elapsed_ms,
        )

        return FraudPredictResponse(
            id_siniestro=req.id_siniestro,
            score_final=score_final,
            probabilidad_final=round(proba_final, 4),
            nivel_riesgo=nivel,
            semaforo=semaforo,
            resumen_ejecutivo=resumen,
            acciones_recomendadas=acciones,
            score_ml=int(proba_ml * 100),
            probabilidad_ml=round(proba_ml, 4),
            score_heuristico=heuristic.score_raw,
            probabilidad_heuristica=round(heuristic.probabilidad, 4),
            reglas_activadas=reglas_detalle,
            peso_ml=round(self._weight_ml, 2),
            peso_heuristico=round(self._weight_rules, 2),
            metadata=PrediccionMetadata(
                timestamp=datetime.now(timezone.utc).isoformat(),
                version_modelo=_MODEL_VERSION,
                tiempo_procesamiento_ms=round(elapsed_ms, 2),
            ),
        )

    def predict_batch(self, reqs: List[FraudPredictRequest]) -> List[FraudPredictResponse]:
        t0 = time.perf_counter()

        X = self._prepare_X(reqs)
        probas_ml = self._model.predict_proba(X)

        elapsed_total_ms = (time.perf_counter() - t0) * 1000
        elapsed_per_item = elapsed_total_ms / len(reqs)

        logger.info(
            "Batch de %d siniestros procesado en %.1f ms (%.2f ms/item)",
            len(reqs), elapsed_total_ms, elapsed_per_item,
        )

        return [
            self._build_response(req, float(p), elapsed_per_item)
            for req, p in zip(reqs, probas_ml)
        ]
