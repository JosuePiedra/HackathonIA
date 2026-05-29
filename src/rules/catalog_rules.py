"""
Catalog of fraud detection rules for insurance claims.

Each rule has a code, name, points (risk weight), description, and type.
Points contribute to the overall score_reglas (0-100 scale).
"""

from typing import Dict

RULES: Dict[str, Dict] = {
    "RF-01": {
        "name": "Cobertura Pérdida Total por Robo",
        "points": 10,
        "description": (
            "Reclamo de pérdida total o robo de vehículo. Cobertura de alto valor "
            "con historial elevado de fraude documentado. Requiere validación exhaustiva "
            "de denuncia policial, acta notarial y consistencia de narrativa."
        ),
        "type": "Documental",
        "flag_column": "flag_cobertura_robo_total",
        "severity": "alta",
    },
    "RF-02": {
        "name": "Falsificación o adulteración documental",
        "points": 10,
        "description": (
            "Indicios de documentos falsificados o adulterados: fechas inconsistentes, "
            "sellos irregulares, firmas no coincidentes o documentos duplicados con datos "
            "distintos. Activa investigación inmediata con SIU."
        ),
        "type": "Documental",
        "flag_column": "flag_documentos_inconsistentes",
        "severity": "alta",
    },
    "RF-03": {
        "name": "Coincidencia con lista restrictiva",
        "points": 10,
        "description": (
            "El asegurado, conductor, vehículo o proveedor aparece en la lista interna "
            "de personas o entidades bajo observación por historial de fraude previo "
            "o sanciones regulatorias."
        ),
        "type": "Lista Restrictiva",
        "flag_column": "flag_proveedor_lista_restrictiva",
        "severity": "alta",
    },
    "RF-04": {
        "name": "Dinámica del accidente físicamente imposible",
        "points": 10,
        "description": (
            "La narrativa del siniestro describe una dinámica físicamente imposible o "
            "altamente improbable: ángulos de impacto inexplicables, daños inconsistentes "
            "con la velocidad declarada, o contradicciones físicas evidentes."
        ),
        "type": "Narrativa",
        "flag_column": "flag_dinamica_sospechosa",
        "severity": "alta",
    },
    "RF-05": {
        "name": "Siniestro extremo al borde de vigencia",
        "points": 8,
        "description": (
            "El siniestro ocurre dentro de los primeros 30 días de inicio de vigencia "
            "o en los últimos 30 días antes del vencimiento de la póliza. Patrón "
            "estadísticamente asociado a siniestros pre-planeados."
        ),
        "type": "Temporal",
        "flag_column": "flag_borde_vigencia",
        "severity": "alta",
    },
    "RF-06": {
        "name": "Demora atípica en denuncia de robo",
        "points": 8,
        "description": (
            "Para coberturas de robo, el tiempo entre la ocurrencia y la denuncia "
            "supera los 4 días hábiles. Demoras atípicas reducen la trazabilidad "
            "del evento y son inconsistentes con comportamiento legítimo de robo."
        ),
        "type": "Temporal",
        "flag_column": "flag_robo_denuncia_tardia",
        "severity": "alta",
    },
    "RF-07": {
        "name": "Narrativa idéntica o clonada",
        "points": 8,
        "description": (
            "La descripción del siniestro es idéntica o casi idéntica a otra denuncia "
            "previa del mismo asegurado, vehículo o grupo de personas. Posible "
            "reutilización de narrativas fraudulentas."
        ),
        "type": "Narrativa",
        "flag_column": "flag_narrativa_clonada",
        "severity": "alta",
    },
    "RF-TEMP-01": {
        "name": "Reporte tardío",
        "points": 5,
        "description": (
            "El siniestro fue reportado más de 7 días después de ocurrido. "
            "El retraso en la notificación puede indicar preparación del expediente "
            "o inconsistencias en la línea de tiempo declarada."
        ),
        "type": "Temporal",
        "flag_column": "flag_reporte_tardio",
        "severity": "media",
    },
    "RF-MONTO-01": {
        "name": "Monto reclamado atípico",
        "points": 5,
        "description": (
            "El monto reclamado supera el 90% de la suma asegurada de la póliza. "
            "Reclamos que maximizan la cobertura disponible son estadísticamente "
            "más frecuentes en fraudes de pérdida total inducida."
        ),
        "type": "Financiero",
        "flag_column": "flag_monto_atipico",
        "severity": "media",
    },
    "RF-DOC-01": {
        "name": "Documentos incompletos",
        "points": 4,
        "description": (
            "El expediente no cuenta con todos los documentos requeridos según "
            "el tipo de cobertura y ramo. La documentación incompleta puede indicar "
            "intento de ocultar inconsistencias o falta de evidencia real del siniestro."
        ),
        "type": "Documental",
        "flag_column": "flag_documentos_incompletos",
        "severity": "baja",
    },
    "RF-DOC-02": {
        "name": "Documentos inconsistentes",
        "points": 10,
        "description": (
            "Existen contradicciones entre documentos del expediente: fechas no coinciden, "
            "montos difieren entre presupuesto y factura, o datos del vehículo son "
            "discordantes entre diferentes documentos."
        ),
        "type": "Documental",
        "flag_column": "flag_documentos_inconsistentes",
        "severity": "alta",
    },
    "RF-PROV-01": {
        "name": "Proveedor recurrente",
        "points": 5,
        "description": (
            "El taller, clínica u otro proveedor de servicios aparece asociado a "
            "más de 10 siniestros en el período analizado. Alta recurrencia puede "
            "indicar connivencia en la fabricación o exageración de siniestros."
        ),
        "type": "Proveedor",
        "flag_column": "flag_proveedor_recurrente",
        "severity": "media",
    },
    "RF-PROV-02": {
        "name": "Proveedor en lista restrictiva",
        "points": 10,
        "description": (
            "El proveedor de servicios está incluido en la lista interna de proveedores "
            "bajo observación por irregularidades previas, sanciones o vinculación con "
            "reclamos fraudulentos confirmados."
        ),
        "type": "Lista Restrictiva",
        "flag_column": "flag_proveedor_lista_restrictiva",
        "severity": "alta",
    },
    "RF-FREC-01": {
        "name": "Alta frecuencia asegurado",
        "points": 8,
        "description": (
            "El asegurado tiene 3 o más siniestros activos o cerrados en el período "
            "analizado. Alta frecuencia de siniestros por asegurado es un indicador "
            "primario de fraude por oportunidad o sistemático."
        ),
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_asegurado",
        "severity": "alta",
    },
    "RF-FREC-02": {
        "name": "Alta frecuencia vehículo",
        "points": 6,
        "description": (
            "El vehículo asegurado está asociado a 3 o más siniestros en el período. "
            "Puede indicar fraude por uso intensivo del vehículo para generar reclamos "
            "o manipulación del historial del bien asegurado."
        ),
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_vehiculo",
        "severity": "media",
    },
    "RF-FREC-03": {
        "name": "Alta frecuencia conductor",
        "points": 8,
        "description": (
            "El conductor involucrado en el siniestro aparece en 3 o más siniestros "
            "distintos en el período. Patrón de conductores recurrentes puede indicar "
            "participación activa en esquemas de fraude organizado."
        ),
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_conductor",
        "severity": "alta",
    },
    "RF-DIN-01": {
        "name": "Siniestro severo sin tercero identificado",
        "points": 6,
        "description": (
            "El siniestro reporta daños severos pero no existe identificación de "
            "tercero involucrado. Accidentes graves sin datos del tercero pueden "
            "ser indicativos de siniestros simulados o auto-infligidos."
        ),
        "type": "Dinámica",
        "flag_column": "flag_sin_tercero_identificado",
        "severity": "media",
    },
}

# Total maximum points if all rules fire
MAX_POSSIBLE_POINTS = sum(r["points"] for r in RULES.values())


def get_rule_by_flag(flag_column: str) -> dict:
    """Retrieve a rule definition by its associated flag column name."""
    for rule_code, rule_data in RULES.items():
        if rule_data.get("flag_column") == flag_column:
            return {**rule_data, "code": rule_code}
    return {}


def list_rules_by_type(rule_type: str) -> list:
    """Return all rules of a given type."""
    return [
        {**data, "code": code}
        for code, data in RULES.items()
        if data.get("type") == rule_type
    ]
