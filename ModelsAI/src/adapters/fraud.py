from typing import List

from fastapi import APIRouter, HTTPException

from src.models.fraud import FraudPredictRequest, FraudPredictResponse
from src.services.fraud_predictor import FraudPredictor

router = APIRouter()


@router.post(
    "/predict",
    response_model=List[FraudPredictResponse],
    summary="Predecir fraude en siniestros",
    description=(
        "Recibe un array de siniestros y devuelve el score de riesgo (0-100), "
        "semáforo (VERDE/AMARILLO/ROJO) y una alerta textual para cada uno. "
        "**No es una acusación automática**, es una herramienta de priorización."
    ),
)
async def predict_fraud(reqs: List[FraudPredictRequest]) -> List[FraudPredictResponse]:
    if not reqs:
        raise HTTPException(status_code=400, detail="La lista de siniestros está vacía.")
    if len(reqs) > 500:
        raise HTTPException(status_code=400, detail="Máximo 500 siniestros por llamada.")
    return FraudPredictor.get().predict_batch(reqs)
