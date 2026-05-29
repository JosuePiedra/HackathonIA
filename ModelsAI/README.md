# fraudia-claims — Persona 1: Detección de Fraude en Siniestros

Sistema de detección de fraude en seguros basado en reglas determinísticas y mapeo de esquemas con LLM (Claude). Transforma archivos CSV/Excel heterogéneos de siniestros en un dataset enriquecido con puntajes de riesgo auditables.

## Componentes (Persona 1)

- **Ingesta**: Lectura de CSV/Excel con detección automática de formato y encoding.
- **Mapeo LLM**: Claude `claude-sonnet-4-6` mapea columnas de archivos fuente al esquema canónico.
- **Normalización**: 6 tablas de entidades normalizadas (siniestros, pólizas, asegurados, vehículos, proveedores, documentos).
- **Features**: 16 variables de riesgo computadas (temporales, financieras, frecuencia, documentales).
- **Motor de Reglas**: 17 reglas con puntos asignados → `score_reglas` (0-100) → nivel Verde/Amarillo/Rojo.
- **Exportación**: CSV final con todos los campos + diccionario de datos JSON.

## Instalación

```bash
cd fraudia-claims
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY
```

## Generar Datos Sintéticos

```bash
python data/synthetic/generate_synthetic_data.py
```

Genera `data/synthetic/claims_sinteticos.csv` con 200 registros (~20% fraude).

## Ejecutar el Pipeline

```bash
# Con datos sintéticos (default)
python src/pipeline/build_persona1_dataset.py

# Con archivos propios
python src/pipeline/build_persona1_dataset.py /ruta/a/archivo1.csv /ruta/a/archivo2.xlsx
```

### Outputs generados en `data/processed/`:
- `canonical_claims.csv` — Datos normalizados al esquema canónico
- `normalized_siniestros.csv` — Tabla de siniestros
- `normalized_polizas.csv` — Tabla de pólizas
- `normalized_asegurados.csv` — Tabla de asegurados
- `normalized_vehiculos.csv` — Tabla de vehículos
- `normalized_proveedores.csv` — Tabla de proveedores
- `normalized_documentos.csv` — Tabla de documentos
- `features_claims.csv` — Variables de riesgo computadas
- `rules_scored_claims.csv` — Dataset final con puntajes de fraude
- `data_dictionary.json` — Diccionario de datos completo

## Estructura del Proyecto

```
fraudia-claims/
├── src/
│   ├── ingestion/     # Lectura y perfilado de archivos
│   ├── mapping/       # Esquema canónico + mapeo LLM
│   ├── normalization/ # Tablas normalizadas por entidad
│   ├── features/      # Feature engineering
│   ├── rules/         # Catálogo de reglas + motor de scoring
│   ├── export/        # Exportación de resultados
│   └── pipeline/      # Orquestador principal
├── sql/               # Scripts SQL para PostgreSQL
├── data/
│   ├── synthetic/     # Generador de datos sintéticos
│   └── processed/     # Outputs del pipeline
└── docs/              # Arquitectura, modelo de datos, reglas, riesgos
```

## Reglas de Fraude

El sistema aplica 17 reglas. Los niveles de riesgo son:

| Nivel | Score | Acción |
|-------|-------|--------|
| Verde | 0-19 | Proceso normal |
| Amarillo | 20-39 | Revisión analista |
| Rojo | 40-100 | Investigación SIU prioritaria |

Ver `docs/reglas_negocio.md` para el catálogo completo.

## Nota Ética

Este sistema genera puntajes de apoyo para investigadores. No es una herramienta de decisión autónoma. Toda decisión final debe ser tomada por un profesional calificado tras investigación completa e imparcial.
