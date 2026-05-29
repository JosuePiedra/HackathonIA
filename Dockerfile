# ── Stage 1: base ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS python-base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VERSION=1.8.3 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    PYSETUP_PATH="/opt/pysetup" \
    VENV_PATH="/opt/pysetup/.venv"

ENV PATH="$POETRY_HOME/bin:$VENV_PATH/bin:$PATH"

# ── Stage 2: builder (instala deps, no entra en producción) ───────────────────
FROM python-base AS builder

RUN apt-get update && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org | python3 -

WORKDIR $PYSETUP_PATH

# Solo copiamos el manifiesto para aprovechar cache de capas
COPY pyproject.toml poetry.lock* ./

# Instala dependencias sin el paquete propio (no hay setup.py / dist)
RUN poetry install --no-root --only main

# ── Stage 3: producción ───────────────────────────────────────────────────────
FROM python-base AS production

WORKDIR /app

# Copiamos el virtualenv ya construido desde builder
COPY --from=builder $PYSETUP_PATH $PYSETUP_PATH

# Código del servicio
COPY src/ ./src/

# Artefactos del modelo (JSON — sin joblib, sin binarios pesados)
COPY xgb_fraude.json model_metadata.json ./

ENV MODEL_DIR=/app \
    PYTHONPATH=/app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
