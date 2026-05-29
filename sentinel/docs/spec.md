# spec.md — FraudIA Dashboard
## Detector de Posibles Fraudes en Siniestros · Persona 3

---

## 1. Visión general del producto

FraudIA Dashboard es la capa de presentación del sistema MVP. Consume datos desde **Supabase/Postgres** y visualiza el resultado del pipeline antifraude híbrido (reglas críticas + score heurístico + modelo ML) para que analistas de la Unidad Antifraude puedan revisar, filtrar y consultar casos.

**Principio fundamental:** el frontend NO recalcula ninguna lógica de negocio. Solo consume resultados ya calculados por el backend y los presenta de forma clara y explicable.

Casos de uso cubiertos: CU-01 (carga/visualización), CU-02 (score visual con 3 capas), CU-03 (priorización), CU-04 (explicación), CU-05 (agente IA), CU-06 (exportación).
Funcionalidades deseables: red de relaciones, ranking proveedores, simulación de ahorro, análisis narrativo.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Base de datos | Supabase (Postgres) — fuente central de datos |
| Estilos | Tailwind CSS + CSS variables custom (tema dark enterprise) |
| Componentes | shadcn/ui reskinneado |
| Gráficos | Recharts (dashboard) + D3.js (red de relaciones) |
| Parseo CSV | Papa Parse (para carga de datos demo / fallback) |
| Agente IA | Anthropic SDK (`claude-sonnet-4-20250514`) |
| Íconos | Lucide React |
| Animaciones | CSS keyframes + Framer Motion (slide-in panels) |
| Estado | React Context (DataContext) + Supabase client |

---

## 3. Arquitectura antifraude híbrida — 3 capas

El sistema evalúa cada siniestro mediante 3 capas independientes ejecutadas en backend:

### Capa 1 — Reglas críticas (determinísticas)
- Evaluadas por backend mediante lógica determinística
- **NO generan score numérico**
- Generan clasificaciones: `ROJO` o `AMARILLO`
- Un siniestro puede activar **múltiples** reglas críticas simultáneamente
- Cada regla activada se registra como una fila en `REGLA_ALERTA`
- Ejemplos: RF-01, RF-02, RF-07

### Capa 2 — Score heurístico (0-100)
- Score numérico basado en señales de negocio con pesos fijos
- Señales: frecuencia de reclamos, borde de vigencia, proveedor recurrente, reporte tardío, similitud narrativa, monto atípico
- Explicable y trazable

### Capa 3 — Modelo ML histórico (probabilístico)
- Devuelve `prediccion_ml` (0 = normal, 1 = sospechoso) Y `probabilidad_ml` (0.0-1.0)
- Basado en patrones históricos similares
- No determinístico — es una estimación de probabilidad

### Score final consolidado
Las 3 capas se combinan para producir `score_final` (0-100) y `nivel_riesgo` (VERDE / AMARILLO / ROJO), persistidos en `SCORE_SINIESTRO`.

---

## 4. Modelo de datos — Supabase/Postgres

El frontend consume estas tablas directamente via Supabase client.

### Tablas principales

**SINIESTRO** (tabla central)
```
id_siniestro, id_poliza, id_asegurado, id_vehiculo, id_proveedor,
ramo, cobertura, fecha_ocurrencia, fecha_reporte,
monto_reclamado, monto_estimado, monto_pagado,
estado, ciudad, descripcion, documentos_completos, etiqueta_fraude_simulada
```

**REGLA_ALERTA** (una fila por regla activada por siniestro — puede haber múltiples)
```
id_alerta         string PK
id_siniestro      string FK → SINIESTRO
codigo_regla      string   -- "RF-01", "RF-02"
nombre_regla      string   -- "Pérdida Total por Robo"
clasificacion     string   -- "ROJO" | "AMARILLO"
severidad         string   -- "CRÍTICA" | "ALTA" | "MEDIA"
variable_evaluada string   -- qué campo disparó la regla
valor_detectado   string   -- valor que activó la regla
evidencia         text     -- descripción de la evidencia
explicacion       text     -- explicación legible para el analista
```

**SCORE_SINIESTRO** (resultado consolidado — una fila por siniestro)
```
id_score                   string PK
id_siniestro               string FK → SINIESTRO (unique)
score_heuristico           float    -- 0-100, capa 2
prediccion_ml              int      -- 0 o 1
probabilidad_ml            float    -- 0.0-1.0
score_final                float    -- 0-100, combinación de las 3 capas
nivel_riesgo               string   -- "VERDE" | "AMARILLO" | "ROJO"
reglas_criticas_activadas  string   -- "RF-01, RF-02" (lista delimitada)
factores_principales       text     -- factores más relevantes del análisis
explicacion_final          text     -- explicación completa generada por IA
accion_sugerida            string   -- acción recomendada al analista
mensaje_ia                 text     -- mensaje interpretativo del agente IA
fecha_evaluacion           timestamp
version_modelo             string
```

**Tablas de soporte** (ya existentes en el modelo):
- `POLIZA`: vigencia, prima, suma_asegurada, deducible
- `ASEGURADO`: segmento, antigüedad, historial de reclamos
- `VEHICULO`: marca, modelo, año, tipo
- `PROVEEDOR`: tipo, ciudad, reclamos_asociados, en_lista_restrictiva
- `DOCUMENTO`: tipo_documento, entregado, legible, inconsistencia_detectada
- `variable_riesgo`: features calculadas (dias_desde_inicio_poliza, ratio_monto, etc.)
- `NARRATIVA_SIMILITUD`: similitud textual entre siniestros

### Vista consolidada para el dashboard
El frontend consulta principalmente una **vista Supabase** que hace JOIN de las tablas necesarias:
```sql
-- Vista: v_siniestro_completo
SELECT s.*, ss.*, p.suma_asegurada, p.fecha_inicio, p.fecha_fin,
       a.historial_siniestros_asegurado, pr.en_lista_restrictiva
FROM SINIESTRO s
JOIN SCORE_SINIESTRO ss ON s.id_siniestro = ss.id_siniestro
JOIN POLIZA p ON s.id_poliza = p.id_poliza
JOIN ASEGURADO a ON s.id_asegurado = a.id_asegurado
JOIN PROVEEDOR pr ON s.id_proveedor = pr.id_proveedor
```

Las `REGLA_ALERTA` se consultan por separado (relación 1:N con siniestro).

---

## 5. Tema visual — design system

Definido en `app/globals.css`. Todos los componentes usan CSS variables.
**Referencia de implementación:** `docs/design/styles.css` y los archivos JSX en `docs/design/`.

```css
:root {
  --bg-base: #0A0B0F;
  --bg-surface: #111318;
  --bg-elevated: #161A22;
  --border: #1E2028;
  --text-primary: #F0F2F7;
  --text-secondary: #8B92A5;
  --text-tertiary: #4A5060;
  --accent: #4F8EF7;
  --accent-hover: #6BA3FF;
  --risk-green: #22C55E;
  --risk-green-bg: #0D2818;
  --risk-yellow: #EAB308;
  --risk-yellow-bg: #1C1A08;
  --risk-red: #EF4444;
  --risk-red-bg: #200D0D;
}
```

**Tipografía:** Syne (headings) · DM Mono (datos/IDs) · DM Sans (labels UI)

---

## 6. Arquitectura de la aplicación

```
fraudia-dashboard/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                      # Inicio
│   ├── dashboard/page.tsx
│   ├── casos/
│   │   ├── page.tsx                  # Bandeja
│   │   └── [id]/page.tsx             # Detalle
│   ├── red/page.tsx                  # Red de relaciones
│   ├── proveedores/page.tsx          # Ranking + ahorro
│   ├── agente/page.tsx               # Chat IA
│   └── api/
│       ├── agent/route.ts            # Proxy Claude API
│       └── export/route.ts           # Exportación
├── components/
│   ├── shared/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── RiskBadge.tsx
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── RiskDistributionChart.tsx
│   │   ├── TopProvidersChart.tsx
│   │   ├── CasesByRamoChart.tsx
│   │   └── ScoreHistogram.tsx
│   ├── casos/
│   │   ├── CasosTable.tsx
│   │   ├── CasosFilters.tsx
│   │   └── ScoreBar.tsx
│   ├── detalle/
│   │   ├── ScoreBreakdown.tsx        # Muestra 3 capas: heurístico, ML, score_final
│   │   ├── ReglasCriticasList.tsx    # Lista de REGLA_ALERTA (array, no string)
│   │   ├── MLInsight.tsx             # Tarjeta con prediccion_ml + probabilidad_ml
│   │   ├── NarrativeAnalysis.tsx
│   │   └── EthicsMessage.tsx
│   ├── red/
│   │   └── RelationGraph.tsx
│   ├── proveedores/
│   │   ├── ProveedoresTable.tsx
│   │   ├── ProveedorDetailPanel.tsx
│   │   └── SavingsSimulator.tsx
│   └── agente/
│       ├── ChatInterface.tsx
│       └── SuggestedQuestions.tsx
├── lib/
│   ├── types.ts                      # Tipos del dominio actualizado
│   ├── constants.ts
│   ├── supabase.ts                   # Cliente Supabase
│   ├── queries.ts                    # Queries y vistas Supabase
│   ├── claimsUtils.ts                # Utilidades de agregación (sobre datos ya cargados)
│   ├── agentContext.ts               # Contexto para Claude API
│   └── exportUtils.ts
├── context/
│   └── DataContext.tsx               # Carga datos desde Supabase
├── public/data/
│   └── mock_claims.csv               # Fallback para demo sin Supabase
└── docs/
    ├── spec.md
    ├── tasks.md
    └── design/                       # Archivos del prototipo de Claude Design
        ├── FraudIA.html
        ├── app.jsx
        ├── page-red-proveedores-agente.jsx
        ├── page-casos-detalle.jsx
        ├── page-inicio-dashboard.jsx
        ├── components.jsx
        ├── data.jsx
        └── styles.css
```

---

## 7. Fuente de datos — Supabase vs CSV fallback

### Modo Supabase (producción/demo principal)
El `DataContext` usa el cliente Supabase para cargar datos reales. Las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` deben estar configuradas.

### Modo CSV fallback (demo offline)
Si Supabase no está disponible o el botón "Cargar dataset demo" se usa, el sistema carga `public/data/mock_claims.csv`. El CSV debe tener columnas compatibles con la vista `v_siniestro_completo`.

### Columnas del CSV de compatibilidad
```
id_siniestro, id_poliza, id_asegurado, id_vehiculo, id_proveedor,
ramo, cobertura, ciudad, fecha_ocurrencia, fecha_reporte,
monto_reclamado, monto_estimado, monto_pagado, suma_asegurada,
descripcion, documentos_completos,
score_heuristico, prediccion_ml, probabilidad_ml,
score_final, nivel_riesgo,
reglas_criticas_activadas, factores_principales,
explicacion_final, accion_sugerida, mensaje_ia
```

**Nota sobre REGLA_ALERTA en CSV:** el campo `reglas_criticas_activadas` es una lista delimitada por coma (`"RF-01,RF-02"`). En Supabase se consultan como filas separadas de `REGLA_ALERTA`.

---

## 8. Pantallas y funcionalidades

### 8.1 Inicio (`/`)
- Full screen sin sidebar
- Dos opciones de carga: conectar a Supabase (si las vars de entorno están) o cargar CSV demo
- Validación y feedback claro
- Mensaje ético prominente

### 8.2 Dashboard (`/dashboard`) — CU-02 CU-03
**KPIs (8 tarjetas):**
Total siniestros · Casos Rojos · Casos Amarillos · Casos Verdes · Score heurístico promedio · Monto total · Monto en rojos · Ahorro potencial estimado

**Score display:** el dashboard muestra el `score_final` consolidado. El detalle de las 3 capas se ve en la pantalla de detalle individual.

**Gráficos:** Donut distribución · Top proveedores · Casos por ramo · Histograma score_final

### 8.3 Bandeja de casos (`/casos`) — CU-03 CU-06
- Tabla ordenada por `score_final` descendente
- Filtros: nivel_riesgo · ramo · ciudad · proveedor · rango score · reglas activadas
- Celda REGLAS: chips de los códigos de reglas críticas activadas (RF-XX)
- Exportación: CSV rojos / Top 10 / Reporte HTML

### 8.4 Detalle de siniestro (`/casos/[id]`) — CU-02 CU-04

**Score breakdown — 3 capas visibles:**
1. **Reglas críticas activadas:** lista de chips `RF-XX` con clasificación y evidencia. Cada regla viene de `REGLA_ALERTA` como array separado. Muestra `nombre_regla`, `clasificacion`, `evidencia`, `explicacion` de cada alerta.
2. **Score heurístico:** número + ScoreBar + lista de factores que lo componen
3. **Modelo ML:** tarjeta con `prediccion_ml` (Sospechoso/Normal) + `probabilidad_ml` como porcentaje prominente

**Score final:** número grande con `nivel_riesgo` y `accion_sugerida`

**Explicación IA:** campo `explicacion_final` ya persistido en Supabase — no se regenera

**Mensaje IA:** campo `mensaje_ia` — la interpretación del agente persistida

**Mensaje ético:** siempre al final, siempre visible

### 8.5 Red de relaciones (`/red`)
Grafo D3.js de nodos: Asegurados · Proveedores · Siniestros

### 8.6 Proveedores (`/proveedores`)
Ranking + panel de detalle + simulador de ahorro

### 8.7 Agente (`/agente`) — CU-05
El agente consulta los datos de Supabase (vía el contexto cargado) para responder.
Usa los campos ya persistidos: `explicacion_final`, `mensaje_ia`, `reglas_criticas_activadas`, `factores_principales`, `probabilidad_ml`.
**El agente NO regenera explicaciones** — las lee de `SCORE_SINIESTRO`.
Solo genera respuestas nuevas para preguntas de agregación o análisis que no estén pre-calculados.

---

## 9. Agente IA — arquitectura híbrida

```
Enfoque 0 — Clasificador (~150 tokens):
  Claude decide si puede responder con stats pre-calculados o necesita consulta dinámica

Enfoque 1 — Stats pre-calculados (~800 tokens total):
  Stats agregados del dataset + Claude redacta

Enfoque 3 — Text-to-code (~2000 tokens total):
  Claude genera query JS → servidor ejecuta → Claude interpreta resultado
  Fallback a Enfoque 1 si la ejecución falla
```

**Contexto disponible para el agente:**
- Stats globales del dataset (total, distribución por nivel, montos)
- Top 20 siniestros por score_final
- Para siniestros específicos: toda la fila de `SCORE_SINIESTRO` + array de `REGLA_ALERTA`
- Datos de proveedores (top alertas, en lista restrictiva)

---

## 10. API Routes (solo 2 — el resto lo maneja Supabase directamente)

### `POST /api/agent`
Body: `{ question: string, claims: SiniestroCompleto[] }`
Implementa el agente híbrido. API key protegida en servidor.
Devuelve `{ answer: string, debug: { enfoque: string, razon: string } }`

### `POST /api/export`
Body: `{ type: "red" | "top10" | "executive", claims: SiniestroCompleto[] }`
Devuelve CSV o HTML como blob descargable.

---

## 11. Criterios de aceptación

| Sección | Criterio mínimo |
|---|---|
| Inicio | Carga desde Supabase o CSV demo funciona |
| Dashboard | 8 KPIs + 4 gráficos con datos reales de Supabase |
| Bandeja | Filtros funcionan; chips de reglas visibles en tabla |
| Detalle | 3 capas del score visibles; REGLA_ALERTA como array; explicación_final y mensaje_ia de Supabase, no regenerados |
| Red | Grafo con 3 tipos de nodos; click abre panel |
| Proveedores | Ranking correcto; slider de ahorro funciona |
| Agente | Responde con datos de Supabase; no regenera explicaciones persistidas |

---

## 12. Limitaciones del MVP

- Sin autenticación ni roles de usuario
- El agente no tiene memoria conversacional entre preguntas
- La red de relaciones usa los datos ya cargados en memoria (no consulta Supabase en tiempo real)
- El CSV de fallback no soporta `REGLA_ALERTA` como filas separadas (usa campo delimitado)

---

## 13. Agente IA — arquitectura SQL híbrida (ACTUALIZACIÓN CRÍTICA)

### Principio — datos en Supabase, no en memoria

El agente **NO** opera sobre un array en memoria. Opera contra **Supabase/Postgres** ejecutando SQL. El flujo es:

```
Pregunta del analista
        ↓
[LLM Clasificador] — lee QUERY_DESCRIPTIONS y decide:
   ¿esta pregunta hace match con alguna query pre-escrita?
        ↓
   ┌────┴──────────────────────────────────────────┐
   │ SÍ — query pre-escrita encontrada             │ NO — ninguna hace match
   │ Ejecutar la query en Supabase                 │ LLM genera SQL dinámico
   │ Si Q19: detectar ID, ejecutar 2 queries       │ Ejecutar en Supabase via RPC
   │                                               │ Fallback si falla: stats básicos
   └───────────────────────────────────────────────┘
        ↓                                          ↓
   resultado de la query                   resultado de la query
        ↓                                          ↓
   [LLM redacta en lenguaje natural con contexto del dominio antifraude]
        ↓
   Respuesta + disclaimer ético
```

### Las 13 queries pre-escritas (en `lib/agentQueries.ts`)

| Key | Pregunta que responde |
|---|---|
| `top10_mayor_riesgo` | Q18 — Top 10 por score_final |
| `detalle_riesgo_siniestro(id)` | Q19 — Por qué un siniestro específico fue marcado |
| `reglas_de_siniestro(id)` | Q19 complementaria — reglas activadas del siniestro |
| `proveedores_con_mas_alertas` | Q20 — Proveedores con más alertas |
| `ramos_mas_sospechosos` | Q21 — Ramos con mayor % sospechosos |
| `ciudades_mas_alertas` | Q22 — Ciudades con más alertas |
| `asegurados_frecuentes` | Q23 — Asegurados con más reclamos |
| `documentos_faltantes_criticos` | Q24 — Documentos faltantes en casos críticos |
| `montos_atipicos` | Q25 — Casos con montos atípicos |
| `cerca_inicio_poliza` | Q26 — Siniestros en borde de vigencia |
| `patrones_repetidos` | Q27 — Patrones en reclamos sospechosos |
| `resumen_ejecutivo` | Q28 — Resumen ejecutivo |
| `prioridad_revision` | Q29 — Casos a revisar primero |

Las queries SQL completas están en `CLAUDE.md` sección "Agente IA — queries SQL pre-escritas".

### Caso especial Q19 — respuesta estructurada en 3 capas

Cuando el agente detecta un ID de siniestro en la pregunta:
1. Ejecuta `detalle_riesgo_siniestro(id)` — datos del siniestro + score
2. Ejecuta `reglas_de_siniestro(id)` — array de reglas activadas
3. El LLM redacta siguiendo la plantilla `NARRATIVE_TEMPLATE_Q19`:

```
"El siniestro [ID] presenta riesgo [NIVEL].

[Capa 1 — Reglas críticas:]
Se activaron las reglas: RF-XX ([nombre]), RF-YY ([nombre]).
Por lo anterior, fue clasificado inicialmente en ROJO/AMARILLO.

[Capa 2 — Score heurístico:]
El score heurístico fue [N]/100, principalmente por:
• [factor 1 de factores_principales]
• [factor 2]

[Capa 3 — Modelo ML:]
El modelo ML analizó patrones históricos similares y estimó una 
probabilidad de fraude del [N]%.

Score final: [N]/100. Acción sugerida: [accion_sugerida]."
```

### Ejecución de SQL en Supabase desde la API route

El agente ejecuta las queries usando una función RPC en Supabase o la API de postgrest:

```typescript
// Para queries pre-escritas (seguras, sin input del usuario)
const { data, error } = await supabase.rpc('execute_safe_query', {
  query_name: 'top10_mayor_riesgo'
})

// Para SQL dinámico generado por el LLM (con sanitización)
// Solo se permite SELECT — nunca INSERT/UPDATE/DELETE
// Validar que el SQL generado empieza con SELECT antes de ejecutar
```

### Flujo en `/api/agent/route.ts`

```typescript
// 1. Recibir pregunta
// 2. Llamada 0 al LLM — clasificador (~150 tokens):
//    Input: pregunta + lista de QUERY_DESCRIPTIONS
//    Output JSON: { query_key: string|null, siniestro_id: string|null, razon: string }
//    Si query_key = null → generar SQL dinámico

// 3a. Query pre-escrita:
//    Obtener SQL de AGENT_QUERIES[query_key]
//    Si es función (Q19): pasar siniestro_id
//    Si es Q19: ejecutar también reglas_de_siniestro
//    Ejecutar en Supabase
//    Pasar resultado al LLM para redacción

// 3b. SQL dinámico:
//    Llamada al LLM para generar SELECT válido
//    Validar que empieza con SELECT (nunca ejecutar DML)
//    Ejecutar en Supabase
//    Si falla: responder con stats básicos como fallback

// 4. Llamada de redacción al LLM (~800-1000 tokens):
//    Input: pregunta + resultado de la query + contexto del dominio
//    Si es Q19: usar NARRATIVE_TEMPLATE_Q19
//    Output: respuesta en lenguaje natural

// 5. Devolver: { answer, debug: { enfoque, query_usada, razon } }
```

---

## 14. Agente IA — Arquitectura v2 (ACTUAL)

Esta arquitectura **supersede** las secciones 9, 10 y 13. El agente ya no es solo
"clasificador → SQL". Es un **agente híbrido enterprise** con routing de intención.

### Flujo

```
Frontend (ChatInterface) → POST /api/chat → Intent Router (lib/ai/router.ts)
   ├─ A) Conversacional  → system prompt + LLM (sin base de datos)
   ├─ B) Catálogo        → función tipada (lib/ai/catalog.ts) sobre datos cargados
   └─ C) SQL dinámico    → SELECT validado → RPC readonly run_query (opcional)
                           → redacción LLM
```

- **A — Conversacional:** saludos, identidad, capacidades, ayuda, preguntas sobre la
  plataforma. Solo `lib/ai/system-prompt.ts` + LLM. No consulta la base.
- **B — Catálogo:** las preguntas frecuentes se resuelven con **funciones tipadas** (no SQL
  crudo) en `lib/ai/catalog.ts`. El router las elige por **descripción semántica** (no lee la
  implementación → menos tokens, más rápido, más seguro). No requiere la RPC `run_query`.
- **C — SQL dinámico (último recurso):** si ninguna del catálogo aplica, el LLM genera un
  `SELECT` validado (`lib/ai/sql-validator.ts`) y se ejecuta vía la RPC opcional `run_query`
  (readonly). Si la RPC no existe, degrada con gracia.

### Módulos (`lib/ai/`)
`system-prompt.ts` · `router.ts` · `catalog.ts` · `data-access.ts` · `sql-validator.ts`.

### Endpoint
`POST /api/chat` — body `{ question, history }`, respuesta `{ answer, debug: { mode, detail } }`
donde `mode ∈ { conversacional, catalogo, dinamico }`.

### LLM intercambiable
`lib/llm.ts` con `LLM_PROVIDER` (`anthropic` | `gemini`). Keys en `.env.local`
(`ANTHROPIC_API_KEY` / `GEMINI_API_KEY`). Modelos: `ANTHROPIC_MODEL`, `GEMINI_MODEL`.

### Datos
`loadScoredClaims` intenta la vista `v_siniestro_completo`; si falla, hace JOIN de tablas base.
El agente funciona aunque la vista no exista. La RPC `run_query` es opcional (solo camino C).
