"""
Tests E2E: levanta uvicorn real en un thread y dispara requests HTTP con httpx.

Para correr solo estos tests:
    pytest tests/test_e2e.py -v

Para correr contra un servidor ya levantado (ej. en otro terminal):
    TEST_SERVER_URL=http://localhost:8000 pytest tests/test_e2e.py -v
"""
import os
import threading
import time

import httpx
import pytest
import uvicorn
from fastapi import FastAPI

from src.adapters.fraud import router
from src.services.fraud_predictor import FraudPredictor

_HOST = "127.0.0.1"
_PORT = 18_765
_BASE_URL = f"http://{_HOST}:{_PORT}"
_PREDICT_URL = "/api/v1/fraud/predict"


# ── Fixture: servidor real ────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def server_url():
    """
    Si TEST_SERVER_URL está definida en el entorno usa ese servidor externo.
    Si no, levanta uno propio en un thread y lo cierra al final del módulo.
    """
    external = os.getenv("TEST_SERVER_URL")
    if external:
        yield external.rstrip("/")
        return

    # Reinicia el singleton para que no arrastre estado de otros tests
    FraudPredictor._instance = None

    app = FastAPI(title="Hackaton Fraud API — Test")
    app.include_router(router, prefix="/api/v1/fraud")

    config = uvicorn.Config(app, host=_HOST, port=_PORT, log_level="warning")
    srv = uvicorn.Server(config)

    thread = threading.Thread(target=srv.run, daemon=True)
    thread.start()

    # Esperar a que esté listo (máx 5 s)
    deadline = time.time() + 5
    while time.time() < deadline:
        try:
            httpx.get(f"{_BASE_URL}/docs", timeout=0.3)
            break
        except Exception:
            time.sleep(0.1)

    yield _BASE_URL

    srv.should_exit = True
    thread.join(timeout=3)
    FraudPredictor._instance = None


# ── Payloads sintéticos ───────────────────────────────────────────────────────

def _base_payload(**overrides) -> dict:
    base = {
        "id_siniestro": "SIN-E2E-001",
        "monto_reclamado": 8000.0,
        "monto_estimado": 8200.0,
        "prima": 1200.0,
        "suma_asegurada": 30000.0,
        "dias_desde_inicio_poliza": 180,
        "dias_desde_fin_poliza": 185,
        "ratio_monto_suma_asegurada": 0.267,
        "ratio_monto_estimado": 0.976,
        "diferencia_monto_reclamado_estimado": -200.0,
    }
    base.update(overrides)
    return base


def _payload_rojo() -> dict:
    return _base_payload(
        id_siniestro="SIN-E2E-ROJO",
        dias_desde_inicio_poliza=5,
        proveedor_en_lista_restrictiva=1,
        flag_proveedor_lista_restrictiva=1,
        documentos_inconsistentes=2,
        flag_documentos_inconsistentes=1,
        historial_siniestros_asegurado=4,
        flag_alta_frecuencia_asegurado=1,
        flag_narrativa_similar_preliminar=1,
        ratio_monto_suma_asegurada=0.97,
        flag_monto_atipico=1,
        nivel_reglas="Rojo",
        score_reglas=75,
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestServidorDisponible:
    def test_docs_accesibles(self, server_url):
        r = httpx.get(f"{server_url}/docs", timeout=5)
        assert r.status_code == 200

    def test_openapi_json_disponible(self, server_url):
        r = httpx.get(f"{server_url}/openapi.json", timeout=5)
        assert r.status_code == 200
        assert "paths" in r.json()


class TestFlujoCompleto:
    def test_request_exitoso(self, server_url):
        r = httpx.post(
            f"{server_url}{_PREDICT_URL}",
            json=[_base_payload()],
            timeout=10,
        )
        assert r.status_code == 200, r.text

    def test_content_type_json(self, server_url):
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=[_base_payload()], timeout=10)
        assert "application/json" in r.headers["content-type"]

    def test_respuesta_contiene_campos_clave(self, server_url):
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=[_base_payload()], timeout=10)
        item = r.json()[0]
        for campo in (
            "score_final", "probabilidad_final", "nivel_riesgo", "semaforo",
            "resumen_ejecutivo", "acciones_recomendadas",
            "score_ml", "score_heuristico", "reglas_activadas",
            "peso_ml", "peso_heuristico", "metadata",
        ):
            assert campo in item, f"Falta campo en respuesta real: {campo}"

    def test_metadata_tiene_timestamp_y_latencia(self, server_url):
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=[_base_payload()], timeout=10)
        meta = r.json()[0]["metadata"]
        assert meta["timestamp"]
        assert meta["tiempo_procesamiento_ms"] >= 0

    def test_caso_rojo_supera_caso_verde(self, server_url):
        r = httpx.post(
            f"{server_url}{_PREDICT_URL}",
            json=[_base_payload(), _payload_rojo()],
            timeout=10,
        )
        scores = [item["score_final"] for item in r.json()]
        assert scores[1] > scores[0]

    def test_caso_rojo_semaforo_rojo(self, server_url):
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=[_payload_rojo()], timeout=10)
        assert r.json()[0]["semaforo"] == "ROJO"

    def test_reglas_activadas_son_objetos(self, server_url):
        payload = _base_payload(
            documentos_inconsistentes=1,
            flag_documentos_inconsistentes=1,
        )
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=[payload], timeout=10)
        reglas = r.json()[0]["reglas_activadas"]
        assert len(reglas) > 0
        assert all("codigo" in reg and "puntos_obtenidos" in reg for reg in reglas)


class TestErroresHTTP:
    def test_400_lista_vacia(self, server_url):
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=[], timeout=10)
        assert r.status_code == 400

    def test_400_lote_demasiado_grande(self, server_url):
        r = httpx.post(
            f"{server_url}{_PREDICT_URL}",
            json=[_base_payload(id_siniestro=f"SIN-{i}") for i in range(501)],
            timeout=30,
        )
        assert r.status_code == 400

    def test_422_campos_obligatorios_faltantes(self, server_url):
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=[{"id_siniestro": "SIN-001"}], timeout=10)
        assert r.status_code == 422

    def test_405_metodo_get_no_permitido(self, server_url):
        r = httpx.get(f"{server_url}{_PREDICT_URL}", timeout=5)
        assert r.status_code == 405


class TestRendimiento:
    def test_lote_50_responde_en_menos_de_2s(self, server_url):
        payload = [_base_payload(id_siniestro=f"SIN-PERF-{i}") for i in range(50)]
        t0 = time.perf_counter()
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=payload, timeout=15)
        elapsed = time.perf_counter() - t0
        assert r.status_code == 200
        assert elapsed < 2.0, f"Tardó {elapsed:.2f}s para 50 items"
        assert len(r.json()) == 50

    def test_latencia_individual_menor_500ms(self, server_url):
        t0 = time.perf_counter()
        r = httpx.post(f"{server_url}{_PREDICT_URL}", json=[_base_payload()], timeout=10)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert r.status_code == 200
        assert elapsed_ms < 500, f"Latencia {elapsed_ms:.1f}ms supera 500ms"
