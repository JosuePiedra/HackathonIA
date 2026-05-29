"""
LLM-powered schema mapping using the Anthropic Claude API.

Given a schema profile of a source file, asks Claude to produce a mapping
from source column names to canonical field names.
"""

import json
import os
import re
from typing import Dict

import anthropic
from dotenv import load_dotenv

from .canonical_schema import CANONICAL_FIELDS, REQUIRED_FIELDS

load_dotenv()


def build_mapping_prompt(schema_profile: dict, canonical_schema: dict) -> str:
    """
    Build a prompt asking Claude to map source columns to canonical fields.

    Args:
        schema_profile: Output of build_schema_profile().
        canonical_schema: The CANONICAL_FIELDS dict.

    Returns:
        Prompt string for the LLM.
    """
    canonical_descriptions = {
        field: f"{meta['type']} — {meta['description']}"
        for field, meta in canonical_schema.items()
    }

    profile_json = json.dumps(schema_profile, ensure_ascii=False, indent=2)
    canonical_json = json.dumps(canonical_descriptions, ensure_ascii=False, indent=2)
    required_json = json.dumps(REQUIRED_FIELDS, ensure_ascii=False)

    prompt = f"""You are an expert data engineer specialized in insurance data integration.

Your task is to analyze a source data file schema profile and map its columns to the canonical insurance claims schema.

## Source Schema Profile:
{profile_json}

## Canonical Schema (field_name -> type and description):
{canonical_json}

## Required Canonical Fields:
{required_json}

## Instructions:
1. Analyze each source column's name, detected type, and sample values.
2. Map each source column to the most appropriate canonical field.
3. A source column can map to at most one canonical field.
4. Multiple source columns CANNOT map to the same canonical field (use the best match only).
5. If a source column does not match any canonical field, add it to unmapped_columns.
6. Identify which required canonical fields are not covered by any source column.
7. Return ONLY valid JSON with no additional text, markdown, or explanation.

## Required Response Format (JSON only):
{{
  "detected_domain": "claims",
  "mapping_confidence": 0.91,
  "column_mapping": {{
    "source_column_name": "canonical_field_name"
  }},
  "missing_required_fields": ["field_that_has_no_source_column"],
  "unmapped_columns": ["source_column_with_no_canonical_match"],
  "recommendations": ["note or recommendation about the mapping quality"]
}}

Respond with ONLY the JSON object. No explanation, no markdown, no code blocks.
"""
    return prompt


def call_llm_for_mapping(prompt: str) -> dict:
    """
    Call the Anthropic Claude API with the mapping prompt.

    Args:
        prompt: The full prompt string.

    Returns:
        Parsed JSON response dict from Claude.

    Raises:
        RuntimeError: If the API call fails or JSON parsing fails.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set.")

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    # Extract text from response
    response_text = ""
    for block in message.content:
        if hasattr(block, "text"):
            response_text += block.text

    response_text = response_text.strip()

    # Strip markdown code block if present
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", response_text)
    if json_match:
        response_text = json_match.group(1).strip()

    try:
        result = json.loads(response_text)
        return result
    except json.JSONDecodeError as e:
        # Attempt to extract JSON from the text
        json_start = response_text.find("{")
        json_end = response_text.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            try:
                result = json.loads(response_text[json_start:json_end])
                return result
            except json.JSONDecodeError:
                pass
        raise RuntimeError(f"Failed to parse LLM response as JSON: {e}\nResponse was:\n{response_text}")


def validate_llm_json_response(response: dict) -> bool:
    """
    Validate that the LLM response has the expected structure.

    Args:
        response: Parsed JSON dict from LLM.

    Returns:
        True if valid, False otherwise.
    """
    required_keys = {"detected_domain", "mapping_confidence", "column_mapping", "missing_required_fields"}
    if not isinstance(response, dict):
        return False
    missing = required_keys - set(response.keys())
    if missing:
        print(f"[WARNING] LLM response missing keys: {missing}")
        return False
    if not isinstance(response.get("column_mapping"), dict):
        return False
    return True


def save_schema_mapping(mapping: dict, path: str) -> None:
    """
    Save a schema mapping dict as a JSON file.

    Args:
        mapping: Mapping dict to save.
        path: Absolute path for the output JSON file.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    print(f"[INFO] Schema mapping saved to: {path}")


def map_schema_with_llm(schema_profile: dict) -> dict:
    """
    Main function: build prompt, call LLM, validate, and return mapping dict.

    Falls back to an empty mapping if the LLM call fails or response is invalid.

    Args:
        schema_profile: Output of build_schema_profile().

    Returns:
        Mapping dict with keys: detected_domain, mapping_confidence,
        column_mapping, missing_required_fields, unmapped_columns, recommendations.
    """
    fallback = {
        "detected_domain": "unknown",
        "mapping_confidence": 0.0,
        "column_mapping": {},
        "missing_required_fields": REQUIRED_FIELDS[:],
        "unmapped_columns": [col["name"] for col in schema_profile.get("columns", [])],
        "recommendations": ["LLM mapping failed; manual mapping required."],
    }

    try:
        prompt = build_mapping_prompt(schema_profile, CANONICAL_FIELDS)
        print(f"[INFO] Calling LLM for schema mapping of file: {schema_profile.get('file_name', 'unknown')}")
        response = call_llm_for_mapping(prompt)

        if not validate_llm_json_response(response):
            print("[WARNING] LLM response validation failed; using fallback mapping.")
            return fallback

        print(f"[INFO] LLM mapping confidence: {response.get('mapping_confidence', 0.0):.2f}")
        return response

    except Exception as e:
        print(f"[ERROR] LLM schema mapping failed: {e}")
        return fallback
