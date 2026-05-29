import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.adapters.fraud import router
from src.services.fraud_predictor import FraudPredictor

# Logging
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    FraudPredictor.get()   # carga modelo en startup, no en primer request
    yield

app = FastAPI(
    title="Fraud Detector API",
    description="Detector de posibles fraudes en siniestros de seguros — modelo híbrido ML + reglas",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router, prefix="/api/v1/fraud", tags=["Fraud Detection"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
