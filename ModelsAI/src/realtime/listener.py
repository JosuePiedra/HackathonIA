"""
Listener de Supabase Realtime para la tabla siniestro.

Escucha eventos INSERT en la tabla `siniestro` y dispara el pipeline
de métricas (variable_riesgo → alerta_regla → score_siniestro).

Uso:
    python -m src.realtime.listener

Variables de entorno requeridas:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict

from dotenv import load_dotenv

load_dotenv()

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("fraudia.listener")


def _get_id_from_payload(payload: Any) -> str | None:
    """Extract id_siniestro from Realtime payload.

    New realtime-py format: {'data': {'record': {...}, ...}, 'ids': [...]}
    Old pydantic format:    payload.data.record
    """
    try:
        if isinstance(payload, dict):
            record = (
                (payload.get("data") or {}).get("record")  # new format
                or payload.get("record")                    # flat dict
                or payload.get("new")                       # legacy
            )
            if isinstance(record, dict):
                return record.get("id_siniestro")
        # Pydantic model
        if hasattr(payload, "data"):
            data = payload.data
            record = data.record if hasattr(data, "record") else (data if isinstance(data, dict) else {})
            if isinstance(record, dict):
                return record.get("id_siniestro")
    except Exception:
        pass
    return None


async def _handle_insert(payload: Any) -> None:
    """Callback invoked by Supabase Realtime on every INSERT into siniestro."""
    id_sin = _get_id_from_payload(payload)
    if not id_sin:
        log.warning("Received INSERT event but could not extract id_siniestro: %s", payload)
        return

    log.info("New siniestro detected: %s — starting pipeline...", id_sin)

    try:
        from src.persistence.supabase_client import get_client
        from src.realtime.processor import process_siniestro

        client = get_client()
        result = process_siniestro(id_sin, client)

        log.info(
            "Pipeline complete for %s | alertas=%d | score=%.1f | nivel=%s",
            id_sin,
            result["alertas_count"],
            result["score_heuristico"],
            result["nivel_riesgo"],
        )
    except Exception as exc:
        log.error("Pipeline failed for siniestro %s: %s", id_sin, exc, exc_info=True)


async def main() -> None:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")

    from supabase import acreate_client
    from realtime import RealtimePostgresChangesListenEvent

    log.info("Connecting to Supabase Realtime: %s", url)
    client = await acreate_client(url, key)

    channel = client.channel("siniestro-inserts")

    channel.on_postgres_changes(
        event=RealtimePostgresChangesListenEvent.Insert,
        schema="public",
        table="siniestro",
        callback=lambda payload: asyncio.create_task(_handle_insert(payload)),
    )

    def on_subscribe(status, err=None):
        if err:
            log.error("Subscription error: %s", err)
        else:
            log.info("Subscribed to siniestro INSERT events. Status: %s", status)

    await channel.subscribe(on_subscribe)

    log.info("Listener active — waiting for new siniestros...")

    # Keep the event loop alive indefinitely
    try:
        while True:
            await asyncio.sleep(30)
            log.debug("Heartbeat — listener still active.")
    except asyncio.CancelledError:
        log.info("Listener shutting down...")
        await channel.unsubscribe()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Listener stopped by user.")
