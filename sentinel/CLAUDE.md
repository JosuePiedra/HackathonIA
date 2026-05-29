# CLAUDE.md — SENTINEL Dashboard

Lee este archivo completo antes de escribir una sola línea de código.
Después lee `docs/spec.md` y `docs/tasks.md`.

---

## Identidad del proyecto

**Proyecto:** SENTINEL Dashboard — Detector de Posibles Fraudes en Siniestros
**Stack:** Next.js 14 App Router · TypeScript · Supabase/Postgres · Tailwind CSS · shadcn/ui · Recharts · D3.js
**Propósito:** Dashboard enterprise dark para analistas de la Unidad Antifraude. Visualiza el resultado del pipeline antifraude híbrido (reglas críticas + score heurístico + modelo ML). El frontend NO recalcula lógica — solo consume resultados persistidos en Supabase.

---

## Reglas absolutas — nunca violar

1. **API key de Anthropic nunca al cliente.** Solo en `app/api/`. El frontend llama a `/api/agent`.
2. **Nunca regenerar explicaciones persistidas.** `explicacion_final`, `mensaje_ia`, `accion_sugerida` vienen de Supabase — se muestran tal cual.
3. **Frontend nunca recalcula lógica de negocio.** No calcular scores, no evaluar reglas.
4. **REGLA_ALERTA es un array.** Cada siniestro puede tener múltiples. Siempre `ReglaAlerta[]`.
5. **Nunca usar `any` en TypeScript** sin comentario justificado. Usar tipos de `lib/types.ts`.
6. **Colores siempre via CSS variables.** Nunca Tailwind hardcodeado para el tema.
7. **Mensaje ético siempre visible** en detalle del siniestro y respuestas del agente.
8. **Referencia visual:** leer `docs/design/styles.css` y los JSX antes de crear componentes.

---

## Modelo de datos completo — Supabase/Postgres

Claude Code debe conocer TODAS las tablas. El agente SQL las usa para construir queries.

### SINIESTRO (tabla central)
```sql
CREATE TABLE siniestro (
  id_siniestro        TEXT PRIMARY KEY,
  id_poliza           TEXT REFERENCES poliza(id_poliza),
  id_asegurado        TEXT REFERENCES asegurado(id_asegurado),
  id_vehiculo         TEXT REFERENCES vehiculo(id_vehiculo),
  id_proveedor        TEXT REFERENCES proveedor(id_proveedor),
  ramo                TEXT,          -- 'Vehículos'|'Salud'|'Vida'|'Hogar'
  cobertura           TEXT,
  fecha_ocurrencia    DATE,
  fecha_reporte       DATE,
  monto_reclamado     FLOAT,
  monto_estimado      FLOAT,
  monto_pagado        FLOAT,
  estado              TEXT,
  ciudad              TEXT,
  descripcion         TEXT,
  documentos_completos BOOLEAN,
  etiqueta_fraude_simulada INT       -- 0 o 1
);
```

### REGLA_ALERTA (una fila por regla activada — relación 1:N con siniestro)
```sql
CREATE TABLE alerta_regla (
  id_alerta           TEXT PRIMARY KEY,
  id_siniestro        TEXT REFERENCES siniestro(id_siniestro),
  codigo_regla        TEXT,    -- 'RF-01', 'RF-02', 'RF-07'
  nombre_regla        TEXT,    -- 'Pérdida Total por Robo', 'Falsificación Documental'
  clasificacion       TEXT,    -- 'ROJO' | 'AMARILLO'
  severidad           TEXT,    -- 'CRÍTICA' | 'ALTA' | 'MEDIA'
  variable_evaluada   TEXT,    -- campo que disparó la regla
  valor_detectado     TEXT,    -- valor que activó la regla
  evidencia           TEXT,
  explicacion         TEXT     -- explicación legible para el analista
);
```

### SCORE_SINIESTRO (resultado consolidado — una fila por siniestro)
```sql
CREATE TABLE score_siniestro (
  id_score                  TEXT PRIMARY KEY,
  id_siniestro              TEXT UNIQUE REFERENCES siniestro(id_siniestro),
  score_heuristico          FLOAT,    -- 0-100, capa heurística
  prediccion_ml             INT,      -- 0=normal, 1=sospechoso
  probabilidad_ml           FLOAT,    -- 0.0-1.0, confianza del modelo
  score_final               FLOAT,    -- 0-100, consolidado de las 3 capas
  nivel_riesgo              TEXT,     -- 'VERDE' | 'AMARILLO' | 'ROJO'
  reglas_criticas_activadas TEXT,     -- 'RF-01,RF-02' referencia rápida
  factores_principales      TEXT,
  explicacion_final         TEXT,     -- PERSISTIDA — no regenerar
  accion_sugerida           TEXT,
  mensaje_ia                TEXT,     -- PERSISTIDA — no regenerar
  fecha_evaluacion          TIMESTAMPTZ,
  version_modelo            TEXT
);
```

### POLIZA
```sql
CREATE TABLE poliza (
  id_poliza       TEXT PRIMARY KEY,
  id_asegurado    TEXT REFERENCES asegurado(id_asegurado),
  ramo            TEXT,
  fecha_inicio    DATE,
  fecha_fin       DATE,
  prima           FLOAT,
  suma_asegurada  FLOAT,
  deducible       FLOAT,
  canal_venta     TEXT,
  ciudad          TEXT,
  estado_poliza   TEXT
);
```

### ASEGURADO
```sql
CREATE TABLE asegurado (
  id_asegurado              TEXT PRIMARY KEY,
  segmento                  TEXT,
  antiguedad_cliente        INT,
  ciudad                    TEXT,
  numero_polizas            INT,
  reclamos_ultimos_12_meses INT,
  mora_actual               BOOLEAN,
  score_cliente_simulado    FLOAT
);
```

### VEHICULO
```sql
CREATE TABLE vehiculo (
  id_vehiculo         TEXT PRIMARY KEY,
  id_asegurado        TEXT REFERENCES asegurado(id_asegurado),
  placa_anonimizada   TEXT,
  chasis_anonimizado  TEXT,
  motor_anonimizado   TEXT,
  marca               TEXT,
  modelo              TEXT,
  anio                INT,
  tipo_vehiculo       TEXT,
  ciudad              TEXT
);
```

### PROVEEDOR
```sql
CREATE TABLE proveedor (
  id_proveedor                TEXT PRIMARY KEY,
  nombre_proveedor_sintetico  TEXT,
  tipo                        TEXT,
  ciudad                      TEXT,
  reclamos_asociados          INT,
  monto_promedio_reclamado    FLOAT,
  porcentaje_casos_observados FLOAT,
  antiguedad                  INT,
  en_lista_restrictiva        BOOLEAN
);
```

### DOCUMENTO
```sql
CREATE TABLE documento (
  id_documento             TEXT PRIMARY KEY,
  id_siniestro             TEXT REFERENCES siniestro(id_siniestro),
  tipo_documento           TEXT,   -- 'denuncia'|'factura'|'informe_pericial'|'fotografias'|'parte_policial'
  entregado                BOOLEAN,
  legible                  BOOLEAN,
  fecha_emision            DATE,
  inconsistencia_detectada BOOLEAN,
  observacion              TEXT
);
```

### variable_riesgo
```sql
CREATE TABLE variable_riesgo (
  id_siniestro                  TEXT PRIMARY KEY REFERENCES siniestro(id_siniestro),
  dias_desde_inicio_poliza      INT,
  dias_desde_fin_poliza         INT,
  dias_entre_ocurrencia_reporte INT,
  ratio_monto_suma_asegurada    FLOAT,
  ratio_monto_estimado          FLOAT,
  historial_siniestros_asegurado INT,
  historial_siniestros_vehiculo  INT,
  historial_siniestros_conductor INT,
  frecuencia_proveedor           INT,
  proveedor_recurrente           BOOLEAN,
  monto_atipico                  BOOLEAN,
  reporte_tardio                 BOOLEAN,
  borde_vigencia                 BOOLEAN
);
```

### NARRATIVA_SIMILITUD
```sql
CREATE TABLE narrativa_similitud (
  id_similitud        TEXT PRIMARY KEY,
  id_siniestro        TEXT REFERENCES siniestro(id_siniestro),
  id_siniestro_similar TEXT,
  similitud_textual   FLOAT,    -- 0.0-1.0
  metodo              TEXT,
  alerta_narrativa    BOOLEAN,
  grupo_narrativo     TEXT
);
```

---

## Agente IA — arquitectura SQL híbrida

### Principio de funcionamiento
El agente usa Supabase como fuente de datos. NO opera sobre arrays en memoria.
El flujo es:

```
Pregunta del analista
       ↓
[Clasificador LLM] — ¿existe una query SQL pre-escrita que responda esto?
       ↓
  ┌────┴────────────────────────────┐
  │ SÍ — query pre-escrita         │ NO — generar SQL dinámico
  │ ejecutar query en Supabase     │ LLM genera SELECT válido para Postgres
  │ (~800 tokens total)            │ ejecutar en Supabase via RPC o query API
  └────────────────────────────────┘ (~2000 tokens total)
       ↓                                   ↓
  resultado de la query            resultado de la query
       ↓                                   ↓
  [LLM redacta respuesta en lenguaje natural con contexto del dominio]
       ↓
  Respuesta al analista + disclaimer ético
```

### Queries SQL pre-escritas para las 11 preguntas frecuentes

Estas queries se guardan en `lib/agentQueries.ts` como constantes.
El clasificador las recibe como lista de nombres para decidir cuál usar.

```typescript
// lib/agentQueries.ts

export const AGENT_QUERIES = {

  // Q18 — Top 10 siniestros con mayor riesgo
  top10_mayor_riesgo: `
    SELECT s.id_siniestro, s.ramo, s.ciudad, s.monto_reclamado,
           ss.score_final, ss.nivel_riesgo, ss.score_heuristico,
           ss.probabilidad_ml, ss.reglas_criticas_activadas,
           ss.factores_principales, ss.accion_sugerida
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    ORDER BY ss.score_final DESC
    LIMIT 10
  `,

  // Q19 — Por qué un siniestro específico fue marcado (requiere id_siniestro como parámetro)
  // Esta query se construye con el ID detectado en la pregunta
  detalle_riesgo_siniestro: (id: string) => `
    SELECT
      s.id_siniestro, s.ramo, s.cobertura, s.ciudad,
      s.monto_reclamado, s.descripcion,
      ss.score_heuristico, ss.prediccion_ml, ss.probabilidad_ml,
      ss.score_final, ss.nivel_riesgo, ss.reglas_criticas_activadas,
      ss.factores_principales, ss.explicacion_final, ss.accion_sugerida,
      ss.mensaje_ia, ss.version_modelo,
      p.suma_asegurada, p.fecha_inicio, p.fecha_fin,
      vr.dias_desde_inicio_poliza, vr.historial_siniestros_asegurado,
      vr.reporte_tardio, vr.borde_vigencia, vr.monto_atipico,
      vr.proveedor_recurrente
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    JOIN poliza p ON s.id_poliza = p.id_poliza
    LEFT JOIN variable_riesgo vr ON s.id_siniestro = vr.id_siniestro
    WHERE s.id_siniestro = '${id}'
  `,

  // Query complementaria para Q19: obtener las reglas activadas del siniestro
  reglas_de_siniestro: (id: string) => `
    SELECT codigo_regla, nombre_regla, clasificacion, severidad,
           variable_evaluada, valor_detectado, explicacion
    FROM alerta_regla
    WHERE id_siniestro = '${id}'
    ORDER BY
      CASE clasificacion WHEN 'ROJO' THEN 0 WHEN 'AMARILLO' THEN 1 ELSE 2 END
  `,

  // Q20 — Proveedores con más alertas
  proveedores_con_mas_alertas: `
    SELECT p.id_proveedor, p.nombre_proveedor_sintetico, p.ciudad,
           p.en_lista_restrictiva,
           COUNT(s.id_siniestro) as total_casos,
           SUM(CASE WHEN ss.nivel_riesgo = 'ROJO' THEN 1 ELSE 0 END) as casos_rojos,
           AVG(ss.score_final) as score_promedio,
           SUM(s.monto_reclamado) as monto_total
    FROM proveedor p
    JOIN siniestro s ON p.id_proveedor = s.id_proveedor
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    GROUP BY p.id_proveedor, p.nombre_proveedor_sintetico, p.ciudad, p.en_lista_restrictiva
    ORDER BY casos_rojos DESC, score_promedio DESC
    LIMIT 10
  `,

  // Q21 — Ramos con mayor porcentaje de casos sospechosos
  ramos_mas_sospechosos: `
    SELECT s.ramo,
           COUNT(*) as total_casos,
           SUM(CASE WHEN ss.nivel_riesgo = 'ROJO' THEN 1 ELSE 0 END) as casos_rojos,
           SUM(CASE WHEN ss.nivel_riesgo = 'AMARILLO' THEN 1 ELSE 0 END) as casos_amarillos,
           ROUND(100.0 * SUM(CASE WHEN ss.nivel_riesgo IN ('ROJO','AMARILLO') THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_sospechosos,
           AVG(ss.score_final) as score_promedio,
           AVG(ss.probabilidad_ml) as prob_ml_promedio
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    GROUP BY s.ramo
    ORDER BY pct_sospechosos DESC
  `,

  // Q22 — Ciudades con mayor concentración de alertas
  ciudades_mas_alertas: `
    SELECT s.ciudad,
           COUNT(*) as total_casos,
           SUM(CASE WHEN ss.nivel_riesgo = 'ROJO' THEN 1 ELSE 0 END) as casos_rojos,
           ROUND(100.0 * SUM(CASE WHEN ss.nivel_riesgo = 'ROJO' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_rojos,
           AVG(ss.score_final) as score_promedio,
           SUM(s.monto_reclamado) as monto_total
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    GROUP BY s.ciudad
    ORDER BY casos_rojos DESC
    LIMIT 10
  `,

  // Q23 — Asegurados con mayor frecuencia de reclamos
  asegurados_frecuentes: `
    SELECT a.id_asegurado, a.ciudad, a.segmento,
           COUNT(s.id_siniestro) as total_reclamos,
           SUM(CASE WHEN ss.nivel_riesgo = 'ROJO' THEN 1 ELSE 0 END) as reclamos_rojos,
           AVG(ss.score_final) as score_promedio,
           SUM(s.monto_reclamado) as monto_total
    FROM asegurado a
    JOIN siniestro s ON a.id_asegurado = s.id_asegurado
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    GROUP BY a.id_asegurado, a.ciudad, a.segmento
    HAVING COUNT(s.id_siniestro) >= 2
    ORDER BY total_reclamos DESC, reclamos_rojos DESC
    LIMIT 15
  `,

  // Q24 — Documentos faltantes en casos críticos
  documentos_faltantes_criticos: `
    SELECT d.tipo_documento,
           COUNT(*) as total_faltantes,
           SUM(CASE WHEN d.inconsistencia_detectada THEN 1 ELSE 0 END) as con_inconsistencia,
           AVG(ss.score_final) as score_promedio_casos
    FROM documento d
    JOIN siniestro s ON d.id_siniestro = s.id_siniestro
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    WHERE (d.entregado = FALSE OR d.legible = FALSE OR d.inconsistencia_detectada = TRUE)
      AND ss.nivel_riesgo = 'ROJO'
    GROUP BY d.tipo_documento
    ORDER BY total_faltantes DESC
  `,

  // Q25 — Casos con montos atípicos
  montos_atipicos: `
    SELECT s.id_siniestro, s.ramo, s.ciudad, s.monto_reclamado,
           p.suma_asegurada,
           vr.ratio_monto_suma_asegurada,
           ss.score_final, ss.nivel_riesgo, ss.probabilidad_ml,
           ss.factores_principales
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    JOIN poliza p ON s.id_poliza = p.id_poliza
    LEFT JOIN variable_riesgo vr ON s.id_siniestro = vr.id_siniestro
    WHERE vr.monto_atipico = TRUE
    ORDER BY vr.ratio_monto_suma_asegurada DESC
    LIMIT 15
  `,

  // Q26 — Siniestros cerca del inicio de póliza (borde de vigencia)
  cerca_inicio_poliza: `
    SELECT s.id_siniestro, s.ramo, s.ciudad, s.monto_reclamado,
           vr.dias_desde_inicio_poliza,
           ss.score_final, ss.nivel_riesgo,
           ss.score_heuristico, ss.probabilidad_ml,
           ss.reglas_criticas_activadas
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    LEFT JOIN variable_riesgo vr ON s.id_siniestro = vr.id_siniestro
    WHERE vr.borde_vigencia = TRUE
       OR vr.dias_desde_inicio_poliza <= 30
    ORDER BY vr.dias_desde_inicio_poliza ASC
    LIMIT 15
  `,

  // Q27 — Patrones repetidos en reclamos sospechosos
  patrones_repetidos: `
    SELECT
      COUNT(CASE WHEN vr.borde_vigencia THEN 1 END) as con_borde_vigencia,
      COUNT(CASE WHEN vr.reporte_tardio THEN 1 END) as con_reporte_tardio,
      COUNT(CASE WHEN vr.monto_atipico THEN 1 END) as con_monto_atipico,
      COUNT(CASE WHEN vr.proveedor_recurrente THEN 1 END) as con_proveedor_recurrente,
      COUNT(CASE WHEN ns.alerta_narrativa THEN 1 END) as con_narrativa_similar,
      COUNT(CASE WHEN ss.prediccion_ml = 1 THEN 1 END) as marcados_por_ml,
      ROUND(AVG(ss.score_heuristico), 1) as score_heuristico_promedio,
      ROUND(AVG(ss.probabilidad_ml * 100), 1) as probabilidad_ml_promedio
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    LEFT JOIN variable_riesgo vr ON s.id_siniestro = vr.id_siniestro
    LEFT JOIN narrativa_similitud ns ON s.id_siniestro = ns.id_siniestro
    WHERE ss.nivel_riesgo IN ('ROJO', 'AMARILLO')
  `,

  // Q28 — Resumen ejecutivo de casos críticos
  resumen_ejecutivo: `
    SELECT
      COUNT(*) as total_siniestros,
      SUM(CASE WHEN ss.nivel_riesgo = 'ROJO' THEN 1 ELSE 0 END) as casos_rojos,
      SUM(CASE WHEN ss.nivel_riesgo = 'AMARILLO' THEN 1 ELSE 0 END) as casos_amarillos,
      ROUND(AVG(ss.score_final), 1) as score_promedio,
      ROUND(AVG(ss.probabilidad_ml * 100), 1) as prob_ml_promedio,
      SUM(CASE WHEN ss.nivel_riesgo = 'ROJO' THEN s.monto_reclamado ELSE 0 END) as monto_expuesto_rojo,
      SUM(s.monto_reclamado) as monto_total,
      COUNT(DISTINCT CASE WHEN p_info.en_lista_restrictiva THEN s.id_proveedor END) as proveedores_restringidos_activos
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    LEFT JOIN proveedor p_info ON s.id_proveedor = p_info.id_proveedor
  `,

  // Q29 — Casos prioritarios para revisar primero
  prioridad_revision: `
    SELECT s.id_siniestro, s.ramo, s.ciudad, s.monto_reclamado,
           ss.score_final, ss.nivel_riesgo,
           ss.score_heuristico, ss.probabilidad_ml,
           ss.reglas_criticas_activadas, ss.accion_sugerida,
           p_info.en_lista_restrictiva,
           vr.dias_desde_inicio_poliza, vr.reporte_tardio,
           (
             SELECT COUNT(*) FROM alerta_regla ra
             WHERE ra.id_siniestro = s.id_siniestro
               AND ra.clasificacion = 'ROJO'
           ) as num_reglas_criticas_rojas
    FROM siniestro s
    JOIN score_siniestro ss ON s.id_siniestro = ss.id_siniestro
    LEFT JOIN proveedor p_info ON s.id_proveedor = p_info.id_proveedor
    LEFT JOIN variable_riesgo vr ON s.id_siniestro = vr.id_siniestro
    WHERE ss.nivel_riesgo = 'ROJO'
    ORDER BY
      num_reglas_criticas_rojas DESC,
      ss.probabilidad_ml DESC,
      ss.score_final DESC
    LIMIT 15
  `
} as const;

// Nombres de las queries para que el clasificador los reconozca
export const QUERY_NAMES = Object.keys(AGENT_QUERIES) as (keyof typeof AGENT_QUERIES)[];

// Descripción de cada query para el clasificador
export const QUERY_DESCRIPTIONS: Record<string, string> = {
  top10_mayor_riesgo:              "Top 10 siniestros con mayor score de riesgo",
  detalle_riesgo_siniestro:        "Explicación detallada de por qué un siniestro específico fue marcado (requiere ID)",
  reglas_de_siniestro:             "Lista de reglas críticas activadas para un siniestro específico (requiere ID)",
  proveedores_con_mas_alertas:     "Proveedores con mayor concentración de alertas y casos rojos",
  ramos_mas_sospechosos:           "Ramos con mayor porcentaje de casos sospechosos",
  ciudades_mas_alertas:            "Ciudades con mayor concentración de alertas",
  asegurados_frecuentes:           "Asegurados con mayor frecuencia de reclamos",
  documentos_faltantes_criticos:   "Tipos de documentos faltantes o inconsistentes en casos críticos",
  montos_atipicos:                 "Casos con montos reclamados atípicos respecto a la suma asegurada",
  cerca_inicio_poliza:             "Siniestros ocurridos cerca del inicio de la póliza o borde de vigencia",
  patrones_repetidos:              "Patrones y señales que se repiten en los reclamos sospechosos",
  resumen_ejecutivo:               "Resumen estadístico ejecutivo de todos los casos críticos",
  prioridad_revision:              "Casos que el analista debería revisar primero, ordenados por criticidad",
};
```

### Plantilla de respuesta para Q19 (siniestro específico)

Cuando el agente responde a "¿Por qué SIN-XXXX fue marcado como alto riesgo?", debe seguir SIEMPRE esta estructura narrativa combinando las 3 capas:

```
"El siniestro [ID] presenta riesgo [NIVEL].

[Si hay reglas críticas activadas:]
Se activaron las siguientes reglas críticas: [lista de RF-XX con nombre].
[Si alguna es ROJO]: Por lo anterior, fue clasificado inicialmente en ROJO.

El score heurístico fue [N]/100, principalmente por:
• [factor 1]
• [factor 2]
• [factor 3]

[Si prediccion_ml = 1:]
Sin embargo/Adicionalmente, el modelo ML analizó casos históricamente similares
y estimó una probabilidad de fraude del [N]%, [elevando/confirmando] el score final.

[Si prediccion_ml = 0:]
El modelo ML, con una probabilidad de fraude del [N]%, no identificó patrones
históricos de alto riesgo en este caso.

Score final: [N]/100. Acción sugerida: [texto]."
```

Esta estructura está en `lib/agentContext.ts` como `NARRATIVE_TEMPLATE_Q19`.

---

## Tipos principales (`lib/types.ts`)

```typescript
export type RiskLevel = "VERDE" | "AMARILLO" | "ROJO";
export type RuleClassification = "ROJO" | "AMARILLO";
export type MLPrediction = 0 | 1;

export interface ReglaAlerta {
  id_alerta: string;
  id_siniestro: string;
  codigo_regla: string;
  nombre_regla: string;
  clasificacion: RuleClassification;
  severidad: string;
  variable_evaluada: string;
  valor_detectado: string;
  evidencia: string;
  explicacion: string;
}

export interface ScoreSiniestro {
  id_score: string;
  id_siniestro: string;
  score_heuristico: number;
  prediccion_ml: MLPrediction;
  probabilidad_ml: number;
  score_final: number;
  nivel_riesgo: RiskLevel;
  reglas_criticas_activadas: string;
  factores_principales: string;
  explicacion_final: string;
  accion_sugerida: string;
  mensaje_ia: string;
  fecha_evaluacion: string;
  version_modelo: string;
}

export interface SiniestroBase {
  id_siniestro: string;
  id_poliza: string;
  id_asegurado: string;
  id_vehiculo: string;
  id_proveedor: string;
  ramo: string;
  cobertura: string;
  ciudad: string;
  fecha_ocurrencia: string;
  fecha_reporte: string;
  monto_reclamado: number;
  monto_estimado: number;
  monto_pagado: number;
  estado: string;
  descripcion: string;
  documentos_completos: boolean;
  etiqueta_fraude_simulada: number;
}

export interface SiniestroCompleto extends SiniestroBase {
  score_heuristico: number;
  prediccion_ml: MLPrediction;
  probabilidad_ml: number;
  score_final: number;
  nivel_riesgo: RiskLevel;
  reglas_criticas_activadas: string;
  factores_principales: string;
  explicacion_final: string;
  accion_sugerida: string;
  mensaje_ia: string;
  fecha_evaluacion: string;
  suma_asegurada: number;
  fecha_inicio_poliza: string;
  fecha_fin_poliza: string;
  historial_siniestros_asegurado: number;
  en_lista_restrictiva: boolean;
  reglas?: ReglaAlerta[];
}

export interface ClaimsStats {
  total: number;
  verde: number;
  amarillo: number;
  rojo: number;
  score_final_promedio: number;
  score_heuristico_promedio: number;
  probabilidad_ml_promedio: number;
  monto_total: number;
  monto_rojo: number;
  ahorro_potencial: number;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  enfoque?: "sql_preescrito" | "sql_dinamico";
  query_usada?: string;
}

export interface FilterState {
  nivel_riesgo: RiskLevel[];
  ramos: string[];
  ciudades: string[];
  proveedor: string;
  score_min: number;
  score_max: number;
  con_reglas_criticas: boolean;
  documentos_incompletos: boolean;
}

export interface ProveedorStats {
  id_proveedor: string;
  casos_totales: number;
  casos_rojos: number;
  pct_alertas: number;
  monto_promedio: number;
  monto_total: number;
  en_lista_restrictiva: boolean;
  nivel_riesgo: RiskLevel;
}
```

---

## Supabase — ejecución de queries (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Para ejecutar SQL arbitrario desde el agente (requires pg_rpc o similar)
// Las queries pre-escritas se ejecutan via supabase.rpc('execute_query', { sql })
// O via supabase.from(...).select() para queries simples
```

---

## Tema visual — design system

Copiar de `docs/design/styles.css` a `app/globals.css`.

```css
:root {
  --bg-base: #0A0B0F;      --bg-surface: #111318;   --bg-elevated: #161A22;
  --border: #1E2028;        --text-primary: #F0F2F7; --text-secondary: #8B92A5;
  --text-tertiary: #4A5060; --accent: #4F8EF7;       --accent-hover: #6BA3FF;
  --risk-green: #22C55E;    --risk-green-bg: #0D2818;
  --risk-yellow: #EAB308;   --risk-yellow-bg: #1C1A08;
  --risk-red: #EF4444;      --risk-red-bg: #200D0D;
}
@keyframes fillBar { from { width: 0 } to { width: var(--target-width) } }
@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
.row-hover:hover { transform: translateX(2px); background: var(--bg-elevated); transition: all 0.15s ease; }
```

**Tipografía:** Syne · DM Mono · DM Sans via `next/font/google`

---

## Estructura del proyecto

```
fraudia-dashboard/
├── CLAUDE.md
├── app/
│   ├── layout.tsx, globals.css, page.tsx
│   ├── dashboard/page.tsx
│   ├── casos/ (page.tsx + [id]/page.tsx)
│   ├── red/page.tsx, proveedores/page.tsx, agente/page.tsx
│   └── api/ (agent/route.ts + export/route.ts)
├── components/
│   ├── shared/ (Sidebar, Topbar, RiskBadge)
│   ├── dashboard/ (KPICard, charts x4)
│   ├── casos/ (CasosTable, CasosFilters, ScoreBar)
│   ├── detalle/ (ScoreBreakdown, ReglasCriticasList, MLInsight, NarrativeAnalysis, EthicsMessage)
│   ├── red/ (RelationGraph — siempre dynamic + ssr:false)
│   ├── proveedores/ (ProveedoresTable, ProveedorDetailPanel, SavingsSimulator)
│   └── agente/ (ChatInterface, SuggestedQuestions)
├── lib/
│   ├── types.ts, constants.ts, supabase.ts
│   ├── queries.ts          ← queries Supabase para dashboard/bandeja
│   ├── agentQueries.ts     ← las 13 queries SQL del agente
│   ├── agentContext.ts     ← prompts y NARRATIVE_TEMPLATE_Q19
│   ├── claimsUtils.ts, exportUtils.ts
├── context/DataContext.tsx
├── public/data/mock_claims.csv
└── docs/ (spec.md, tasks.md, design/)
```

---

## Variables de entorno

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Instalación

```bash
npx create-next-app@latest fraudia-dashboard --typescript --tailwind --app --no-src-dir
npx shadcn@latest init && npx shadcn@latest add table badge button card select slider switch tabs separator sheet
npm install recharts papaparse @anthropic-ai/sdk d3 @supabase/supabase-js
npm install -D @types/papaparse @types/d3
```

---

## Lo que Claude Code NO debe hacer

- No recalcular scores en el frontend
- No regenerar `explicacion_final` o `mensaje_ia` si ya están en Supabase
- No tratar `reglas_criticas_activadas` como string para mostrar — usar `ReglaAlerta[]`
- No hacer queries SQL directamente desde componentes React — solo desde `lib/queries.ts` y `/api/chat`
- No hardcodear colores hex — usar CSS variables
- No importar D3 sin `dynamic` + `ssr: false`

---

## Agente IA — Arquitectura v2 (ACTUAL — supersede la sección "arquitectura SQL híbrida" de arriba)

El agente vive en `app/api/chat/route.ts` + `lib/ai/`. Tiene **intent routing** con tres caminos:

1. **Conversacional** — saludos, identidad, "qué podés hacer", preguntas sobre la plataforma. Usa solo el system prompt (`lib/ai/system-prompt.ts`) + LLM. **NO toca la base de datos.**
2. **Catálogo** — preguntas frecuentes resueltas por **funciones TIPADAS** (`lib/ai/catalog.ts`) sobre los siniestros ya cargados (`loadScoredClaims`). **NO usa SQL crudo ni la RPC `run_query`.** El router elige la consulta por su **descripción semántica** (no lee la implementación).
3. **SQL dinámico (último recurso)** — si ninguna del catálogo aplica, el LLM genera un `SELECT` que se **valida** (`lib/ai/sql-validator.ts`: solo SELECT, una sentencia, sin DML/DDL, whitelist de tablas, LIMIT forzado) y se ejecuta vía la RPC **opcional** `run_query` (readonly). Si la RPC no existe, **degrada con gracia** (no rompe).

Módulos en `lib/ai/`: `system-prompt.ts`, `router.ts` (orquestador), `catalog.ts`, `data-access.ts`, `sql-validator.ts`.

- **LLM intercambiable** vía `lib/llm.ts` → constante/env `LLM_PROVIDER` (`"anthropic"` | `"gemini"`). Cada uno toma su key del `.env.local` (`ANTHROPIC_API_KEY` / `GEMINI_API_KEY`). Modelos overridables: `ANTHROPIC_MODEL`, `GEMINI_MODEL`.
- **El frontend (`ChatInterface`) llama SOLO a `/api/chat`** con `{ question, history }`. Nunca habla directo con Supabase ni el LLM.
- `loadScoredClaims` (`lib/ai/data-access.ts`) intenta la vista `v_siniestro_completo` y, si falla, hace JOIN de tablas base → el agente funciona aunque la vista no exista.
- Manejo de errores enterprise: si el LLM o Supabase fallan, `/api/chat` devuelve un mensaje controlado (200) sin romper la UI.
- La RPC `run_query` es **opcional** y solo se usa en el camino dinámico. SQL para crearla (readonly) en el README.
