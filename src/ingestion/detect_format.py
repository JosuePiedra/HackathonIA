"""
Module for detecting file format characteristics:
delimiters, encodings, column types (date, numeric, boolean).
"""

import re
from typing import List

import chardet
import pandas as pd


# Keywords that suggest a column contains dates
DATE_COLUMN_KEYWORDS = [
    "fecha", "date", "dt", "fec", "time", "tiempo", "dia", "day",
    "inicio", "fin", "ocurrencia", "reporte", "vigencia", "emision",
    "vencimiento", "apertura", "cierre",
]

# Keywords that suggest a column contains numeric/monetary values
NUMERIC_COLUMN_KEYWORDS = [
    "monto", "amount", "valor", "value", "precio", "price", "costo",
    "cost", "suma", "total", "deducible", "prima", "pago", "cobro",
    "score", "puntos", "porcentaje", "ratio", "tasa", "rate", "num",
    "cantidad", "count",
]

# Keywords that suggest a column contains boolean values
BOOLEAN_COLUMN_KEYWORDS = [
    "flag", "activo", "active", "completo", "complete", "documentos",
    "vigente", "valid", "cancelado", "fraude", "etiqueta", "label",
    "is_", "tiene", "has_", "aplica",
]


def detect_delimiter(path: str) -> str:
    """
    Detect the delimiter used in a CSV file by sampling the first few lines.

    Args:
        path: Absolute path to the file.

    Returns:
        One of ',', ';', or '\\t'
    """
    try:
        with open(path, "rb") as f:
            raw = f.read(4096)

        # Detect encoding first
        detected = chardet.detect(raw)
        enc = detected.get("encoding") or "utf-8"

        sample = raw.decode(enc, errors="replace")
        lines = [l for l in sample.split("\n") if l.strip()][:5]

        counts = {",": 0, ";": 0, "\t": 0}
        for line in lines:
            counts[","] += line.count(",")
            counts[";"] += line.count(";")
            counts["\t"] += line.count("\t")

        return max(counts, key=counts.get)
    except Exception:
        return ","


def detect_encoding(path: str) -> str:
    """
    Detect the character encoding of a file using chardet.

    Args:
        path: Absolute path to the file.

    Returns:
        Encoding string (e.g. 'utf-8', 'latin-1').
    """
    try:
        with open(path, "rb") as f:
            raw = f.read(65536)
        result = chardet.detect(raw)
        encoding = result.get("encoding")
        if encoding is None:
            return "utf-8"
        # Normalize common aliases
        encoding_lower = encoding.lower()
        if encoding_lower in ("ascii", "utf-8-sig"):
            return "utf-8"
        return encoding
    except Exception:
        return "utf-8"


def detect_date_columns(df: pd.DataFrame) -> List[str]:
    """
    Heuristic detection of date columns based on column names and sample values.

    Args:
        df: DataFrame to inspect.

    Returns:
        List of column names likely containing date values.
    """
    date_cols = []

    date_pattern = re.compile(
        r"^\d{4}[-/]\d{2}[-/]\d{2}"  # YYYY-MM-DD or YYYY/MM/DD
        r"|^\d{2}[-/]\d{2}[-/]\d{4}"  # DD-MM-YYYY or DD/MM/YYYY
        r"|^\d{2}[-/]\d{2}[-/]\d{2}$"  # DD/MM/YY
    )

    for col in df.columns:
        col_lower = col.lower()
        # Check name keywords
        if any(kw in col_lower for kw in DATE_COLUMN_KEYWORDS):
            date_cols.append(col)
            continue

        # Check sample values
        sample = df[col].dropna().astype(str).head(10).tolist()
        matches = sum(1 for v in sample if date_pattern.match(v.strip()))
        if len(sample) > 0 and matches / len(sample) >= 0.6:
            date_cols.append(col)

    return date_cols


def detect_numeric_columns(df: pd.DataFrame) -> List[str]:
    """
    Detect numeric columns based on column names and pandas dtype.

    Args:
        df: DataFrame to inspect.

    Returns:
        List of column names likely containing numeric values.
    """
    numeric_cols = []

    for col in df.columns:
        col_lower = col.lower()

        # Already numeric dtype
        if pd.api.types.is_numeric_dtype(df[col]):
            numeric_cols.append(col)
            continue

        # Check name keywords
        if any(kw in col_lower for kw in NUMERIC_COLUMN_KEYWORDS):
            numeric_cols.append(col)
            continue

        # Try coercing a sample
        sample = df[col].dropna().head(20)
        if len(sample) == 0:
            continue
        converted = pd.to_numeric(
            sample.astype(str).str.replace(",", ".", regex=False).str.replace(" ", "", regex=False),
            errors="coerce",
        )
        if converted.notna().sum() / len(sample) >= 0.8:
            numeric_cols.append(col)

    return list(dict.fromkeys(numeric_cols))  # deduplicate preserving order


def detect_boolean_columns(df: pd.DataFrame) -> List[str]:
    """
    Detect boolean columns based on column names and distinct value analysis.

    Args:
        df: DataFrame to inspect.

    Returns:
        List of column names likely containing boolean values.
    """
    boolean_cols = []
    boolean_values = {
        "true", "false", "1", "0", "yes", "no", "si", "sí", "verdadero",
        "falso", "t", "f", "y", "n", "s",
    }

    for col in df.columns:
        col_lower = col.lower()

        # Already bool dtype
        if pd.api.types.is_bool_dtype(df[col]):
            boolean_cols.append(col)
            continue

        # Check name keywords
        if any(kw in col_lower for kw in BOOLEAN_COLUMN_KEYWORDS):
            # Verify distinct values are boolean-like
            unique_vals = set(df[col].dropna().astype(str).str.strip().str.lower().unique())
            if unique_vals and unique_vals.issubset(boolean_values | {"nan", "none", ""}):
                boolean_cols.append(col)
                continue
            # Accept if column name is a strong signal even with non-standard values
            if "flag" in col_lower or "etiqueta" in col_lower:
                boolean_cols.append(col)
                continue

        # Check distinct values heuristic
        sample = df[col].dropna().astype(str).str.strip().str.lower().unique()
        if len(sample) <= 3 and set(sample).issubset(boolean_values | {"nan", "none", ""}):
            boolean_cols.append(col)

    return boolean_cols
