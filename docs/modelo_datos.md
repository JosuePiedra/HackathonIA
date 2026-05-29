# Modelo de Datos — fraudia-claims

## Esquema Canónico

El esquema canónico unifica todos los campos de siniestros en un formato estándar de 28 campos.

### Campos Requeridos
- `id_siniestro`, `id_poliza`, `id_asegurado`
- `ramo`, `cobertura`, `estado`
- `fecha_ocurrencia`, `fecha_reporte`, `fecha_inicio_poliza`, `fecha_fin_poliza`
- `monto_reclamado`, `suma_asegurada`

### Tablas Normalizadas

| Tabla | Clave PK | Descripción |
|-------|----------|-------------|
| `siniestros` | `id_siniestro` | Registro principal del reclamo |
| `polizas` | `id_poliza` | Datos de la póliza de seguro |
| `asegurados` | `id_asegurado` | Datos del tomador |
| `vehiculos` | `id_vehiculo` | Bien asegurado (ramo Autos) |
| `proveedores` | `id_proveedor` | Talleres, clínicas, proveedores |
| `documentos` | `id_documento` | Documentación del expediente |

### Tablas de Features y Scoring

| Tabla/Vista | Descripción |
|-------------|-------------|
| `variables_riesgo` | 16 variables de riesgo computadas |
| `rule_flags` | 15 flags binarios de reglas |
| `vw_rules_scored_claims` | Vista integrada con score_reglas y nivel_reglas |
| `catalogo_reglas` | Catálogo de 17 reglas con puntos y descripciones |
| `schema_mappings` | Registro de mapeos LLM por archivo |
| `stg_uploaded_claims` | Staging de registros crudos |

## Flujo de Datos

```
stg_uploaded_claims (JSONB raw)
    → schema_mappings (LLM mapping)
    → {siniestros, polizas, asegurados, vehiculos, proveedores, documentos}
    → variables_riesgo (features)
    → rule_flags (binary indicators)
    → vw_rules_scored_claims (scoring view)
```
