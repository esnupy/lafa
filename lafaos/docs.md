# PRD — Fleet Intelligence & Payroll MVP

## Visión General

Sistema de gestión de flotilla y nómina semanal para LAFA, con RBAC, registro de turnos, cálculo automático de payroll y un asistente AI embebido para consultas operativas.

---

## Stack Definido

| Capa | Tecnología |
|------|-----------|
| Frontend/UI | Next.js + shadcn/ui |
| Backend/DB | Supabase (Auth, PostgreSQL, Edge Functions) |
| AI | Claude API (claude-haiku — consultas en lenguaje natural) |
| Deploy | Vercel |

---

## Usuarios y Roles (RBAC)

**Administrador** — acceso total, gestión de usuarios, puede promover a Supervisor y ver reportes de payroll de toda la flotilla.

**Supervisor** — opera el día a día: registra check-in/check-out de choferes, asigna unidades disponibles por turno, sube el archivo de DiDi.

---

## Módulos del Sistema

### 1. Autenticación y Gestión de Roles

Supabase Auth con RLS (Row Level Security). Los roles se almacenan en una tabla `profiles` con campo `role: admin | supervisor`. El Admin puede cambiar roles desde un panel de usuarios.

### 2. Gestión de Assets (Unidades)

CRUD de vehículos con estado: `disponible | asignado | mantenimiento`. El Supervisor ve solo las unidades disponibles al momento de asignar.

### 3. Check-in / Check-out de Choferes

El Supervisor registra entrada y salida por turno. Se guarda timestamp exacto en tabla `shifts`. Las horas se calculan automáticamente al hacer check-out. Un chofer solo puede tener un turno activo a la vez.

### 4. Importación del Archivo de DiDi

Upload manual del archivo semanal (`.xlsx`) por parte del Supervisor. Un Edge Function de Supabase parsea el archivo, limpia los datos (manejo de formatos de hora, coordenadas, valores nulos) y los inserta en la tabla `didi_trips`. Los viajes se agrupan por `driver_id` y semana para calcular los ingresos totales en `didi_earnings`.

**Estructura real del archivo DiDi (columnas):**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `Driver ID` | número | Identificador único del chofer en DiDi |
| `Date` | fecha | Fecha del viaje |
| `Trip ID` | texto | Identificador único del viaje (e.g. `fd5g5h`) |
| `Initial time` | hora | Hora de inicio del viaje (HH:MM) |
| `Final time` | hora | Hora de fin del viaje (HH:MM) |
| `Cost` | decimal | Tarifa del viaje en MXN (e.g. `125.36`) |
| `tip` | decimal | Propina recibida en MXN (puede ser `0.0`) |
| `Initial coordinates` | texto | Coordenadas de origen (`lat, lng`) |
| `final coordinates` | texto | Coordenadas de destino (`lat, lng`) |

**Notas de limpieza y validación:**
- `Cost` y `tip` pueden venir con formatos de moneda variados; se normalizan a `DECIMAL(10,2)`.
- `Initial time` y `Final time` se almacenan como `TIME`; la duración del viaje se calcula al insertar.
- Las coordenadas se almacenan como texto y opcionalmente se parsean a `POINT` (PostGIS) para análisis geoespacial futuro.
- `tip` puede ser nulo o vacío; se trata como `0.00` por defecto.
- El ingreso total por chofer por semana = `SUM(Cost) + SUM(tip)`.

### 5. Motor de Payroll

Corre automáticamente cada domingo a las 8:00 PM vía Supabase Scheduled Edge Function (cron). También puede ejecutarse manualmente desde el panel Admin.

**Lógica:**

1. Valida si el chofer cumplió **≥ 40 hrs trabajadas** Y **≥ $6,000 MXN facturados** en la semana.
2. Si **no cumple** ambas condiciones → apoyo económico de **$1,000 MXN**.
3. Si **cumple** → Sueldo base: **$2,500 MXN**.
   - **Bono de productividad:** por cada $500 MXN adicionales sobre los $6,000 → +$100 MXN.
   - **Horas extra:** solo aplica si la semana anterior el chofer trabajó ≥ 40 hrs. Cada hora extra vale $50 MXN, máximo 8 hrs extras ($400 MXN tope).

**Output:** registro en tabla `payroll_results` + exportable como CSV desde el dashboard.

### 6. Dashboard

**Admin:** tabla de payroll semanal de todos los choferes, resumen de totales, export CSV.

**Supervisor:** vista de turnos activos, unidades asignadas, estatus de choferes del día.

---

## El Use Case de AI — Asistente de Consultas Operativas

**¿Qué hace?** Un chat widget embebido en el dashboard que permite hacer preguntas en lenguaje natural sobre la operación. Se llama a Claude con contexto estructurado del estado actual de la base de datos.

**¿Por qué este use case?** Es el punto de menor fricción técnica (una sola llamada a la API, sin agentes complejos, sin tool use avanzado) pero con el mayor valor percibido en una demo: el panel técnico de LAFA verá IA "viva" respondiendo preguntas reales de negocio.

**Ejemplos de consultas:**
- "¿Cuántas horas le faltan a Juan Pérez para cumplir su meta esta semana?"
- "¿Qué choferes están en riesgo de no cumplir la meta?"
- "¿Cuánto va a cobrar la flotilla en total este domingo?"
- "¿Qué unidades están disponibles ahorita?"

**Implementación (sin over-engineering):** Al abrir el chat, el frontend hace una query a Supabase y obtiene un JSON con el contexto relevante: horas acumuladas por chofer en la semana actual, ingresos DiDi, turnos activos, unidades disponibles. Ese JSON se inyecta como contexto en el system prompt de Claude junto con las reglas de negocio del payroll. El usuario escribe su pregunta y Claude responde en español, con números reales. Sin embeddings, sin RAG, sin agentes — solo un prompt bien diseñado.

---

## Modelo de Datos (tablas clave en Supabase)

### `profiles`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | |
| `name` | text | |
| `role` | enum `admin\|supervisor` | |

### `vehicles`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `plate` | text | Número de placa |
| `model` | text | Modelo del vehículo |
| `status` | enum `disponible\|asignado\|mantenimiento` | |

### `drivers`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `name` | text | |
| `employee_id` | text | ID interno LAFA |
| `didi_driver_id` | numeric | `Driver ID` del archivo DiDi — clave de mapeo |

### `shifts`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `driver_id` | uuid FK → drivers | |
| `vehicle_id` | uuid FK → vehicles | |
| `supervisor_id` | uuid FK → profiles | |
| `check_in` | timestamptz | |
| `check_out` | timestamptz | nullable hasta cierre del turno |
| `hours_worked` | numeric | calculado al hacer check-out |

### `didi_trips` *(nueva — detalle por viaje)*
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `driver_id` | uuid FK → drivers | mapeado via `didi_driver_id` |
| `didi_driver_id` | numeric | `Driver ID` original del archivo |
| `trip_id` | text | `Trip ID` único del viaje |
| `trip_date` | date | `Date` |
| `initial_time` | time | `Initial time` |
| `final_time` | time | `Final time` |
| `cost` | decimal(10,2) | `Cost` en MXN |
| `tip` | decimal(10,2) | `tip` en MXN (default 0.00) |
| `initial_coordinates` | text | `Initial coordinates` (`lat, lng`) |
| `final_coordinates` | text | `final coordinates` (`lat, lng`) |
| `week_start` | date | lunes de la semana del viaje (calculado) |
| `imported_at` | timestamptz | timestamp de carga |

### `didi_earnings` *(agregado semanal por chofer)*
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `driver_id` | uuid FK → drivers | |
| `week_start` | date | lunes de la semana |
| `total_trips` | integer | conteo de viajes en la semana |
| `total_revenue` | decimal(10,2) | `SUM(cost + tip)` |
| `raw_data` | jsonb | snapshot del detalle de viajes para auditoría |

> **Nota:** `didi_earnings` se materializa automáticamente (upsert) al procesar cada importación. Es la fuente que consume el motor de payroll.

### `payroll_results`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `driver_id` | uuid FK → drivers | |
| `week_start` | date | |
| `hours_worked` | numeric | del sistema de turnos |
| `revenue` | decimal(10,2) | de `didi_earnings` |
| `base_salary` | decimal(10,2) | $2,500 o $0 |
| `bonus` | decimal(10,2) | bono de productividad |
| `overtime_pay` | decimal(10,2) | pago de horas extra |
| `support` | decimal(10,2) | apoyo económico $1,000 o $0 |
| `total` | decimal(10,2) | suma final |
| `calculated_at` | timestamptz | |

---

## Flujo de Uso Semanal

1. **Lunes–Sábado:** Supervisor hace check-in/check-out y asigna unidades cada turno.
2. **Viernes/Sábado:** Supervisor sube el archivo `.xlsx` de DiDi de la semana.
3. **Domingo 8PM:** Cron corre el motor de payroll automáticamente.
4. **Lunes:** Admin descarga el CSV de nómina o lo revisa en el dashboard. Puede preguntarle al asistente AI cualquier duda sobre los resultados.

---

## Entregables para LAFA

- Live URL en Vercel con datos dummy precargados.
- Repositorio en GitHub con README de arquitectura.
- Credenciales de prueba: una cuenta Admin y una Supervisor.

---

*Última actualización: modelo de datos sincronizado con la estructura real del archivo DiDi (columnas: Driver ID, Date, Trip ID, Initial time, Final time, Cost, tip, Initial coordinates, final coordinates).*