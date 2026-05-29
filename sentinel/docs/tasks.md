# tasks.md — FraudIA Dashboard
## Lista de tareas para Claude Code

Lee `CLAUDE.md` (raíz), luego `docs/spec.md`, luego este archivo.
Ejecuta tareas en orden. Marca [x] en cada subtarea al completarla.
Después de cada FASE: ejecuta `npm run type-check` — debe terminar sin errores.

---

## FASE 0 — Setup del proyecto

### TASK-001: Inicializar proyecto y dependencias
- [ ] `npx create-next-app@latest fraudia-dashboard --typescript --tailwind --app --no-src-dir`
- [ ] `cd fraudia-dashboard`
- [ ] `npx shadcn@latest init` — style=Default, color=Slate, CSS variables=yes
- [ ] `npx shadcn@latest add table badge button card select slider switch tabs separator sheet`
- [ ] `npm install recharts papaparse @anthropic-ai/sdk d3 @supabase/supabase-js`
- [ ] `npm install -D @types/papaparse @types/d3`
- [ ] Verificar que `npm run dev` levanta sin errores

### TASK-002: Configurar tema visual desde el prototipo de Design
- [ ] Leer `docs/design/styles.css` completo
- [ ] Copiar las CSS variables, keyframes y clases utilitarias a `app/globals.css`
- [ ] Asegurar que están: `@keyframes fillBar`, `@keyframes pulse`, `@keyframes shimmer`
- [ ] Asegurar que está la clase `.row-hover` con `translateX(2px)`
- [ ] En `app/layout.tsx`: cargar Syne, DM Mono, DM Sans via `next/font/google`
- [ ] Aplicar `body { background: var(--bg-base); color: var(--text-primary); }`
- [ ] Verificar que el fondo de la app es `#0A0B0F`

### TASK-003: Crear tipos y constantes
- [ ] Crear `lib/types.ts` con todos los tipos del CLAUDE.md:
  - `RiskLevel`, `RuleClassification`, `MLPrediction`
  - `ReglaAlerta` — interface completa con todos los campos de REGLA_ALERTA
  - `ScoreSiniestro` — interface completa con todos los campos de SCORE_SINIESTRO
  - `SiniestroBase`, `SiniestroCompleto` (con campo `reglas?: ReglaAlerta[]`)
  - `ClaimsStats`, `AgentMessage`, `FilterState`, `ProveedorStats`
- [ ] Crear `lib/constants.ts`:
  - `RISK_COLORS` con CSS variables (no hex)
  - `RULE_SEVERITY_COLORS` — colores por severidad CRÍTICA/ALTA/MEDIA
  - `SCORE_BAR_COLORS` — colores para heurístico/ML/final
  - `SUGGESTED_QUESTIONS` — las 11 preguntas del reto
  - `COMPLEX_QUESTIONS_EXAMPLES` — 3 preguntas complejas de ejemplo
  - `ETHICAL_MESSAGE` — texto del aviso ético
  - `SUPABASE_TABLES` — objeto con nombres de tablas: `{ SINIESTRO, REGLA_ALERTA, SCORE_SINIESTRO, PROVEEDOR }`

---

## FASE 1 — Supabase y datos

### TASK-004: Configurar cliente Supabase
- [ ] Crear `lib/supabase.ts` con `createClient` usando las env vars
- [ ] Crear `.env.example` con las 3 variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`
- [ ] Agregar `.env.local` al `.gitignore`

### TASK-005: Crear queries Supabase (`lib/queries.ts`)
- [ ] `getSinestrosCompletos(): Promise<SiniestroCompleto[]>`
  - Query a la vista `v_siniestro_completo` (o JOIN equivalente de SINIESTRO + SCORE_SINIESTRO + POLIZA + ASEGURADO + PROVEEDOR)
  - Si falla: retornar array vacío y loguear el error (el DataContext manejará el fallback)
- [ ] `getReglasBySiniestro(id_siniestro: string): Promise<ReglaAlerta[]>`
  - Query a `REGLA_ALERTA` WHERE `id_siniestro = id`
  - Retorna array — puede ser vacío si no hay reglas activadas
- [ ] `getSiniestroById(id: string): Promise<SiniestroCompleto | null>`
  - Query siniestro específico con JOIN completo
- [ ] `getTopProveedores(): Promise<ProveedorStats[]>`
  - Agregación de PROVEEDOR + conteo de siniestros por nivel_riesgo
- [ ] `getReglasByMultipleSiniestros(ids: string[]): Promise<Record<string, ReglaAlerta[]>>`
  - Query masiva para cargar reglas de múltiples siniestros
  - Retorna mapa `{ id_siniestro: ReglaAlerta[] }`

### TASK-006: Crear mock CSV de compatibilidad
Crear `public/data/mock_claims.csv` con 100 filas compatibles con `SiniestroCompleto`:
- [ ] Todas las columnas del contrato (spec.md sección 7)
- [ ] 30 rojos (score_final 76-100), 40 amarillos (41-75), 30 verdes (0-40)
- [ ] `reglas_criticas_activadas`: string delimitado "RF-01,RF-02" para los casos con reglas
- [ ] `prediccion_ml`: 0 o 1 coherente con `score_final`
- [ ] `probabilidad_ml`: decimal 0.0-1.0 coherente con `prediccion_ml` (si pred=1, prob >= 0.5)
- [ ] `score_heuristico`: independiente de `score_final`
- [ ] `explicacion_final` y `mensaje_ia`: texto real en español (no placeholders)
- [ ] PROV-003 y PROV-007: `en_lista_restrictiva=true`, mayoría de casos rojos
- [ ] Al menos 5 con `reglas_criticas_activadas = "RF-02"` (falsificación — clasificación ROJO)
- [ ] Al menos 3 con descripciones muy similares (para demostrar NLP)
- [ ] `nivel_riesgo` coherente con `score_final`

### TASK-007: Crear parseCSV.ts con compatibilidad al nuevo modelo
Crear `lib/parseCSV.ts`:
- [ ] `parseClaimsCSV(content: string): Promise<SiniestroCompleto[]>`
- [ ] `normalizeSiniestroRow(row: Record<string, string>): SiniestroCompleto`
  - Convierte strings a números y booleanos
  - `nivel_riesgo`: normaliza a "VERDE"|"AMARILLO"|"ROJO" (mayúsculas)
  - `prediccion_ml`: convierte "0"/"1" a number
  - `probabilidad_ml`: convierte string a float
- [ ] `parseReglasCriticas(reglas_string: string): ReglaAlerta[]`
  - Convierte "RF-01,RF-02" en array de `ReglaAlerta` mínimos para el modo CSV
  - Solo dispondrá de `codigo_regla` y `clasificacion` estimada

### TASK-008: Crear claimsUtils.ts
Crear `lib/claimsUtils.ts` — funciones puras de agregación sobre datos ya cargados:
- [ ] `computeStats(claims: SiniestroCompleto[]): ClaimsStats`
- [ ] `filterClaims(claims: SiniestroCompleto[], filters: FilterState): SiniestroCompleto[]`
- [ ] `getTopProviders(claims: SiniestroCompleto[], n?: number): ProveedorStats[]`
- [ ] `getCasesByRamo(claims: SiniestroCompleto[])`
- [ ] `getCasesByCity(claims: SiniestroCompleto[], n?: number)`
- [ ] `getScoreHistogramData(claims: SiniestroCompleto[])`
- [ ] `buildGraphData(claims: SiniestroCompleto[]): { nodes: GraphNode[], links: GraphLink[] }`
- [ ] `computeSavingsEstimate(claims: SiniestroCompleto[], pct: number): number`

### TASK-009: Crear agentContext.ts
Crear `lib/agentContext.ts`:
- [ ] `buildAvailableStats(claims: SiniestroCompleto[]): Record<string, string>`
  - Incluir en los stats: `top20`, `resumen`, `proveedores`, `ramos`, `ciudades`, `schema`
  - El resumen debe incluir: distribución de niveles, score_heuristico promedio, probabilidad_ml promedio
- [ ] `buildClassifierPrompt(question: string, statNames: string[]): string`
- [ ] `buildEnfoque1Prompt(question: string, selectedStats: Record<string, string>): string`
  - El system prompt debe mencionar las 3 capas: reglas críticas, score heurístico, modelo ML
- [ ] `buildCodeGeneratorPrompt(question: string, schema: string): string`
- [ ] `buildInterpreterPrompt(question: string, result: unknown, total: number): string`
- [ ] `formatSiniestroForContext(s: SiniestroCompleto): string`
  - Incluir en el formato compacto: `score_heuristico`, `probabilidad_ml`, `reglas_criticas_activadas`

### TASK-010: Crear DataContext
Crear `context/DataContext.tsx`:
- [ ] Intentar cargar desde Supabase con `getSinestrosCompletos()`
- [ ] Si Supabase falla o no está configurado: cargar `public/data/mock_claims.csv` como fallback
- [ ] Exponer: `claims`, `stats`, `isLoading`, `error`, `dataSource` ("supabase" | "csv")
- [ ] `getReglasBySiniestroId(id: string): Promise<ReglaAlerta[]>`
  - En modo Supabase: llamar a `getReglasBySiniestro(id)`
  - En modo CSV: parsear `reglas_criticas_activadas` del siniestro con `parseReglasCriticas()`
- [ ] Hook `useData()` con error si se usa fuera del provider

---

## FASE 2 — Layout global y componentes compartidos

### TASK-011: Crear layout con Sidebar y Topbar
Crear `app/layout.tsx`:
- [ ] Envolver con `DataProvider`
- [ ] Sidebar fija + main con Topbar — excepto en `/` (inicio sin sidebar)
- [ ] Detectar ruta con `usePathname` para ocultar sidebar en inicio

Crear `components/shared/Sidebar.tsx` (referencia: `docs/design/app.jsx`):
- [ ] Logo `FRAUD·IA` en Syne 600, punto en `var(--accent)`
- [ ] Subtítulo `UNIDAD ANTIFRAUDE` DM Mono 11px uppercase terciario
- [ ] Links con íconos Lucide: Inicio · Dashboard · Bandeja (badge rojo) · Red · Proveedores · Agente (dot verde pulsante)
- [ ] Link activo: `border-left: 2px solid var(--accent)` + fondo `var(--bg-elevated)`
- [ ] Footer: fuente de datos activa (🟢 Supabase | 🟡 CSV Demo) + N registros + botón "Cargar nuevo"

Crear `components/shared/Topbar.tsx`:
- [ ] Breadcrumb de la sección
- [ ] Buscador de siniestros por ID
- [ ] Botón Exportar con dropdown

### TASK-012: Crear componentes globales compartidos
Crear `components/shared/RiskBadge.tsx` (referencia: `docs/design/components.jsx`):
- [ ] Props: `level: RiskLevel`, `size?: "sm"|"md"|"lg"`
- [ ] Dot pulsante en rojo (`animation: pulse 2s infinite`)
- [ ] Colores via `RISK_COLORS`

Crear `components/casos/ScoreBar.tsx`:
- [ ] Props: `value: number`, `color?: string`, `height?: number`, `animated?: boolean`
- [ ] Animación `fillBar` con `--target-width: ${value}%`

---

## FASE 3 — Pantalla de inicio

### TASK-013: Pantalla de inicio (`app/page.tsx`)
Referencia: `docs/design/page-inicio-dashboard.jsx` y `docs/design/FraudIA.html`
- [ ] Full screen sin sidebar. Fondo `var(--bg-base)` + grid pattern SVG sutil + resplandor radial
- [ ] Badge, heading `FRAUD·IA`, subheading
- [ ] Caja ética con borde-left `2px solid var(--accent)`
- [ ] Botón primario "Cargar dataset demo" → activa fallback CSV → redirige `/dashboard`
- [ ] Botón secundario "Conectar a Supabase" → activa carga desde Supabase → redirige `/dashboard`
- [ ] Indicador de estado: si Supabase vars están configuradas, mostrar estado de conexión
- [ ] Error de conexión: mensaje descriptivo con alternativa CSV
- [ ] Toast de éxito con N registros cargados y fuente (Supabase/CSV)

---

## FASE 4 — API Routes

### TASK-014: Crear `/api/agent/route.ts` — agente híbrido
- [ ] `POST` handler
- [ ] Validar body: `{ question: string, claims: SiniestroCompleto[] }`
- [ ] Instanciar Anthropic con `process.env.ANTHROPIC_API_KEY`
- [ ] **Enfoque 0:** Llamada clasificadora (max_tokens 150, devuelve JSON)
  - `{ puedeResponder: boolean, statsNecesarios: string[], razon: string }`
  - Si falla el parse JSON: default `puedeResponder: false`
- [ ] **Enfoque 1:** Stats pre-calculados + Claude redacta (max_tokens 800)
- [ ] **Enfoque 3:** Text-to-code:
  - Llamada A: Claude genera `function query(claims)` (max_tokens 400)
  - Limpiar markdown del código
  - Ejecutar: `new Function('claims', code + '\nreturn query(claims);')(claims)`
  - Limitar resultado: si array, `slice(0, 20)`
  - Si error: fallback a Enfoque 1
  - Llamada B: Claude interpreta (max_tokens 800)
- [ ] Devolver `{ answer: string, debug: { enfoque: "stats"|"code", razon: string } }`

### TASK-015: Crear `/api/export/route.ts`
- [ ] `POST` handler: `{ type: "red"|"top10"|"executive", claims: SiniestroCompleto[] }`
- [ ] CSV: columnas de reporte (id_siniestro, nivel_riesgo, score_final, ramo, ciudad, proveedor, monto_reclamado, reglas_criticas_activadas, probabilidad_ml, explicacion_final, accion_sugerida)
- [ ] HTML: tabla formateada con header, logo y mensaje ético al final
- [ ] Headers correctos para descarga

---

## FASE 5 — Dashboard

### TASK-016: Crear componentes de gráficos
Referencia: `docs/design/page-inicio-dashboard.jsx` y `docs/design/components.jsx`

Todos usan Recharts con tooltips custom dark (fondo `var(--bg-surface)`, borde `var(--border)`).

Crear `components/dashboard/KPICard.tsx`:
- [ ] Props: `title`, `value`, `subtitle?`, `variant?`
- [ ] Sigue el diseño del prototipo de referencia

Crear los 4 gráficos: `RiskDistributionChart`, `TopProvidersChart`, `CasesByRamoChart`, `ScoreHistogram`

### TASK-017: Crear página de dashboard (`app/dashboard/page.tsx`)
Referencia: `docs/design/page-inicio-dashboard.jsx`
- [ ] 8 KPIs: Total · Rojos · Amarillos · Verdes · Score heurístico promedio · Monto total · Monto rojos · Ahorro potencial
- [ ] 4 gráficos en grid
- [ ] Estado vacío si no hay datos con link a inicio

---

## FASE 6 — Bandeja de casos

### TASK-018: CasosFilters
Referencia: `docs/design/page-casos-detalle.jsx`
- [ ] Props: `claims`, `filters: FilterState`, `onChange`
- [ ] Filtros: nivel_riesgo · ramo · ciudad · proveedor search · score range · toggles de alertas

### TASK-019: CasosTable
- [ ] Celda REGLAS: renderizar `reglas_criticas_activadas.split(',')` como chips RF-XX de color
  - Chip ROJO si RF-01, RF-02, RF-04 · AMARILLO si RF-05, RF-06, RF-07
- [ ] Celda SCORE: `score_final` bold + ScoreBar 6px
- [ ] Celda ML: `(probabilidad_ml * 100).toFixed(0)}%` en DM Mono
- [ ] `.row-hover` en cada fila

### TASK-020: Página de bandeja (`app/casos/page.tsx`) — CU-03 CU-06
- [ ] Layout filtros + tabla
- [ ] Botones exportación con POST a `/api/export`
- [ ] Click en fila → `/casos/[id]`

---

## FASE 7 — Detalle de siniestro

### TASK-021: Crear ScoreBreakdown
Crear `components/detalle/ScoreBreakdown.tsx`:
- [ ] Muestra **3 secciones separadas** correspondientes a las 3 capas:

  **Sección 1 — Reglas críticas** (título: "Reglas críticas activadas")
  - Recibe `reglas: ReglaAlerta[]` — ARRAY, no string
  - Si el array está vacío: mostrar "Sin reglas críticas activadas" en verde
  - Si hay reglas: cada `ReglaAlerta` como card expandible:
    - Header: chip `codigo_regla` + badge `clasificacion` (ROJO/AMARILLO) + `nombre_regla`
    - Expandido: `variable_evaluada`, `valor_detectado`, `evidencia`, `explicacion`
  - Nota: si estamos en modo CSV, las reglas vienen de `parseReglasCriticas()` y solo tienen código

  **Sección 2 — Score heurístico** (título: "Análisis heurístico")
  - `score_heuristico` con ScoreBar animada
  - `factores_principales` como lista de chips

  **Sección 3 — Modelo ML** (título: "Modelo de aprendizaje automático")
  - `prediccion_ml`: badge "SOSPECHOSO" (rojo) o "NORMAL" (verde)
  - `probabilidad_ml`: número grande en DM Mono `(probabilidad_ml * 100).toFixed(0)}%`
  - Subtexto: "Probabilidad estimada de fraude basada en patrones históricos"

  **Score final** (al final del breakdown):
  - Número grande Syne 64px + `nivel_riesgo` + `accion_sugerida`

Crear `components/detalle/ReglasCriticasList.tsx`:
- [ ] Extraído del ScoreBreakdown para reutilización
- [ ] Props: `reglas: ReglaAlerta[]`, `isLoading?: boolean`

### TASK-022: Crear MLInsight
Crear `components/detalle/MLInsight.tsx`:
- [ ] Props: `prediccion_ml: MLPrediction`, `probabilidad_ml: number`, `version_modelo: string`
- [ ] Layout de tarjeta con: predicción como badge + probabilidad como número grande + nota explicativa
- [ ] `version_modelo` en DM Mono 11px terciario al final

### TASK-023: Crear NarrativeAnalysis y EthicsMessage
Crear `components/detalle/NarrativeAnalysis.tsx`:
- [ ] Props: `siniestro: SiniestroCompleto`, `allClaims: SiniestroCompleto[]`
- [ ] Mostrar `descripcion` en caja monospace
- [ ] Nota sobre similitud si `reglas_criticas_activadas` incluye RF-07

Crear `components/detalle/EthicsMessage.tsx`:
- [ ] Siempre mostrar `mensaje_ia` si existe, sino el `ETHICAL_MESSAGE` de constants
- [ ] Fondo `var(--bg-surface)`, borde-left `2px solid var(--accent)`

### TASK-024: Página de detalle (`app/casos/[id]/page.tsx`) — CU-02 CU-04
Referencia: `docs/design/page-casos-detalle.jsx`
- [ ] Al montar: cargar siniestro de `useData()` + cargar reglas con `getReglasBySiniestroId(id)`
- [ ] Estado de carga skeleton mientras se obtienen las reglas
- [ ] Header: ID + RiskBadge + accion_sugerida destacada
- [ ] Columna izquierda: ScoreBreakdown (con las 3 secciones) + NarrativeAnalysis
- [ ] Columna derecha: grid datos + tabla montos + flags de riesgo
- [ ] Full width: `explicacion_final` (borde-left acento) → mostrar el valor de Supabase, NO regenerar
- [ ] Full width: EthicsMessage con `mensaje_ia`
- [ ] Botón flotante "Consultar al agente →" → `/agente?siniestro=[id]`
- [ ] Mostrar `fecha_evaluacion` y `version_modelo` en footer del detalle

---

## FASE 8 — Red de relaciones

### TASK-025: RelationGraph con D3.js
Crear `components/red/RelationGraph.tsx` con `'use client'`:
Referencia: `docs/design/page-red-proveedores-agente.jsx`
- [ ] `useRef<SVGSVGElement>` + D3 force simulation
- [ ] 3 tipos de nodos: asegurados (círculo), proveedores (diamante), siniestros (cuadrado)
- [ ] Links: rojos punteados si siniestro en rojo
- [ ] Click en nodo → `onNodeClick(type, id)`
- [ ] Zoom y pan con `d3.zoom()`
- [ ] Botones: "Aislar críticos" / "Vista completa"
- [ ] Cleanup en return del useEffect

### TASK-026: Página de red (`app/red/page.tsx`)
- [ ] `dynamic(RelationGraph, { ssr: false })`
- [ ] Panel lateral Sheet al click en nodo
- [ ] Leyenda de tipos de nodo

---

## FASE 9 — Proveedores y simulación de ahorro

### TASK-027: Componentes de proveedores
Referencia: `docs/design/page-red-proveedores-agente.jsx`
Crear `ProveedoresTable`, `ProveedorDetailPanel`, `SavingsSimulator` (ver spec.md sección 8.6)

### TASK-028: Página de proveedores (`app/proveedores/page.tsx`)
- [ ] Tabla ranking + panel deslizante + SavingsSimulator

---

## FASE 10 — Agente de consultas (SQL híbrido)

### TASK-029: Crear agentQueries.ts
Crear `lib/agentQueries.ts` con las 13 queries SQL pre-escritas definidas en CLAUDE.md:
- [ ] Copiar exactamente las queries del CLAUDE.md a este archivo
- [ ] `AGENT_QUERIES` como objeto con todas las queries (funciones para las que requieren ID)
- [ ] `QUERY_NAMES` — array de keys para el clasificador
- [ ] `QUERY_DESCRIPTIONS` — mapa de key → descripción legible para el clasificador
- [ ] `NARRATIVE_TEMPLATE_Q19` — plantilla de texto con los 3 bloques de capas para Q19
- [ ] Verificar que cada query usa solo las tablas definidas en el modelo de datos del CLAUDE.md

### TASK-030: Crear agentContext.ts con soporte SQL
Crear `lib/agentContext.ts`:
- [ ] `buildClassifierPrompt(question: string): string`
  - Input para el LLM: la pregunta + lista de QUERY_DESCRIPTIONS
  - Pide al LLM que devuelva JSON: `{ query_key: string|null, siniestro_id: string|null, razon: string }`
  - Si ninguna query hace match: `query_key = null`
  - Si detecta un ID de siniestro (regex `/SIN-\d+/i`): extraerlo en `siniestro_id`
- [ ] `buildRedactionPrompt(question: string, queryResult: unknown, queryKey: string): string`
  - Si `queryKey === 'detalle_riesgo_siniestro'`: usar `NARRATIVE_TEMPLATE_Q19`
  - Para otras queries: prompt genérico con contexto del dominio antifraude + resultado
  - System prompt SIEMPRE incluye: las 3 capas del sistema, disclaimer ético, responder en español
- [ ] `buildDynamicSQLPrompt(question: string, schema: string): string`
  - Prompt para que el LLM genere un SELECT válido para Postgres
  - Incluir el schema completo de las tablas (del CLAUDE.md)
  - Regla explícita: "Solo SELECT, nunca INSERT/UPDATE/DELETE/DROP"
- [ ] `formatQueryResultForContext(result: unknown[], queryKey: string): string`
  - Convierte el resultado de la query a texto compacto para el LLM de redacción
  - Limitar a 20 filas máximo

### TASK-031: Crear `/api/agent/route.ts` — agente SQL híbrido
- [ ] `POST` handler
- [ ] Validar body: `{ question: string }` — ya no se manda el array de claims
- [ ] Instanciar Anthropic y Supabase client (server-side)

  **Llamada 0 — Clasificador (~150 tokens):**
  - Usar `buildClassifierPrompt(question)`
  - Parse JSON de la respuesta: `{ query_key, siniestro_id, razon }`
  - Si falla el parse: asumir `query_key = null`

  **Ruta A — Query pre-escrita:**
  - Si `query_key` es válido y existe en `AGENT_QUERIES`:
  - Obtener el SQL: si es función, llamar con `siniestro_id`
  - Si `query_key === 'detalle_riesgo_siniestro'`: ejecutar TAMBIÉN `reglas_de_siniestro(siniestro_id)` y combinar resultados
  - Ejecutar en Supabase: `supabase.rpc('run_query', { sql })` o directamente con `supabase.from()`
  - Llamada de redacción al LLM con `buildRedactionPrompt(question, result, query_key)`

  **Ruta B — SQL dinámico:**
  - Si `query_key === null`:
  - Llamada al LLM con `buildDynamicSQLPrompt(question, schemaDescription)`
  - Extraer el SQL generado
  - **Validar:** el SQL DEBE empezar con `SELECT` (case insensitive) — si no, RECHAZAR
  - Ejecutar en Supabase
  - Si falla la ejecución: responder con mensaje de que la consulta no pudo ejecutarse
  - Llamada de redacción al LLM con el resultado

- [ ] Devolver: `{ answer: string, debug: { enfoque: "sql_preescrito"|"sql_dinamico", query_usada: string, razon: string } }`

### TASK-032: Crear SuggestedQuestions
Crear `components/agente/SuggestedQuestions.tsx`:
Referencia: `docs/design/page-red-proveedores-agente.jsx`
- [ ] Props: `onSelect: (q: string) => void`
- [ ] Renderizar las 11 preguntas del reto como chips/cards clicables
- [ ] Cards: fondo `var(--bg-surface)`, hover borde `var(--accent)`, flecha → al hover
- [ ] Sección separada para preguntas de ejemplo complejas (3 ejemplos que demuestren SQL dinámico):
  - "¿Cuáles son los 8 casos de Vehículos en Quito con documentos inconsistentes ordenados por monto?"
  - "¿Qué proveedores de Guayaquil tienen más del 50% de casos rojos?"
  - "¿Qué asegurados tienen más de 3 reclamos en los últimos 12 meses y score mayor a 70?"
- [ ] Estas 3 preguntas deben activar la ruta SQL dinámica para demostrar el Enfoque B

### TASK-033: Crear ChatInterface
Crear `components/agente/ChatInterface.tsx`:
Referencia: `docs/design/page-red-proveedores-agente.jsx`
- [ ] Props: `initialQuestion?: string`
- [ ] Estado: `messages: AgentMessage[]`, `input: string`, `isLoading: boolean`
- [ ] Al montar con `initialQuestion`: enviar automáticamente
- [ ] Área de mensajes con scroll automático al último
- [ ] Estado vacío: ícono + texto Syne + subtexto DM Sans
- [ ] Burbuja usuario: derecha, fondo `var(--accent)`
- [ ] Burbuja agente: izquierda, fondo `var(--bg-surface)`
  - Header: `FRAUD·IA` DM Mono 10px uppercase `var(--accent)` + timestamp
  - Indicador de enfoque:
    - `⚡ Consulta SQL pre-escrita` si `message.enfoque === 'sql_preescrito'`
    - `⟨/⟩ SQL generado dinámicamente` si `message.enfoque === 'sql_dinamico'`
    - Query key usada en DM Mono 10px terciario (para transparencia/auditoría)
- [ ] Loading: 3 dots pulse staggered
- [ ] En `handleSend`:
  1. Agregar mensaje usuario
  2. POST a `/api/agent` con solo `{ question: input }` — ya NO se manda el array de claims
  3. Agregar respuesta con `enfoque` y `query_usada` del debug
- [ ] Botón "Nueva conversación"

### TASK-034: Página del agente (`app/agente/page.tsx`) — CU-05
- [ ] Verificar datos cargados — si no, redirigir a `/`
- [ ] Leer `?siniestro=SIN-XXXX` con `useSearchParams()`
- [ ] Si hay `?siniestro`: pre-armar la pregunta "¿Por qué el siniestro [ID] fue marcado como alto riesgo?" y enviarla automáticamente al montar
- [ ] Layout: panel izquierdo 300px (SuggestedQuestions + contexto activo) + ChatInterface
- [ ] Contexto activo en panel izquierdo:
  - Fuente de datos: 🟢 Supabase / 🟡 CSV
  - N siniestros · N rojos · Score promedio heurístico
- [ ] Disclaimer sobre el chat en DM Mono 11px terciario

---

## FASE 11 — Integración final y verificación

### TASK-031: Verificar flujo de demo completo
- [ ] **Demo Supabase:** inicio → conectar Supabase → dashboard con datos reales → detalle con reglas como array → agente
- [ ] **Demo CSV fallback:** inicio → "Cargar dataset demo" → mismo flujo con datos del CSV
- [ ] **Demo agente:** pregunta sugerida (Enfoque 1) + pregunta libre compleja (Enfoque 3 con indicador)
- [ ] **Demo reglas críticas:** abrir un siniestro con múltiples reglas → verificar que se muestran como cards expandibles individuales, no como string
- [ ] **Demo ML:** verificar que `probabilidad_ml` se muestra como porcentaje prominente en el detalle
- [ ] **Demo exportación:** CSV + HTML descargan correctamente

### TASK-032: README.md
- [ ] Descripción del sistema y la arquitectura de 3 capas
- [ ] Requisitos: Node >= 18, cuenta Supabase, API key Anthropic
- [ ] Configuración del `.env.local`
- [ ] Cómo usar en modo Supabase vs modo CSV
- [ ] Explicación del agente (dos enfoques, sin jerga técnica)
- [ ] Limitaciones y mensaje ético

### TASK-033: Revisión final de calidad
- [ ] `npm run type-check` → cero errores
- [ ] `npm run build` → sin errores
- [ ] `.env.local` no en el repositorio
- [ ] `ReglasCriticasList` nunca recibe un string — siempre `ReglaAlerta[]`
- [ ] `explicacion_final` y `mensaje_ia` se leen de Supabase, nunca se regeneran en el detalle
- [ ] Responsive funcional en 1440px, 1280px, 1024px

---

## Orden de ejecución

```
FASE 0 → FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 6 → FASE 7 → FASE 8 → FASE 9 → FASE 10 → FASE 11
001-003  004-010  011-012   013     014-015  016-017  018-020  021-024  025-026  027-028   029-030   031-033
```

Si una tarea tiene una dependencia no terminada, implementar stub/mock temporal y continuar.

---

## FASE 12 — Agente híbrido v2 (refactor) ✅

Reemplaza el agente "solo SQL" por una arquitectura con routing de intención.

- [x] TASK-A1: `lib/ai/system-prompt.ts` — identidad/propósito/capacidades/tono/reglas de FRAUD·IA.
- [x] TASK-A2: `lib/ai/data-access.ts` — `loadScoredClaims` (vista con fallback a JOIN de tablas base), `getSiniestroDetail`, `runReadonlySQL`.
- [x] TASK-A3: `lib/ai/catalog.ts` — catálogo de consultas frecuentes como **funciones tipadas** con descripción semántica (sin SQL crudo ni RPC).
- [x] TASK-A4: `lib/ai/sql-validator.ts` — validación readonly (solo SELECT, una sentencia, sin DML/DDL, whitelist de tablas, LIMIT forzado).
- [x] TASK-A5: `lib/ai/router.ts` — intent routing: conversacional | catálogo | SQL dinámico.
- [x] TASK-A6: `app/api/chat/route.ts` — endpoint centralizado `{ question, history }`; manejo de errores enterprise.
- [x] TASK-A7: `lib/llm.ts` — LLM intercambiable `LLM_PROVIDER` (anthropic | gemini).
- [x] TASK-A8: `ChatInterface` consume `/api/chat` con historial; indicador de modo.
- [x] TASK-A9: eliminada la dependencia OBLIGATORIA de la RPC `run_query` (catálogo = funciones tipadas; SQL dinámico opcional).
