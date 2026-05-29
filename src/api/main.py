"""
FastAPI service for Persona 1 — CSV ingestion, mapping, and Supabase migration.

Start: uvicorn src.api.main:app --reload --port 8000
"""

from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(
    title="fraudia-claims — Persona 1 API",
    description="CSV ingestion, Gemini schema mapping, Supabase migration, rule scoring.",
    version="1.0.0",
)

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW_DIR = os.path.join(_BASE_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(_BASE_DIR, "data", "processed")

_jobs: Dict[str, Dict[str, Any]] = {}


# ── Models ─────────────────────────────────────────────────

class JobStatus(BaseModel):
    job_id: str
    status: str
    dataset_name: str
    files_processed: int
    rows_received: int
    rows_inserted: int
    rows_with_warnings: int
    rows_rejected: int
    started_at: str
    finished_at: Optional[str] = None
    error: Optional[str] = None


class ClaimRecord(BaseModel):
    id_siniestro: Optional[str] = None
    nivel_riesgo: Optional[str] = None
    score_heuristico: Optional[float] = None
    cobertura: Optional[str] = None
    ciudad: Optional[str] = None
    monto_reclamado: Optional[float] = None


# ── Endpoints ──────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/v1/ingestion/upload")
async def upload(
    files: List[UploadFile] = File(...),
    dataset_name: str = Form(...),
    source_type: str = Form(...),
    use_llm_mapping: bool = Form(True),
    persist_to_supabase: bool = Form(True),
    fraud_label_column: Optional[str] = Form(None),
    manual_mapping_json: Optional[str] = Form(None),
    generate_synthetic_missing_fields: bool = Form(False),
    notes: Optional[str] = Form(None),
):
    """
    Receive CSV files, run the migration pipeline, persist to Supabase.

    source_type: synthetic | public | internal_anonymized | demo
    """
    if source_type not in ("synthetic", "public", "internal_anonymized", "demo"):
        raise HTTPException(422, f"Invalid source_type: {source_type}")

    manual_mapping = None
    if manual_mapping_json:
        import json
        try:
            manual_mapping = json.loads(manual_mapping_json)
        except Exception:
            raise HTTPException(422, "manual_mapping_json is not valid JSON.")

    os.makedirs(RAW_DIR, exist_ok=True)
    saved_paths = []
    for upload in files:
        dest = os.path.join(RAW_DIR, upload.filename or f"upload_{uuid.uuid4()}.csv")
        with open(dest, "wb") as f:
            shutil.copyfileobj(upload.file, f)
        saved_paths.append(dest)

    job_id = str(uuid.uuid4())
    started_at = datetime.utcnow().isoformat()
    _jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "dataset_name": dataset_name,
        "files_processed": 0,
        "rows_received": 0,
        "rows_inserted": 0,
        "rows_with_warnings": 0,
        "rows_rejected": 0,
        "started_at": started_at,
        "finished_at": None,
    }

    try:
        import sys
        sys.path.insert(0, _BASE_DIR)
        from src.pipeline.migration_pipeline import run_migration

        report = run_migration(
            file_paths=saved_paths,
            dataset_name=dataset_name,
            source_type=source_type,
            use_llm_mapping=use_llm_mapping,
            persist_to_supabase=persist_to_supabase,
            fraud_label_column=fraud_label_column,
            manual_mapping_json=manual_mapping,
            generate_synthetic_missing_fields=generate_synthetic_missing_fields,
            notes=notes,
        )
        _jobs[job_id].update({
            "status": "completed",
            "finished_at": datetime.utcnow().isoformat(),
            **{k: v for k, v in report.items() if k in (
                "files_processed", "rows_received", "rows_inserted",
                "rows_with_warnings", "rows_rejected",
            )},
        })
        return report

    except Exception as exc:
        _jobs[job_id].update({
            "status": "failed",
            "finished_at": datetime.utcnow().isoformat(),
            "error": str(exc),
        })
        raise HTTPException(500, f"Pipeline failed: {exc}")


@app.get("/api/v1/ingestion/jobs/{job_id}", response_model=JobStatus)
def get_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    return job


@app.get("/api/v1/ingestion/jobs/{job_id}/report")
def get_job_report(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    return job


@app.get("/api/v1/claims/rules-scored")
def get_rules_scored(limit: int = 100, offset: int = 0, nivel_riesgo: Optional[str] = None):
    """Return rules-scored claims from the latest processed CSV."""
    csv_path = os.path.join(PROCESSED_DIR, "rules_scored_claims.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(404, "rules_scored_claims.csv not found. Run /upload first.")

    import pandas as pd
    df = pd.read_csv(csv_path)

    if nivel_riesgo:
        col = "nivel_riesgo" if "nivel_riesgo" in df.columns else "nivel_reglas"
        if col in df.columns:
            df = df[df[col] == nivel_riesgo]

    total = len(df)
    page = df.iloc[offset : offset + limit]
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "records": page.where(page.notna(), None).to_dict(orient="records"),
    }


@app.post("/api/v1/claims/export-rules-scored")
def export_rules_scored():
    """Trigger export of rules_scored_claims.csv and return the file."""
    csv_path = os.path.join(PROCESSED_DIR, "rules_scored_claims.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(404, "rules_scored_claims.csv not found. Run /upload first.")
    return FileResponse(
        csv_path,
        media_type="text/csv",
        filename="rules_scored_claims.csv",
    )
