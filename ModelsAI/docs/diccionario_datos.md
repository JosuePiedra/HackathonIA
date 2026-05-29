# Diccionario de Datos — fraudia-claims

## Campos del Esquema Canónico

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| id_siniestro | string | Sí | Identificador único del siniestro |
| id_poliza | string | Sí | Identificador de la póliza |
| id_asegurado | string | Sí | Identificador del asegurado |
| id_vehiculo | string | No | Identificador del vehículo (ramo Autos) |
| id_proveedor | string | No | Identificador del proveedor de servicios |
| id_conductor | string | No | Identificador del conductor en el momento del siniestro |
| ramo | string | Sí | Ramo de seguro (Autos, Hogar, Salud, Vida) |
| cobertura | string | Sí | Cobertura específica (Colisión, Robo Total, etc.) |
| estado | string | Sí | Estado del siniestro (Abierto, Cerrado, En investigación) |
| sucursal | string | No | Sucursal que gestiona el siniestro |
| ciudad | string | No | Ciudad de ocurrencia |
| provincia | string | No | Provincia de ocurrencia |
| fecha_ocurrencia | date | Sí | Fecha del evento asegurado (YYYY-MM-DD) |
| fecha_reporte | date | Sí | Fecha de reporte a la aseguradora (YYYY-MM-DD) |
| fecha_inicio_poliza | date | Sí | Inicio de vigencia de la póliza |
| fecha_fin_poliza | date | Sí | Fin de vigencia de la póliza |
| monto_reclamado | numeric | Sí | Monto reclamado por el asegurado |
| monto_estimado | numeric | No | Estimado del ajustador |
| monto_pagado | numeric | No | Monto efectivamente pagado |
| suma_asegurada | numeric | Sí | Suma máxima asegurada |
| deducible | numeric | No | Deducible aplicable |
| descripcion | string | No | Narrativa del siniestro |
| documentos_completos | boolean | No | True si el expediente está completo |
| etiqueta_fraude_simulada | boolean | No | Etiqueta de fraude (solo datos sintéticos) |
| source_file | string | No | Archivo origen del registro |
| mapping_confidence | numeric | No | Confianza del mapeo LLM (0-1) |
| data_quality_score | numeric | No | Puntuación de calidad de datos (0-1) |
| limitacion_registro | string | No | Notas de limitación o calidad del registro |

## Variables de Riesgo (Features)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| dias_desde_inicio_poliza | int | Días entre inicio de póliza y ocurrencia |
| dias_desde_fin_poliza | int | Días entre ocurrencia y fin de póliza |
| dias_entre_ocurrencia_reporte | int | Días entre ocurrencia y reporte |
| ratio_monto_suma_asegurada | float | Monto reclamado / suma asegurada |
| ratio_monto_estimado | float | Monto reclamado / monto estimado |
| diferencia_monto_reclamado_estimado | float | Diferencia absoluta reclamado vs estimado |
| historial_siniestros_asegurado | int | Total siniestros del asegurado |
| historial_siniestros_vehiculo | int | Total siniestros del vehículo |
| historial_siniestros_conductor | int | Total siniestros del conductor |
| frecuencia_proveedor | int | Total siniestros del proveedor |
| documentos_faltantes | int | Estimado de documentos faltantes |
| documentos_inconsistentes | int | Flag de inconsistencias documentales |
| proveedor_recurrente | bool | True si frecuencia_proveedor > 10 |
| monto_atipico | bool | True si ratio >= 0.90 |
| reporte_tardio | bool | True si dias_reporte > 7 |
| borde_vigencia | bool | True si ocurrencia dentro de 30 días de inicio/fin |

## Campos de Scoring

| Campo | Tipo | Descripción |
|-------|------|-------------|
| score_reglas | int | Puntaje total de riesgo (0-100) |
| nivel_reglas | string | Verde / Amarillo / Rojo |
| reglas_activadas | string | Códigos de reglas activadas (CSV) |
| alertas_reglas | string | Descripciones de alertas activadas |
| explicacion_reglas | string | Explicación en lenguaje natural |
| mensaje_etico_reglas | string | Aviso ético del sistema automatizado |
