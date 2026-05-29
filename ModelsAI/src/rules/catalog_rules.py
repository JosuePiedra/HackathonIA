"""
Catálogo de reglas de detección de fraude — alineado con catalogo_regla en Supabase.
"""

from typing import Dict

RULES: Dict[str, Dict] = {
    "RF-01": {
        "name": "Cobertura pérdida total por robo",
        "points": 12,
        "es_critica": True,
        "clasificacion": "Rojo",
        "severity": "Alta",
        "description": "Siniestro asociado a cobertura de pérdida total por robo.",
        "type": "Cobertura",
        "flag_column": "flag_cobertura_robo_total",
    },
    "RF-02": {
        "name": "Evidencia de falsificación o adulteración documental",
        "points": 18,
        "es_critica": True,
        "clasificacion": "Rojo",
        "severity": "Crítica",
        "description": "Documentos con evidencia de falsificación o inconsistencia documental fuerte.",
        "type": "Documental",
        "flag_column": "flag_documentos_inconsistentes",
    },
    "RF-03": {
        "name": "Coincidencia con lista restrictiva",
        "points": 18,
        "es_critica": True,
        "clasificacion": "Rojo",
        "severity": "Crítica",
        "description": "Asegurado, beneficiario, proveedor o APS coincide con lista restrictiva.",
        "type": "Proveedor",
        "flag_column": "flag_proveedor_lista_restrictiva",
    },
    "RF-04": {
        "name": "Dinámica físicamente imposible",
        "points": 15,
        "es_critica": True,
        "clasificacion": "Rojo",
        "severity": "Crítica",
        "description": "La dinámica del accidente es físicamente imposible o incompatible con la evidencia.",
        "type": "Dinámica",
        "flag_column": "flag_dinamica_sospechosa",
    },
    "RF-05": {
        "name": "Siniestro extremo al borde de vigencia",
        "points": 10,
        "es_critica": True,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Siniestro ocurrido dentro de las primeras 48 horas o muy cerca del fin de vigencia.",
        "type": "Vigencia",
        "flag_column": "flag_borde_vigencia",
    },
    "RF-06": {
        "name": "Demora atípica en denuncia de robo",
        "points": 10,
        "es_critica": True,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Robo reportado con demora superior a 4 días.",
        "type": "Temporal",
        "flag_column": "flag_robo_denuncia_tardia",
    },
    "RF-07": {
        "name": "Narrativa idéntica o clonada",
        "points": 10,
        "es_critica": True,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Narrativa idéntica o altamente similar a otro reclamo.",
        "type": "NLP",
        "flag_column": "flag_narrativa_clonada",
    },
    "RF-TEMP-01": {
        "name": "Reporte tardío",
        "points": 5,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media",
        "description": "El siniestro fue reportado varios días después de la ocurrencia.",
        "type": "Temporal",
        "flag_column": "flag_reporte_tardio",
    },
    "RF-MONTO-01": {
        "name": "Monto cercano a suma asegurada",
        "points": 5,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media",
        "description": "El monto reclamado representa una proporción alta de la suma asegurada.",
        "type": "Monto",
        "flag_column": "flag_monto_atipico",
    },
    "RF-DOC-01": {
        "name": "Documentos incompletos",
        "points": 4,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media",
        "description": "Faltan documentos obligatorios para la revisión del siniestro.",
        "type": "Documental",
        "flag_column": "flag_documentos_incompletos",
    },
    "RF-DOC-02": {
        "name": "Documentos inconsistentes",
        "points": 10,
        "es_critica": False,
        "clasificacion": "Rojo",
        "severity": "Alta",
        "description": "Existen fechas, valores o datos inconsistentes en los documentos.",
        "type": "Documental",
        "flag_column": "flag_documentos_inconsistentes",
    },
    "RF-PROV-01": {
        "name": "Proveedor recurrente",
        "points": 5,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media",
        "description": "Proveedor asociado a una concentración elevada de siniestros.",
        "type": "Proveedor",
        "flag_column": "flag_proveedor_recurrente",
    },
    "RF-FREC-01": {
        "name": "Alta frecuencia de reclamos por asegurado",
        "points": 8,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Asegurado con frecuencia elevada de reclamos previos.",
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_asegurado",
    },
    "RF-FREC-02": {
        "name": "Alta frecuencia de reclamos por vehículo",
        "points": 6,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media",
        "description": "Vehículo asociado a múltiples siniestros previos.",
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_vehiculo",
    },
    "RF-FREC-03": {
        "name": "Alta frecuencia de reclamos por conductor",
        "points": 8,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Conductor asociado a múltiples siniestros previos.",
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_conductor",
    },
}

MAX_POSSIBLE_POINTS = sum(r["points"] for r in RULES.values())

CRITICAL_RULE_CODES = {code for code, r in RULES.items() if r.get("es_critica")}


def get_rule_by_flag(flag_column: str) -> dict:
    for code, data in RULES.items():
        if data.get("flag_column") == flag_column:
            return {**data, "code": code}
    return {}


def list_rules_by_type(rule_type: str) -> list:
    return [{**data, "code": code} for code, data in RULES.items() if data.get("type") == rule_type]
