from typing import Optional
from pydantic import BaseModel, Field


class ReglaModel(BaseModel):
    nombre_regla: Optional[str] = None
    codigo_regla: Optional[str] = None
    tipo_regla: Optional[str] = None
    estado: Optional[str] = None
    clasificacion: Optional[str] = None
    severidad: Optional[str] = None
    puntaje: Optional[float] = None
    activa: Optional[bool] = None


class FraudPredictRequest(BaseModel):
    # Tracking
    id_siniestro: Optional[str] = None

    # Montos
    monto_reclamado: float
    monto_estimado: float
    monto_pagado: float = 0.0
    prima: float
    suma_asegurada: float
    deducible: float = 0.0

    # Días (pre-calculados por el motor de reglas)
    dias_desde_inicio_poliza: int
    dias_desde_fin_poliza: int
    dias_entre_ocurrencia_reporte: int = 0

    # Ratios (pre-calculados)
    ratio_monto_suma_asegurada: float
    ratio_monto_estimado: float
    diferencia_monto_reclamado_estimado: float

    # Historiales
    historial_siniestros_asegurado: int = 0
    historial_siniestros_vehiculo: int = 0
    historial_siniestros_conductor: int = 0

    # Proveedor
    frecuencia_proveedor: int = 0
    monto_promedio_proveedor: float = 0.0
    porcentaje_casos_observados_proveedor: float = 0.0

    # Score del motor de reglas
    score_reglas: int = 0

    # Calidad del registro
    data_quality_score: float = 1.0
    mapping_confidence: float = 1.0

    # Campos para feature engineering
    hora_evento: str = Field(default="12:00", description="Formato HH:MM")
    severidad_accidente: str = Field(default="Media", description="Baja | Media | Alta")

    # Documentos
    documentos_faltantes: int = 0
    documentos_inconsistentes: int = 0
    documentos_completos: int = 1

    # Flags del motor de reglas
    flag_borde_vigencia: int = 0
    flag_robo_denuncia_tardia: int = 0
    flag_reporte_tardio: int = 0
    flag_monto_atipico: int = 0
    flag_documentos_incompletos: int = 0
    flag_documentos_inconsistentes: int = 0
    flag_proveedor_recurrente: int = 0
    flag_proveedor_lista_restrictiva: int = 0
    flag_alta_frecuencia_asegurado: int = 0
    flag_alta_frecuencia_vehiculo: int = 0
    flag_alta_frecuencia_conductor: int = 0
    flag_sin_tercero_identificado: int = 0
    flag_dinamica_sospechosa: int = 0
    flag_narrativa_similar_preliminar: int = 0

    # Binarios
    tercero_identificado: Optional[float] = None
    proveedor_recurrente: int = 0
    proveedor_en_lista_restrictiva: int = 0
    monto_atipico: int = 0
    reporte_tardio: int = 0
    borde_vigencia: int = 0

    # Categóricas
    ramo: str = "Vehículos"
    cobertura: str = "Daño propio"
    estado: str = "Reserva"
    sucursal: str = "Quito Norte"
    tipo_accidente: str = "Choque frontal"
    canal_reporte: str = "Presencial"
    tipo_proveedor: str = "Perito"
    nivel_reglas: str = "Verde"

    # Reglas (reservado para lógica futura)
    reglas: Optional[ReglaModel] = None

    model_config = {"json_schema_extra": {
        "example": {
            "id_siniestro": "SIN-000001",
            "monto_reclamado": 15000.0,
            "monto_estimado": 14500.0,
            "prima": 1200.0,
            "suma_asegurada": 30000.0,
            "dias_desde_inicio_poliza": 20,
            "dias_desde_fin_poliza": 345,
            "ratio_monto_suma_asegurada": 0.50,
            "ratio_monto_estimado": 1.03,
            "diferencia_monto_reclamado_estimado": 500.0,
            "score_reglas": 45,
            "flag_borde_vigencia": 1,
            "flag_monto_atipico": 1,
            "hora_evento": "02:30",
            "severidad_accidente": "Alta",
            "ramo": "Vehículos",
            "cobertura": "Robo total",
            "estado": "Reserva",
            "sucursal": "Quito Norte",
            "tipo_accidente": "Robo en vía pública",
            "canal_reporte": "Web",
            "tipo_proveedor": "Perito",
            "nivel_reglas": "Rojo",
        }
    }}


class ReglaActivadaDetalle(BaseModel):
    codigo: str
    descripcion: str
    puntos_obtenidos: float
    puntos_max: float
    porcentaje_contribucion: float = Field(description="Contribución al score máximo total (%)")


class PrediccionMetadata(BaseModel):
    timestamp: str = Field(description="ISO-8601 UTC")
    version_modelo: str
    tiempo_procesamiento_ms: float


class FraudPredictResponse(BaseModel):
    id_siniestro: Optional[str]

    # ── Veredicto final ──────────────────────────────────────────────────────
    score_final: int = Field(description="Score híbrido ponderado 0-100")
    probabilidad_final: float = Field(description="Probabilidad híbrida ponderada (0.0 - 1.0)")
    nivel_riesgo: str = Field(description="Bajo | Moderado | Alto | Crítico")
    semaforo: str = Field(description="VERDE | AMARILLO | ROJO")
    resumen_ejecutivo: str = Field(description="Narrativa breve para el analista")
    acciones_recomendadas: list[str] = Field(description="Pasos de investigación sugeridos")

    # ── Desglose ML ──────────────────────────────────────────────────────────
    score_ml: int = Field(description="Score del modelo XGBoost 0-100")
    probabilidad_ml: float = Field(description="Probabilidad del modelo ML (0.0 - 1.0)")

    # ── Desglose heurístico ──────────────────────────────────────────────────
    score_heuristico: float = Field(description="Puntos acumulados por reglas de negocio")
    probabilidad_heuristica: float = Field(description="Probabilidad normalizada de reglas (0.0 - 1.0)")
    reglas_activadas: list[ReglaActivadaDetalle] = Field(description="Reglas que aportaron puntos, ordenadas por impacto")

    # ── Configuración usada ──────────────────────────────────────────────────
    peso_ml: float = Field(description="Peso asignado al modelo ML")
    peso_heuristico: float = Field(description="Peso asignado al scoring heurístico")

    # ── Metadata de la ejecución ─────────────────────────────────────────────
    metadata: PrediccionMetadata
