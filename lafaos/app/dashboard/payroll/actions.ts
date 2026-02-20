"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Calcula el lunes de la semana actual (o la indicada).
 */
const getCurrentWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
};

/**
 * Calcula el lunes de la semana anterior a una fecha dada.
 */
const getPreviousWeekStart = (weekStart: string): string => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
};

/**
 * Motor de payroll segun reglas del PRD:
 *
 * 1. Si chofer NO cumple >= 40 hrs Y >= $6,000 MXN -> apoyo $1,000
 * 2. Si cumple ambas:
 *    - Base: $2,500
 *    - Bono: por cada $500 sobre $6,000 -> +$100
 *    - Horas extra: solo si semana anterior >= 40 hrs.
 *      Cada hora extra = $50, max 8 hrs ($400 tope)
 *
 * @param weekStart - Lunes de la semana a calcular (YYYY-MM-DD). Si no se pasa, usa la semana actual.
 */
export const runPayroll = async (weekStart?: string) => {
  const supabase = await createClient();

  const targetWeek = weekStart ?? getCurrentWeekStart();
  const previousWeek = getPreviousWeekStart(targetWeek);

  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, name, employee_id");

  if (!drivers || drivers.length === 0) {
    return { error: "No hay choferes registrados", results: [] };
  }

  const nextWeek = getNextWeekStart(targetWeek);

  const [{ data: earnings }, { data: trips }] = await Promise.all([
    supabase
      .from("didi_earnings")
      .select("driver_id, total_revenue")
      .eq("week_start", targetWeek),
    supabase
      .from("didi_trips")
      .select("driver_id, cost, tip")
      .gte("trip_date", targetWeek)
      .lt("trip_date", nextWeek),
  ]);

  const earningsMap = new Map(
    (earnings ?? []).map((e) => [e.driver_id, Number(e.total_revenue)])
  );

  const tripsRevenueMap = new Map<string, number>();
  for (const t of trips ?? []) {
    const current = tripsRevenueMap.get(t.driver_id) ?? 0;
    tripsRevenueMap.set(t.driver_id, current + Number(t.cost ?? 0) + Number(t.tip ?? 0));
  }

  for (const [driverId, revenue] of tripsRevenueMap) {
    if (!earningsMap.has(driverId) || earningsMap.get(driverId) === 0) {
      earningsMap.set(driverId, revenue);
    }
  }

  const { data: shifts } = await supabase
    .from("shifts")
    .select("driver_id, hours_worked")
    .gte("check_in", `${targetWeek}T00:00:00`)
    .lt("check_in", `${nextWeek}T00:00:00`)
    .not("check_out", "is", null);

  const hoursMap = new Map<string, number>();
  for (const shift of shifts ?? []) {
    const current = hoursMap.get(shift.driver_id) ?? 0;
    hoursMap.set(shift.driver_id, current + Number(shift.hours_worked ?? 0));
  }

  const { data: prevShifts } = await supabase
    .from("shifts")
    .select("driver_id, hours_worked")
    .gte("check_in", `${previousWeek}T00:00:00`)
    .lt("check_in", `${targetWeek}T00:00:00`)
    .not("check_out", "is", null);

  const prevHoursMap = new Map<string, number>();
  for (const shift of prevShifts ?? []) {
    const current = prevHoursMap.get(shift.driver_id) ?? 0;
    prevHoursMap.set(shift.driver_id, current + Number(shift.hours_worked ?? 0));
  }

  const HOURS_THRESHOLD = 40;
  const REVENUE_THRESHOLD = 6000;
  const SUPPORT_AMOUNT = 1000;
  const BASE_SALARY = 2500;
  const BONUS_STEP = 500;
  const BONUS_PER_STEP = 100;
  const OVERTIME_RATE = 50;
  const MAX_OVERTIME_HOURS = 8;

  const results = drivers.map((driver) => {
    const hoursWorked = Math.round((hoursMap.get(driver.id) ?? 0) * 100) / 100;
    const revenue = earningsMap.get(driver.id) ?? 0;
    const prevHours = prevHoursMap.get(driver.id) ?? 0;

    const meetsHours = hoursWorked >= HOURS_THRESHOLD;
    const meetsRevenue = revenue >= REVENUE_THRESHOLD;

    if (!meetsHours || !meetsRevenue) {
      return {
        driver_id: driver.id,
        week_start: targetWeek,
        hours_worked: hoursWorked,
        revenue,
        base_salary: 0,
        bonus: 0,
        overtime_pay: 0,
        support: SUPPORT_AMOUNT,
        total: SUPPORT_AMOUNT,
      };
    }

    const excessRevenue = revenue - REVENUE_THRESHOLD;
    const bonusSteps = Math.floor(excessRevenue / BONUS_STEP);
    const bonus = bonusSteps * BONUS_PER_STEP;

    let overtimePay = 0;
    if (prevHours >= HOURS_THRESHOLD) {
      const extraHours = Math.min(hoursWorked - HOURS_THRESHOLD, MAX_OVERTIME_HOURS);
      overtimePay = Math.max(0, extraHours) * OVERTIME_RATE;
    }

    const total = BASE_SALARY + bonus + overtimePay;

    return {
      driver_id: driver.id,
      week_start: targetWeek,
      hours_worked: hoursWorked,
      revenue,
      base_salary: BASE_SALARY,
      bonus,
      overtime_pay: overtimePay,
      support: 0,
      total,
    };
  });

  const { error: upsertError } = await supabase
    .from("payroll_results")
    .upsert(results, { onConflict: "driver_id,week_start" });

  if (upsertError) {
    return { error: upsertError.message, results: [] };
  }

  revalidatePath("/dashboard/payroll");
  revalidatePath("/dashboard");
  return { error: null, results };
};

const getNextWeekStart = (weekStart: string): string => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
};
