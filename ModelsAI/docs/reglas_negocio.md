# Reglas de Negocio — fraudia-claims

## Sistema de Scoring

El motor de reglas asigna puntos por cada indicador de riesgo activado. El `score_reglas` es la suma de puntos, capeado en 100.

| Nivel | Rango de Score | Acción Recomendada |
|-------|---------------|-------------------|
| Verde | 0 - 19 | Proceso normal de ajuste |
| Amarillo | 20 - 39 | Revisión por analista asignado, documentación adicional |
| Rojo | 40 - 100 | Revisión prioritaria por equipo SIU, suspender pago hasta investigación |

## Catálogo de Reglas

| Código | Nombre | Puntos | Tipo | Umbral |
|--------|--------|--------|------|--------|
| RF-01 | Cobertura Pérdida Total por Robo | 10 | Documental | cobertura contiene "pérdida total" o "robo total" |
| RF-02 | Falsificación documental | 10 | Documental | documentos_inconsistentes > 0 |
| RF-03 | Lista restrictiva (asegurado/proveedor) | 10 | Lista Restrictiva | en_lista_restrictiva = True |
| RF-04 | Dinámica imposible | 10 | Narrativa | keywords en descripción |
| RF-05 | Borde de vigencia | 8 | Temporal | ocurrencia dentro de 30 días de inicio o fin |
| RF-06 | Denuncia tardía robo | 8 | Temporal | cobertura=robo AND dias_reporte > 4 |
| RF-07 | Narrativa clonada | 8 | Narrativa | descripción duplicada en dataset |
| RF-TEMP-01 | Reporte tardío | 5 | Temporal | dias_entre_ocurrencia_reporte > 7 |
| RF-MONTO-01 | Monto atípico | 5 | Financiero | ratio_monto_suma_asegurada >= 0.90 |
| RF-DOC-01 | Documentos incompletos | 4 | Documental | documentos_faltantes > 0 |
| RF-DOC-02 | Documentos inconsistentes | 10 | Documental | documentos_inconsistentes > 0 |
| RF-PROV-01 | Proveedor recurrente | 5 | Proveedor | frecuencia_proveedor > 10 |
| RF-PROV-02 | Proveedor lista restrictiva | 10 | Lista Restrictiva | en_lista_restrictiva = True |
| RF-FREC-01 | Alta frecuencia asegurado | 8 | Frecuencia | historial_asegurado >= 3 |
| RF-FREC-02 | Alta frecuencia vehículo | 6 | Frecuencia | historial_vehiculo >= 3 |
| RF-FREC-03 | Alta frecuencia conductor | 8 | Frecuencia | historial_conductor >= 3 |
| RF-DIN-01 | Sin tercero identificado | 6 | Dinámica | ratio >= 0.85 sin tercero |

## Nota Ética

El sistema genera un campo `mensaje_etico_reglas` en cada registro exportado recordando que los scores son herramientas de apoyo y no reemplazan el criterio profesional. Ninguna decisión de rechazo debe basarse únicamente en el puntaje automatizado.
