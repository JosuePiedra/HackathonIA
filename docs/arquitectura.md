# Arquitectura del Sistema — fraudia-claims (Persona 1)

## Visión General

fraudia-claims implementa el componente "Persona 1" de un sistema de detección de fraude en seguros. El pipeline transforma datos de siniestros heterogéneos en un dataset enriquecido con puntajes de riesgo basados en reglas determinísticas.

## Capas del Sistema

```
[Archivos CSV/Excel subidos]
        |
        v
[1. Ingesta] read_upload.py → detect_format.py → profile_schema.py
        |
        v
[2. Mapeo LLM] llm_schema_mapper.py (claude-sonnet-4-6) → mapping_validator.py → apply_mapping.py
        |
        v
[3. Datos Canónicos] canonical_claims.csv (esquema uniforme)
        |
        v
[4. Normalización] normalize_claims / policies / customers / vehicles / providers / documents
        |
        v
[5. Feature Engineering] build_features.py (variables temporales, financieras, frecuencia, docs)
        |
        v
[6. Motor de Reglas] fraud_rules.py → apply_rule_flags → apply_rule_scores → alertas
        |
        v
[7. Exportación] rules_scored_claims.csv + data_dictionary.json
```

## Módulos Principales

| Módulo | Descripción |
|--------|-------------|
| `src/ingestion/` | Lectura de archivos, detección de formato, perfilado de esquema |
| `src/mapping/` | Esquema canónico, mapeo LLM, validación, aplicación de mapeo |
| `src/normalization/` | Tablas normalizadas por entidad (6 entidades) |
| `src/features/` | Cálculo de 16+ variables de riesgo |
| `src/rules/` | Catálogo de 17 reglas + motor de scoring |
| `src/export/` | Exportación CSV + diccionario de datos |
| `src/pipeline/` | Orquestador principal del pipeline completo |

## Decisiones de Diseño

- **LLM para mapeo de esquema**: Claude sonnet-4-6 interpreta columnas de archivos heterogéneos y las mapea al esquema canónico, eliminando transformaciones hardcodeadas por cada fuente.
- **Reglas determinísticas**: El scoring usa reglas auditables con puntos fijos, no ML, garantizando explicabilidad completa.
- **Sin datos reales**: Todo el desarrollo usa datos sintéticos generados con distribuciones realistas.
- **Fallback seguro**: Si el LLM falla, el pipeline continúa con mapeo vacío y marcas de limitación_registro.
