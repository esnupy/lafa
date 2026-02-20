import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/server";

const MEXICO_TZ = "America/Mexico_City";

/**
 * Calcula el lunes de la semana actual en zona horaria de Mexico.
 * Evita desfases por servidor en UTC.
 */
const getCurrentWeekStart = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = formatter.format(now).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split("T")[0];
};

const getPreviousWeekStart = (weekStart: string): string => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
};

/** Fecha de hace N dias en Mexico (YYYY-MM-DD). */
const getDaysAgoInMexico = (days: number): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = formatter.format(now).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};

const getNextWeekStart = (weekStart: string): string => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
};

/** Formatea un timestamp ISO a hora local de Mexico (CDMX). */
const toMexicoTime = (iso: string | null): string | null => {
  if (!iso) return null;
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: MEXICO_TZ,
    dateStyle: "short",
    timeStyle: "medium",
  });
};

/**
 * Obtiene el contexto operativo completo de la base de datos para inyectar en el prompt de Claude.
 */
const getOperationalContext = async () => {
  const supabase = createServiceRoleClient();
  const weekStart = getCurrentWeekStart();
  const prevWeekStart = getPreviousWeekStart(weekStart);
  const nextWeek = getNextWeekStart(weekStart);

  const minTripDate = getDaysAgoInMexico(14);

  const [
    driversRes,
    vehiclesRes,
    activeShiftsRes,
    weekShiftsRes,
    earningsRes,
    earningsPrevRes,
    payrollRes,
    tripsRes,
  ] = await Promise.all([
    supabase.from("drivers").select("id, name, employee_id, didi_driver_id"),
    supabase.from("vehicles").select("id, plate, model, status"),
    supabase
      .from("shifts")
      .select("id, driver_id, vehicle_id, check_in, drivers(name), vehicles(plate)")
      .is("check_out", null),
    supabase
      .from("shifts")
      .select("driver_id, hours_worked, drivers(name)")
      .gte("check_in", `${weekStart}T00:00:00`)
      .lt("check_in", `${nextWeek}T00:00:00`)
      .not("check_out", "is", null),
    supabase
      .from("didi_earnings")
      .select("driver_id, total_revenue, total_trips, drivers(name)")
      .eq("week_start", weekStart),
    supabase
      .from("didi_earnings")
      .select("driver_id, total_revenue, total_trips, drivers(name)")
      .eq("week_start", prevWeekStart),
    supabase
      .from("payroll_results")
      .select("driver_id, hours_worked, revenue, base_salary, bonus, overtime_pay, support, total, drivers(name)")
      .eq("week_start", weekStart),
    supabase
      .from("didi_trips")
      .select("driver_id, trip_date, trip_id, cost, tip, drivers(name)")
      .gte("trip_date", minTripDate),
  ]);

  const hoursPerDriver = new Map<string, { name: string; hours: number }>();
  for (const shift of weekShiftsRes.data ?? []) {
    const existing = hoursPerDriver.get(shift.driver_id);
    const driverName = (shift.drivers as { name: string } | null)?.name ?? "Desconocido";
    hoursPerDriver.set(shift.driver_id, {
      name: existing?.name ?? driverName,
      hours: (existing?.hours ?? 0) + Number(shift.hours_worked ?? 0),
    });
  }

  const hoursArray = Array.from(hoursPerDriver.entries()).map(([id, data]) => ({
    driver_id: id,
    name: data.name,
    hours_this_week: Math.round(data.hours * 100) / 100,
  }));

  const earningsMap = new Map(
    (earningsRes.data ?? []).map((e) => [
      e.driver_id,
      {
        total_revenue: Number(e.total_revenue),
        total_trips: e.total_trips ?? 0,
        name: (e.drivers as { name: string } | null)?.name ?? "Desconocido",
        week_start: weekStart,
      },
    ])
  );
  for (const e of earningsPrevRes.data ?? []) {
    if (!earningsMap.has(e.driver_id)) {
      earningsMap.set(e.driver_id, {
        total_revenue: Number(e.total_revenue),
        total_trips: e.total_trips ?? 0,
        name: (e.drivers as { name: string } | null)?.name ?? "Desconocido",
        week_start: prevWeekStart,
      });
    }
  }

  const tripsByDriver = new Map<string, { trip_date: string; cost: number; tip: number }[]>();
  for (const t of tripsRes.data ?? []) {
    const list = tripsByDriver.get(t.driver_id) ?? [];
    list.push({
      trip_date: t.trip_date,
      cost: Number(t.cost),
      tip: Number(t.tip ?? 0),
    });
    tripsByDriver.set(t.driver_id, list);
  }

  const isCurrentWeek = (d: string) => d >= weekStart && d < nextWeek;
  const isPrevWeek = (d: string) => d >= prevWeekStart && d < weekStart;

  const resumenPorChofer = (driversRes.data ?? []).map((d) => {
    const hours = hoursPerDriver.get(d.id);
    const earnings = earningsMap.get(d.id);
    const allTrips = tripsByDriver.get(d.id) ?? [];
    const tripsCurrentWeek = allTrips.filter((t) => isCurrentWeek(t.trip_date));
    const tripsPrevWeek = allTrips.filter((t) => isPrevWeek(t.trip_date));
    const tripsForResumen = tripsCurrentWeek.length > 0 ? tripsCurrentWeek : tripsPrevWeek;
    const totalTrips = earnings?.total_trips ?? tripsForResumen.length;
    const totalRevenue =
      earnings?.total_revenue ?? tripsForResumen.reduce((s, v) => s + v.cost + v.tip, 0);
    return {
      name: d.name,
      employee_id: d.employee_id,
      didi_driver_id: d.didi_driver_id,
      hours_this_week: hours ? Math.round(hours.hours * 100) / 100 : 0,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_trips: totalTrips,
      semana_datos:
        earnings?.week_start ??
        (tripsForResumen.length > 0
          ? tripsCurrentWeek.length > 0
            ? weekStart
            : prevWeekStart
          : null),
      viajes_detalle:
        tripsForResumen.length > 0
          ? tripsForResumen
              .sort((a, b) => a.trip_date.localeCompare(b.trip_date))
              .map((v) => ({
                fecha: v.trip_date,
                ingreso: v.cost + v.tip,
              }))
          : [],
    };
  });

  const turnosActivosFormateados = (activeShiftsRes.data ?? []).map((s) => ({
    ...s,
    check_in_mexico: toMexicoTime(s.check_in),
    check_out_mexico: toMexicoTime((s as { check_out?: string | null }).check_out ?? null),
  }));

  return {
    semana_actual: weekStart,
    semana_anterior: prevWeekStart,
    fecha_hora_actual: new Date().toLocaleString("es-MX", { timeZone: MEXICO_TZ }),
    choferes: driversRes.data ?? [],
    vehiculos: vehiclesRes.data ?? [],
    turnos_activos: turnosActivosFormateados,
    resumen_por_chofer: resumenPorChofer,
    horas_por_chofer_esta_semana: hoursArray,
    ingresos_didi_esta_semana: (earningsRes.data ?? []).map((e) => ({
      driver_id: e.driver_id,
      name: (e.drivers as { name: string } | null)?.name ?? "Desconocido",
      total_revenue: Number(e.total_revenue),
      total_trips: e.total_trips,
    })),
    payroll_esta_semana: (payrollRes.data ?? []).map((p) => ({
      driver_id: p.driver_id,
      name: (p.drivers as { name: string } | null)?.name ?? "Desconocido",
      hours_worked: Number(p.hours_worked),
      revenue: Number(p.revenue),
      base_salary: Number(p.base_salary),
      bonus: Number(p.bonus),
      overtime_pay: Number(p.overtime_pay),
      support: Number(p.support),
      total: Number(p.total),
    })),
  };
};

const SYSTEM_PROMPT = `Eres el asistente de inteligencia operativa de LAFA, una empresa de gestión de flotilla de vehículos que opera con DiDi en México.

Tu rol es responder preguntas sobre la operación usando datos reales del sistema. Responde siempre en español, de forma concisa y con números exactos.

REGLAS DE NEGOCIO DEL PAYROLL:
- Meta semanal: >= 40 horas trabajadas Y >= $6,000 MXN facturados en DiDi.
- Si NO cumple ambas metas: recibe apoyo económico de $1,000 MXN (sin salario base).
- Si CUMPLE ambas metas:
  - Salario base: $2,500 MXN
  - Bono de productividad: por cada $500 MXN adicionales sobre los $6,000 → +$100 MXN
  - Horas extra: solo aplica si la semana ANTERIOR el chofer trabajó >= 40 hrs. Cada hora extra (sobre 40) vale $50 MXN, máximo 8 horas extras ($400 MXN tope).
- El payroll se calcula cada domingo a las 8PM.

INSTRUCCIONES:
- Todas las fechas y horas estan en zona horaria de Mexico (America/Mexico_City). Usa los campos *_mexico cuando existan (ej: check_in_mexico) para mostrar la hora correcta al usuario.
- Usa los datos del contexto para responder con precisión.
- Para preguntas como "como va X", "como va Juan Perez", "que tal X esta semana": usa resumen_por_chofer. Busca al chofer por nombre (ignora acentos y mayusculas: Juan Perez = Juan Pérez).
- resumen_por_chofer incluye TODOS los choferes con: hours_this_week, total_revenue, total_trips, viajes_detalle, semana_datos. Si semana_datos es distinto de semana_actual, indica que los viajes/ingresos son de esa semana (ej. semana pasada).
- Cuando pregunten por un chofer especifico, da un resumen claro: horas trabajadas, viajes realizados, ingresos DiDi, y si va en camino a cumplir la meta (40 hrs + $6,000) o que le falta.
- Si un chofer no aparece en choferes, indica que no esta registrado.
- Calcula diferencias y proyecciones cuando te lo pidan.
- Si no tienes suficiente información, dilo claramente.
- Formatea montos en MXN con $ y dos decimales.
- Sé directo y útil, como un analista de operaciones.
- IMPORTANTE: No uses markdown. Sin asteriscos, sin negritas, sin encabezados con #. Responde en texto plano con listas simples usando guion (-) si es necesario.`;

export const POST = async (request: NextRequest) => {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-anthropic-api-key-here") {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada. Agrega tu API key en .env.local" },
        { status: 500 }
      );
    }

    const context = await getOperationalContext();

    const anthropic = new Anthropic({ apiKey });

    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nCONTEXTO OPERATIVO ACTUAL (datos reales del sistema):\n${JSON.stringify(context, null, 2)}`,
      messages: [{ role: "user", content: message }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const reply = textBlock ? textBlock.text : "No pude generar una respuesta.";

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al procesar la consulta";
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
};
