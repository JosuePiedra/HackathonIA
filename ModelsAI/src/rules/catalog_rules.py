"""
Catálogo de reglas de detección de fraude — alineado con catalogo_regla en Supabase.
"""

from typing import Dict, Optional

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
        "umbral_1": None, "umbral_2": None,
        "puntos_nivel_1": 12, "puntos_nivel_2": 0,
        "unidad": "bool", "direccion": "mayor",
        "condicion_descripcion": "Activado cuando cobertura contiene \"pérdida total\" o \"robo total\"",
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
        "umbral_1": None, "umbral_2": None,
        "puntos_nivel_1": 18, "puntos_nivel_2": 0,
        "unidad": "bool", "direccion": "mayor",
        "condicion_descripcion": "Activado: documentos_inconsistentes > 0",
    },
    "RF-03": {
        "name": "Coincidencia con lista restrictiva",
        "points": 10,
        "es_critica": True,
        "clasificacion": "Rojo",
        "severity": "Crítica",
        "description": "Proveedor coincide con lista restrictiva de fraude.",
        "type": "Proveedor",
        "flag_column": "flag_proveedor_lista_restrictiva",
        "umbral_1": None, "umbral_2": None,
        "puntos_nivel_1": 10, "puntos_nivel_2": 5,
        "unidad": "bool", "direccion": "mayor",
        "condicion_descripcion": "Lista restrictiva: 10pts | >2 casos observados año: 5pts",
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
        "umbral_1": None, "umbral_2": None,
        "puntos_nivel_1": 15, "puntos_nivel_2": 0,
        "unidad": "bool", "direccion": "mayor",
        "condicion_descripcion": "Activado: keywords de dinámica imposible en descripción",
    },
    "RF-05": {
        "name": "Reclamo cercano al borde de vigencia",
        "points": 8,
        "es_critica": True,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Siniestro ocurrido pocos días del inicio o fin de la póliza.",
        "type": "Vigencia",
        "flag_column": "flag_borde_vigencia",
        # direction="menor": fires when value <= threshold (small days = suspicious)
        "umbral_1": 10, "umbral_2": 30,
        "puntos_nivel_1": 8, "puntos_nivel_2": 4,
        "unidad": "dias", "direccion": "menor",
        "condicion_descripcion": "≤10 días: 8pts | 11-30 días: 4pts | >30 días: 0pts",
    },
    "RF-06": {
        "name": "Demora atípica en denuncia de robo",
        "points": 8,
        "es_critica": True,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Tiempo atípico entre ocurrencia y denuncia en casos de robo.",
        "type": "Temporal",
        "flag_column": "flag_robo_denuncia_tardia",
        # >2 days = >48h: 8pts; 1-2 days = 24-48h: 4pts
        "umbral_1": 2, "umbral_2": 1,
        "puntos_nivel_1": 8, "puntos_nivel_2": 4,
        "unidad": "dias", "direccion": "mayor",
        "condicion_descripcion": ">2 días (>48h): 8pts | 1-2 días (24-48h): 4pts | <24h: 0pts",
    },
    "RF-07": {
        "name": "Narrativa idéntica o clonada",
        "points": 8,
        "es_critica": True,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Narrativa idéntica o altamente similar a otro reclamo.",
        "type": "NLP",
        "flag_column": "flag_narrativa_clonada",
        "umbral_1": 0.85, "umbral_2": 0.70,
        "puntos_nivel_1": 8, "puntos_nivel_2": 4,
        "unidad": "similitud", "direccion": "mayor",
        "condicion_descripcion": ">85% similitud: 8pts | 70-84%: 4pts",
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
        "umbral_1": 7, "umbral_2": 3,
        "puntos_nivel_1": 5, "puntos_nivel_2": 3,
        "unidad": "dias", "direccion": "mayor",
        "condicion_descripcion": ">7 días: 5pts | 4-7 días: 3pts | ≤3 días: 0pts",
    },
    "RF-MONTO-01": {
        "name": "Monto cercano a suma asegurada",
        "points": 4,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media",
        "description": "El monto reclamado representa una proporción muy alta de la suma asegurada.",
        "type": "Monto",
        "flag_column": "flag_monto_atipico",
        "umbral_1": 0.95, "umbral_2": None,
        "puntos_nivel_1": 4, "puntos_nivel_2": 0,
        "unidad": "ratio", "direccion": "mayor",
        "condicion_descripcion": "Reclamo >95% suma asegurada o >50% promedio reparación: 4pts",
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
        "umbral_1": 1, "umbral_2": None,
        "puntos_nivel_1": 4, "puntos_nivel_2": 0,
        "unidad": "count", "direccion": "mayor",
        "condicion_descripcion": "Falta ≥1 documento legal obligatorio: 4pts",
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
        "umbral_1": None, "umbral_2": None,
        "puntos_nivel_1": 10, "puntos_nivel_2": 0,
        "unidad": "bool", "direccion": "mayor",
        "condicion_descripcion": "Activado: documentos_inconsistentes > 0",
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
        "umbral_1": 10, "umbral_2": None,
        "puntos_nivel_1": 5, "puntos_nivel_2": 0,
        "unidad": "count", "direccion": "mayor",
        "condicion_descripcion": "Proveedor con >10 siniestros asociados: 5pts",
    },
    "RF-FREC-01": {
        "name": "Alta frecuencia de reclamos por asegurado",
        "points": 8,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Asegurado con frecuencia elevada de reclamos en los últimos 18 meses.",
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_asegurado",
        "umbral_1": 3, "umbral_2": 2,
        "puntos_nivel_1": 8, "puntos_nivel_2": 4,
        "unidad": "siniestros", "direccion": "mayor",
        "condicion_descripcion": "≥3 siniestros: 8pts | 2 siniestros: 4pts | 0-1: 0pts",
    },
    "RF-FREC-02": {
        "name": "Alta frecuencia de reclamos por vehículo",
        "points": 6,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media",
        "description": "Vehículo asociado a múltiples siniestros en los últimos 18 meses.",
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_vehiculo",
        "umbral_1": 3, "umbral_2": 2,
        "puntos_nivel_1": 6, "puntos_nivel_2": 3,
        "unidad": "siniestros", "direccion": "mayor",
        "condicion_descripcion": "≥3 siniestros: 6pts | 2 siniestros: 3pts | 0-1: 0pts",
    },
    "RF-FREC-03": {
        "name": "Alta frecuencia de reclamos por conductor",
        "points": 8,
        "es_critica": False,
        "clasificacion": "Amarillo",
        "severity": "Media-Alta",
        "description": "Conductor asociado a múltiples siniestros en los últimos 18 meses.",
        "type": "Frecuencia",
        "flag_column": "flag_alta_frecuencia_conductor",
        "umbral_1": 3, "umbral_2": 2,
        "puntos_nivel_1": 8, "puntos_nivel_2": 4,
        "unidad": "siniestros", "direccion": "mayor",
        "condicion_descripcion": "≥3 siniestros: 8pts | 2 siniestros: 4pts | 0-1: 0pts",
    },
}

MAX_POSSIBLE_POINTS = sum(r["puntos_nivel_1"] for r in RULES.values())

CRITICAL_RULE_CODES = {code for code, r in RULES.items() if r.get("es_critica")}


def compute_graduated_points(code: str, value: Optional[float]) -> int:
    """
    Compute graduated points for a rule given the measured numeric value.

    For bool/flat rules (umbral_1 is None), always returns puntos_nivel_1.
    For graduated rules:
      - direccion="mayor": fires when value >= threshold (freq, tardío, demora)
      - direccion="menor": fires when value <= threshold (vigencia)
    """
    rule = RULES.get(code, {})
    umbral_1 = rule.get("umbral_1")
    umbral_2 = rule.get("umbral_2")
    pts_1 = int(rule.get("puntos_nivel_1", rule.get("points", 0)))
    pts_2 = int(rule.get("puntos_nivel_2", 0))
    direccion = rule.get("direccion", "mayor")

    if umbral_1 is None or value is None:
        return pts_1

    try:
        v = float(value)
    except (TypeError, ValueError):
        return 0

    if direccion == "mayor":
        if v >= umbral_1:
            return pts_1
        if umbral_2 is not None and v >= umbral_2:
            return pts_2
        return 0
    else:  # "menor"
        if v <= umbral_1:
            return pts_1
        if umbral_2 is not None and v <= umbral_2:
            return pts_2
        return 0


def get_rule_by_flag(flag_column: str) -> dict:
    for code, data in RULES.items():
        if data.get("flag_column") == flag_column:
            return {**data, "code": code}
    return {}


def list_rules_by_type(rule_type: str) -> list:
    return [{**data, "code": code} for code, data in RULES.items() if data.get("type") == rule_type]
