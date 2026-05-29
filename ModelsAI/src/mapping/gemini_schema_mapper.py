"""
Schema mapping using Google Gemini API.

Sends a CSV column profile to Gemini and receives a structured JSON mapping
to the canonical insurance claims schema.
"""

import json
import os
import re

from dotenv import load_dotenv

from .canonical_schema import CANONICAL_FIELDS, REQUIRED_FIELDS

load_dotenv()

_GEMINI_PROMPT_TEMPLATE = """Eres un asistente de mapeo de datos para un sistema de análisis de siniestros de seguros.
Recibirás un perfil de columnas de uno o varios archivos CSV. Tu tarea es mapear las columnas originales hacia un esquema canónico del sistema.

Reglas:
1. Devuelve únicamente JSON válido.
2. No calcules fraude.
3. No acuses a ningún cliente, proveedor o beneficiario.
4. No inventes datos faltantes.
5. Si un campo no existe, repórtalo en missing_required_fields.
6. Si una columna no puede mapearse, repórtala en unmapped_columns.
7. Asigna mapping_confidence entre 0 y 1.
8. Usa detected_domain para clasificar el archivo: claims, policies, customers, vehicles, providers, documents, mixed o unknown.
9. Solo mapea columnas cuando exista una correspondencia razonable.
10. Si hay ambigüedad, deja recomendación en recommendations.

Esquema canónico disponible:
{canonical_schema}

Perfil del archivo:
{schema_profile}

Devuelve JSON con esta estructura exacta:
{{
  "detected_domain": "",
  "mapping_confidence": 0.0,
  "column_mapping": {{}},
  "missing_required_fields": [],
  "unmapped_columns": [],
  "recommendations": []
}}"""


def _build_prompt(schema_profile: dict) -> str:
    canonical_descriptions = {
        field: f"{meta['type']} — {meta['description']}"
        for field, meta in CANONICAL_FIELDS.items()
    }
    return _GEMINI_PROMPT_TEMPLATE.format(
        canonical_schema=json.dumps(canonical_descriptions, ensure_ascii=False, indent=2),
        schema_profile=json.dumps(schema_profile, ensure_ascii=False, indent=2),
    )


def _call_gemini(prompt: str) -> dict:
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError(
            "google-generativeai not installed. Run: pip install google-generativeai"
        )

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

    model_name = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    response = model.generate_content(prompt)
    text = response.text.strip()

    # Strip markdown code block if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        raise RuntimeError(f"Gemini response is not valid JSON:\n{text[:500]}")


def _validate_response(response: dict) -> bool:
    required = {"detected_domain", "mapping_confidence", "column_mapping", "missing_required_fields"}
    if not isinstance(response, dict):
        return False
    missing = required - set(response.keys())
    if missing:
        print(f"[WARNING] Gemini response missing keys: {missing}")
        return False
    return isinstance(response.get("column_mapping"), dict)


def map_schema_with_gemini(schema_profile: dict) -> dict:
    """
    Map source CSV columns to the canonical schema using Gemini.

    Falls back to an empty mapping if the API call fails.

    Args:
        schema_profile: Output of build_schema_profile().

    Returns:
        Mapping dict with detected_domain, mapping_confidence, column_mapping,
        missing_required_fields, unmapped_columns, recommendations.
    """
    fallback = {
        "detected_domain": "unknown",
        "mapping_confidence": 0.0,
        "column_mapping": {},
        "missing_required_fields": list(REQUIRED_FIELDS),
        "unmapped_columns": [col["name"] for col in schema_profile.get("columns", [])],
        "recommendations": ["Gemini mapping failed; manual mapping required."],
    }

    try:
        prompt = _build_prompt(schema_profile)
        print(f"[INFO] Calling Gemini for schema mapping: {schema_profile.get('file_name', 'unknown')}")
        response = _call_gemini(prompt)

        if not _validate_response(response):
            print("[WARNING] Gemini response validation failed; using fallback mapping.")
            return fallback

        print(f"[INFO] Gemini mapping confidence: {response.get('mapping_confidence', 0.0):.2f}")
        return response

    except Exception as exc:
        print(f"[ERROR] Gemini schema mapping failed: {exc}")
        return fallback


def save_schema_mapping(mapping: dict, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    print(f"[INFO] Schema mapping saved to: {path}")
