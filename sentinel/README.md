# SENTINEL Dashboard

Detector de posibles fraudes en siniestros — capa de presentación para analistas de la
Unidad Antifraude. Visualiza el resultado de un pipeline antifraude **híbrido de 3 capas** y
permite gestionar los siniestros. El frontend **no recalcula lógica de negocio**: solo consume
los resultados ya calculados y persistidos en Supabase.

## Arquitectura antifraude (3 capas)

Cada siniestro se evalúa en el backend mediante tres capas independientes cuyo resultado se
persiste en Supabase:

1. **Reglas críticas (determinísticas):** clasifican en `ROJO` / `AMARILLO`. Un siniestro puede
   activar varias (tabla `alerta_regla`, relación 1:N).
2. **Score heurístico (0–100):** señales de negocio con pesos fijos.
3. **Modelo ML (probabilístico):** `prediccion_ml` (0/1) + `probabilidad_ml` (0–1).

Las tres se consolidan en `score_final` y `nivel_riesgo`, en la tabla `score_siniestro`.

## Stack

Next.js 14 (App Router) · TypeScript · Supabase/Postgres · Tailwind CSS · shadcn/ui ·
Recharts · D3.js · Anthropic SDK.

## Requisitos

- Node.js ≥ 18
- Un proyecto **Supabase** (la app está siempre conectada a Supabase)
- Una **API key de un LLM** (Anthropic **o** Gemini) para el agente; vive solo en el servidor

## Configuración

Creá un archivo `.env.local` en la raíz (hay una plantilla en `env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Motor LLM del agente: "anthropic" o "gemini" (también configurable en lib/llm.ts)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Opcionales (modelos por defecto)
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GEMINI_MODEL=gemini-2.5-flash
```

> Las API keys nunca se exponen al cliente: solo las usan las rutas en `app/api/`.
> Según `LLM_PROVIDER` se usa la key correspondiente.

## Instalación y ejecución (local)

```bash
npm install
npm run dev      # http://localhost:3000
npm run type-check
```

## Docker (recomendado para levantar rápido)

No necesitás instalar Node ni dependencias: solo Docker.

1. Creá un archivo **`.env`** en la raíz del proyecto (Docker Compose lo lee automáticamente).
   Podés copiar `env.example` y completar tus valores:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   LLM_PROVIDER=gemini            # o "anthropic"
   GEMINI_API_KEY=AIza...         # o ANTHROPIC_API_KEY si usás anthropic
   ```

2. Levantá la app:

   ```bash
   docker compose up --build
   ```

3. Abrí **http://localhost:3000**.

> **Importante:** las variables `NEXT_PUBLIC_*` se incrustan en tiempo de _build_ (van al
> cliente), por eso Compose las pasa como _build args_. Si cambiás esos valores, reconstruí con
> `docker compose up --build`. Las API keys del LLM son de servidor (runtime).

## Modelo de datos — siempre Supabase

La app se conecta siempre a Supabase como fuente única de verdad. **No hay modo CSV en memoria.**
Los siniestros se cargan a Supabase de dos formas, ambas en la sección **`/siniestros`**:

- **CRUD:** crear / editar / eliminar siniestros de a uno.
- **Carga CSV:** inserción masiva.

> En este MVP el CRUD y la carga CSV escriben **solo el siniestro base** (tabla `siniestro`).
> El scoring (`score_siniestro`, `alerta_regla`, etc.) lo produce el backend por separado.
> El dashboard y la bandeja muestran los siniestros ya scoreados vía la vista `v_siniestro_completo`.

### Vista requerida: `v_siniestro_completo`

El dashboard y la bandeja leen esta vista (JOIN de las tablas necesarias):

```sql
create or replace view v_siniestro_completo as
select s.*, ss.score_heuristico, ss.prediccion_ml, ss.probabilidad_ml,
       ss.score_final, ss.nivel_riesgo, ss.reglas_criticas_activadas,
       ss.factores_principales, ss.explicacion_final, ss.accion_sugerida,
       ss.mensaje_ia, ss.fecha_evaluacion,
       p.suma_asegurada, p.fecha_inicio, p.fecha_fin,
       a.reclamos_ultimos_12_meses as historial_siniestros_asegurado,
       pr.en_lista_restrictiva
from siniestro s
join score_siniestro ss on s.id_siniestro = ss.id_siniestro
left join poliza p   on s.id_poliza = p.id_poliza
left join asegurado a on s.id_asegurado = a.id_asegurado
left join proveedor pr on s.id_proveedor = pr.id_proveedor;
```

## El agente de consultas (híbrido v2)

El agente (`/agente` → `POST /api/chat` → `lib/ai/`) usa **routing de intención** con tres caminos:

1. **Conversacional** (`💬`): saludos, identidad, "qué podés hacer", preguntas sobre la plataforma.
   Solo system prompt + LLM, **sin tocar la base de datos**.
2. **Catálogo** (`⚡`): preguntas frecuentes resueltas por **funciones tipadas** (`lib/ai/catalog.ts`)
   sobre los siniestros cargados. El router elige por **descripción semántica**. **No usa SQL crudo
   ni la RPC `run_query`.**
3. **SQL dinámico** (`⟨/⟩`, último recurso): si ninguna del catálogo aplica, el LLM genera un
   `SELECT` validado (`lib/ai/sql-validator.ts`: solo SELECT, una sentencia, sin DML/DDL, whitelist,
   LIMIT) y lo ejecuta vía la RPC **opcional** `run_query`. Si la RPC no existe, degrada con gracia.

El agente **no regenera** explicaciones ya persistidas (`explicacion_final`, `mensaje_ia`).
El motor LLM se elige con `LLM_PROVIDER` (Anthropic o Gemini). El frontend habla solo con `/api/chat`.

### Función OPCIONAL: `run_query` (solo para el camino de SQL dinámico)

Los caminos conversacional y de catálogo **no la necesitan**. Creala solo si querés habilitar el
SQL dinámico de último recurso:

```sql
create or replace function run_query(query_text text)
returns json language plpgsql as $$
declare result json;
begin
  execute format('select coalesce(json_agg(t), ''[]''::json) from (%s) t', query_text)
  into result;
  return result;
end;
$$;
```

> **Seguridad:** `/api/chat` valida que el SQL sea únicamente `SELECT` (con whitelist de tablas y
> LIMIT) antes de llamar a `run_query`. Aun así ejecuta SQL de lectura arbitrario. En producción
> restringí su uso (rol readonly dedicado, no exponerla al rol `anon`).

## Rutas

| Ruta           | Descripción                           |
| -------------- | ------------------------------------- |
| `/`            | Inicio: estado de conexión a Supabase |
| `/dashboard`   | 8 KPIs + 4 gráficos                   |
| `/casos`       | Bandeja filtrable; exporta CSV/HTML   |
| `/casos/[id]`  | Detalle con las 3 capas del score     |
| `/siniestros`  | CRUD + carga CSV de siniestros        |
| `/red`         | Grafo de relaciones (D3)              |
| `/proveedores` | Ranking + simulador de ahorro         |
| `/agente`      | Chat con el agente SQL híbrido        |

## Limitaciones del MVP

- Sin autenticación ni roles de usuario.
- El agente no tiene memoria conversacional entre preguntas.
- CRUD y carga CSV gestionan solo la tabla `siniestro` (el scoring lo hace el backend).
- La red de relaciones usa los siniestros ya cargados en memoria del cliente.

## Aviso ético

Este sistema es una **herramienta de apoyo a la decisión, no un veredicto**. Los scores expresan
una probabilidad estimada, no una certeza ni una acusación. Toda alerta debe presumir la buena fe
del asegurado y ser revisada por un analista humano, que tiene la decisión final. Ningún reclamo se
aprueba ni se rechaza de forma automática.
