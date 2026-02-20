# LAFA OS — Fleet Intelligence & Payroll

Sistema de gestión de flotilla y nómina semanal para LAFA, una empresa que opera con DiDi en México.

---

## Reto Técnico

El reto consiste en integrar **múltiples fuentes de datos** (turnos internos, archivos Excel de DiDi, vehículos, choferes) en un **motor de payroll** con reglas de negocio complejas, ofreciendo:

1. **Unificación de datos heterogéneos** — Turnos con timestamps en zona horaria México, viajes DiDi en `.xlsx` con formatos variables (cost, tip, coordenadas), y cruce por `driver_id` entre sistemas.
2. **Motor de payroll determinístico** — Metas semanales (≥40 hrs + ≥$6,000 MXN), bonos por productividad, horas extra condicionadas a la semana anterior, y apoyo económico para quienes no cumplen.
3. **Asistente AI con contexto real** — Chat en lenguaje natural que consulta datos vivos de Supabase (horas, ingresos, turnos activos) y responde con números exactos usando Claude, sin RAG ni agentes complejos.
4. **RBAC y flujos operativos** — Admin vs Supervisor con permisos distintos; check-in/check-out, asignación de unidades, upload de archivos DiDi.
5. **Automatización semanal** — Cron que ejecuta el motor de payroll cada domingo a las 8PM.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16, React 19, shadcn/ui, Tailwind |
| Backend/DB | Supabase (Auth, PostgreSQL, RLS, Edge Functions) |
| AI | Claude API (Anthropic) — consultas en lenguaje natural |
| Deploy | Vercel |

---

## Estructura del Proyecto

```
lafa/
├── lafaos/          # App Next.js (Root Directory en Vercel)
│   ├── app/         # App Router, páginas y API routes
│   ├── components/  # UI (shadcn, theme, etc.)
│   ├── lib/         # Supabase client, utilidades
│   └── supabase/    # Migraciones y seeds
└── README.md
```

---

## Cómo Ejecutar

```bash
cd lafaos
npm install
cp .env.example .env.local   # Configurar Supabase
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Despliegue en Vercel

En **Settings → Build and Deployment → Root Directory** configurar: `lafaos`.
