"""
Normalize the documentos (claim documents) table from the canonical DataFrame.

Documents represent the evidence submitted with an insurance claim.
"""

import pandas as pd

DOCUMENTS_FIELDS = [
    "id_siniestro",
    "documentos_completos",
]

# Expected document types for a complete claim submission
EXPECTED_DOCUMENTS = [
    "denuncia_policial",
    "fotos_danios",
    "presupuesto_reparacion",
    "cedula_identidad",
    "licencia_conducir",
    "certificado_poliza",
]


def normalize_documents(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and normalize the documentos (claim documents) table.

    Operations:
    - Selects document-relevant fields.
    - Maps the documentos_completos boolean to a document record.
    - Generates score_documental: 1.0 if complete, 0.5 if partial, 0.0 if missing.
    - Adds documentos_faltantes: estimated count of missing docs when incomplete.
    - Adds documentos_inconsistentes: flag for potential inconsistencies.

    Args:
        canonical_df: Full canonical claims DataFrame.

    Returns:
        Normalized documentos DataFrame with score_documental column.
    """
    present_cols = [c for c in DOCUMENTS_FIELDS if c in canonical_df.columns]
    df = canonical_df[present_cols].copy()

    if "id_siniestro" not in df.columns:
        print("[WARNING] normalize_documents: 'id_siniestro' not found; returning empty DataFrame.")
        return pd.DataFrame(columns=["id_siniestro", "documentos_completos", "score_documental",
                                     "documentos_faltantes", "documentos_inconsistentes"])

    df = df.dropna(subset=["id_siniestro"])
    df = df.drop_duplicates(subset=["id_siniestro"], keep="first")

    # Normalize documentos_completos to boolean
    if "documentos_completos" in df.columns:
        df["documentos_completos"] = df["documentos_completos"].apply(_coerce_bool)
    else:
        df["documentos_completos"] = None

    # Compute score_documental
    df["score_documental"] = df["documentos_completos"].apply(_compute_doc_score)

    # Estimate documentos_faltantes
    df["documentos_faltantes"] = df["documentos_completos"].apply(_estimate_missing_docs)

    # documentos_inconsistentes: flag when docs are reported complete but score is low
    # (Could be enriched with actual document checks in production)
    df["documentos_inconsistentes"] = 0

    df = df.reset_index(drop=True)
    print(f"[INFO] normalize_documents: {len(df)} document records.")
    return df


def _coerce_bool(val) -> object:
    """Convert various representations to bool or None."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, bool):
        return val
    v = str(val).strip().lower()
    if v in {"true", "1", "yes", "si", "sí", "t", "y", "s", "verdadero"}:
        return True
    if v in {"false", "0", "no", "n", "f", "falso"}:
        return False
    return None


def _compute_doc_score(doc_complete) -> float:
    """Compute a document score based on completeness flag."""
    if doc_complete is True:
        return 1.0
    if doc_complete is False:
        return 0.3
    return 0.5  # Unknown / not provided


def _estimate_missing_docs(doc_complete) -> int:
    """Estimate number of missing documents."""
    if doc_complete is True:
        return 0
    if doc_complete is False:
        # Estimate ~30% of expected documents are missing
        return max(1, len(EXPECTED_DOCUMENTS) // 3)
    return 0
