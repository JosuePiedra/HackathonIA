"""
Module for reading and loading uploaded insurance data files.
Supports CSV (with auto-delimiter detection) and Excel formats.
"""

import os
import pandas as pd
from typing import Dict, List


def read_csv_file(path: str) -> pd.DataFrame:
    """
    Read a CSV file trying multiple delimiters and encodings.

    Tries delimiters: comma, semicolon, tab
    Tries encodings: utf-8, latin-1

    Args:
        path: Absolute path to the CSV file.

    Returns:
        pd.DataFrame with the file contents.

    Raises:
        ValueError: If the file cannot be read with any combination tried.
    """
    delimiters = [",", ";", "\t"]
    encodings = ["utf-8", "latin-1"]

    last_error = None
    for enc in encodings:
        for delim in delimiters:
            try:
                df = pd.read_csv(path, delimiter=delim, encoding=enc, low_memory=False)
                # Validate that we actually got multiple columns (good delimiter)
                if df.shape[1] > 1 or df.shape[0] > 0:
                    return df
            except Exception as e:
                last_error = e
                continue

    # Final attempt: let pandas infer
    try:
        df = pd.read_csv(path, sep=None, engine="python", encoding="utf-8", low_memory=False)
        return df
    except Exception as e:
        last_error = e

    raise ValueError(f"Cannot read CSV file '{path}'. Last error: {last_error}")


def read_excel_file(path: str) -> pd.DataFrame:
    """
    Read an Excel file (.xlsx or .xls).

    Args:
        path: Absolute path to the Excel file.

    Returns:
        pd.DataFrame with contents of the first sheet.

    Raises:
        ValueError: If the file cannot be read.
    """
    try:
        df = pd.read_excel(path, engine="openpyxl")
        return df
    except Exception:
        try:
            df = pd.read_excel(path)
            return df
        except Exception as e:
            raise ValueError(f"Cannot read Excel file '{path}': {e}")


def load_uploaded_files(paths: List[str]) -> Dict[str, pd.DataFrame]:
    """
    Load multiple files, auto-detecting CSV vs Excel by extension.

    Args:
        paths: List of absolute file paths.

    Returns:
        Dictionary mapping filename (basename) to loaded DataFrame.
    """
    result: Dict[str, pd.DataFrame] = {}

    for path in paths:
        if not os.path.isfile(path):
            print(f"[WARNING] File not found, skipping: {path}")
            continue

        filename = os.path.basename(path)
        ext = os.path.splitext(filename)[1].lower()

        try:
            if ext in (".xlsx", ".xls"):
                df = read_excel_file(path)
            elif ext in (".csv", ".txt", ".tsv"):
                df = read_csv_file(path)
            else:
                # Try CSV as default for unknown extensions
                df = read_csv_file(path)

            result[filename] = df
            print(f"[INFO] Loaded '{filename}': {df.shape[0]} rows x {df.shape[1]} columns")
        except Exception as e:
            print(f"[ERROR] Failed to load '{filename}': {e}")

    return result
