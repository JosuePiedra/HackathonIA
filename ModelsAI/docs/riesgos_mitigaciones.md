# Riesgos y Mitigaciones — fraudia-claims

## Riesgos Técnicos

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Fallo de la API LLM (Anthropic) | Alto | Bajo | Fallback a mapeo vacío + limitacion_registro; pipeline continúa sin LLM |
| Esquema de archivo fuente completamente diferente al canónico | Alto | Medio | LLM prompt diseñado para detectar dominios; validación de campos requeridos con alertas |
| Datos nulos en campos críticos (id_siniestro, fecha) | Alto | Medio | Generación automática de IDs; normalización con coerce; data_quality_score bajo |
| Encodings no estándar en CSV | Medio | Alto | Detección con chardet + fallback a latin-1 |
| Delimitadores no estándar | Medio | Alto | Prueba de múltiples delimitadores (,;tab) automáticamente |
| Duplicados en id_siniestro | Medio | Medio | Deduplicación en normalize_claims con keep='first' |

## Riesgos de Negocio

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Falsos positivos (casos legítimos marcados como fraude) | Alto | Mensaje ético en cada registro; score como herramienta de apoyo, no decisión |
| Falsos negativos (fraudes no detectados) | Alto | Reglas actualizables en catalog_rules.py sin cambios al motor |
| Sesgo en reglas por datos sintéticos | Medio | Datos sintéticos cubren edge cases reales; calibración recomendada con datos históricos |
| Privacidad de datos (LOPD/RGPD) | Alto | Sistema diseñado para datos sintéticos; en producción requerir anonimización |

## Limitaciones Conocidas

1. **Narrativa clonada**: La detección actual es exacta (comparación de texto literal). En producción se requiere similitud semántica (embeddings).
2. **Lista restrictiva**: `en_lista_restrictiva = False` por defecto. Requiere integración con base de datos externa de listas negras.
3. **Dinámica sospechosa**: Usa keywords en descripción como proxy. En producción usar NLP para análisis semántico de narrativas.
4. **Score sin ML**: El sistema de reglas no aprende de nuevos patrones automáticamente. Requiere actualización manual del catálogo.
5. **Ventana temporal**: Las frecuencias (historial_siniestros_*) se calculan sobre el dataset cargado, no el histórico completo.
