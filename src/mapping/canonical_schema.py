"""
Canonical schema definition for the fraudia-claims insurance data model.

CANONICAL_FIELDS defines all standardized field names with metadata.
Every incoming dataset is mapped to these fields before processing.
"""

from typing import Dict, List

CANONICAL_FIELDS: Dict[str, Dict] = {
    # === Identifiers ===
    "id_siniestro": {
        "type": "string",
        "required": True,
        "description": "Unique identifier for the insurance claim (siniestro).",
    },
    "id_poliza": {
        "type": "string",
        "required": True,
        "description": "Unique identifier for the insurance policy.",
    },
    "id_asegurado": {
        "type": "string",
        "required": True,
        "description": "Unique identifier for the insured person (asegurado).",
    },
    "id_vehiculo": {
        "type": "string",
        "required": False,
        "description": "Unique identifier for the insured vehicle (if applicable).",
    },
    "id_proveedor": {
        "type": "string",
        "required": False,
        "description": "Unique identifier for the service provider (taller, médico, etc.).",
    },
    "id_conductor": {
        "type": "string",
        "required": False,
        "description": "Unique identifier for the driver at the time of the incident.",
    },
    # === Classification ===
    "ramo": {
        "type": "string",
        "required": True,
        "description": "Insurance branch/line of business (e.g. Autos, Hogar, Vida, Salud).",
    },
    "cobertura": {
        "type": "string",
        "required": True,
        "description": "Specific coverage type (e.g. Pérdida Total, Robo, Colisión).",
    },
    "estado": {
        "type": "string",
        "required": True,
        "description": "Current state of the claim (e.g. Abierto, Cerrado, En investigación).",
    },
    "sucursal": {
        "type": "string",
        "required": False,
        "description": "Branch office handling the claim.",
    },
    "ciudad": {
        "type": "string",
        "required": False,
        "description": "City where the incident occurred.",
    },
    "provincia": {
        "type": "string",
        "required": False,
        "description": "Province or state where the incident occurred.",
    },
    # === Dates ===
    "fecha_ocurrencia": {
        "type": "date",
        "required": True,
        "description": "Date when the insured event occurred.",
    },
    "fecha_reporte": {
        "type": "date",
        "required": True,
        "description": "Date when the claim was reported to the insurer.",
    },
    "fecha_inicio_poliza": {
        "type": "date",
        "required": True,
        "description": "Policy effective start date.",
    },
    "fecha_fin_poliza": {
        "type": "date",
        "required": True,
        "description": "Policy effective end date / expiration date.",
    },
    # === Financial ===
    "monto_reclamado": {
        "type": "numeric",
        "required": True,
        "description": "Amount claimed by the insured.",
    },
    "monto_estimado": {
        "type": "numeric",
        "required": False,
        "description": "Amount estimated by the adjuster or insurer.",
    },
    "monto_pagado": {
        "type": "numeric",
        "required": False,
        "description": "Amount actually paid out on the claim.",
    },
    "suma_asegurada": {
        "type": "numeric",
        "required": True,
        "description": "Total insured sum (maximum coverage amount).",
    },
    "deducible": {
        "type": "numeric",
        "required": False,
        "description": "Deductible amount applicable to the claim.",
    },
    # === Content ===
    "descripcion": {
        "type": "string",
        "required": False,
        "description": "Free-text narrative description of the incident.",
    },
    "documentos_completos": {
        "type": "boolean",
        "required": False,
        "description": "Flag indicating whether all required documents were submitted.",
    },
    # === Fraud Labels & Scores ===
    "etiqueta_fraude_simulada": {
        "type": "boolean",
        "required": False,
        "description": "Simulated fraud label for synthetic/training data (1=fraud, 0=legitimate).",
    },
    # === Metadata ===
    "source_file": {
        "type": "string",
        "required": False,
        "description": "Name of the source file from which this record originated.",
    },
    "mapping_confidence": {
        "type": "numeric",
        "required": False,
        "description": "LLM-assigned confidence score for the schema mapping (0.0-1.0).",
    },
    "data_quality_score": {
        "type": "numeric",
        "required": False,
        "description": "Computed data quality score for this record (0.0-1.0).",
    },
    "limitacion_registro": {
        "type": "string",
        "required": False,
        "description": "Any limitation or data quality note for this record.",
    },
}

# Convenience lists derived from CANONICAL_FIELDS
REQUIRED_FIELDS: List[str] = [
    field for field, meta in CANONICAL_FIELDS.items() if meta.get("required", False)
]

DATE_FIELDS: List[str] = [
    field for field, meta in CANONICAL_FIELDS.items() if meta.get("type") == "date"
]

NUMERIC_FIELDS: List[str] = [
    field for field, meta in CANONICAL_FIELDS.items() if meta.get("type") == "numeric"
]

BOOLEAN_FIELDS: List[str] = [
    field for field, meta in CANONICAL_FIELDS.items() if meta.get("type") == "boolean"
]
