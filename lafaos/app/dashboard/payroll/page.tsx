import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayrollClient } from "./payroll-client";

const MEXICO_TZ = "America/Mexico_City";

/**
 * Calcula el lunes de la semana actual en zona horaria de Mexico.
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

/**
 * Genera las ultimas N semanas (lunes) incluyendo la actual.
 */
const getRecentWeeks = (count: number): string[] => {
  const weeks: string[] = [];
  const current = getCurrentWeekStart();
  const date = new Date(current);
  for (let i = 0; i < count; i++) {
    const d = new Date(date);
    d.setDate(date.getDate() - i * 7);
    weeks.push(d.toISOString().split("T")[0]);
  }
  return weeks;
};

type PageProps = {
  searchParams: Promise<{ week?: string }>;
};

/**
 * Pagina de payroll (admin only).
 * Flujo centrado en semana: seleccionar semana -> ver todos los choferes con detalle de pago.
 */
const PayrollPage = async ({ searchParams }: PageProps) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const currentWeek = getCurrentWeekStart();

  const weekStart = params.week ?? currentWeek;
  const nextWeek = (() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();
  const prevWeek = (() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  })();

  const [weeksWithDataRes, payrollRes, earningsRes, tripsRes, shiftsRes, prevShiftsRes] = await Promise.all([
    supabase
      .from("payroll_results")
      .select("week_start")
      .order("week_start", { ascending: false })
      .limit(200),
    supabase
      .from("payroll_results")
      .select(`
        id,
        driver_id,
        week_start,
        hours_worked,
        revenue,
        base_salary,
        bonus,
        overtime_pay,
        support,
        total,
        calculated_at,
        drivers ( id, name, employee_id )
      `)
      .eq("week_start", weekStart)
      .order("calculated_at", { ascending: false }),
    supabase
      .from("didi_earnings")
      .select("driver_id, week_start, total_trips, total_revenue")
      .eq("week_start", weekStart),
    supabase
      .from("didi_trips")
      .select("driver_id, cost, tip")
      .gte("trip_date", weekStart)
      .lt("trip_date", nextWeek),
    supabase
      .from("shifts")
      .select("driver_id, hours_worked")
      .gte("check_in", `${weekStart}T00:00:00`)
      .lt("check_in", `${nextWeek}T00:00:00`)
      .not("check_out", "is", null),
    supabase
      .from("shifts")
      .select("driver_id, hours_worked")
      .gte("check_in", `${prevWeek}T00:00:00`)
      .lt("check_in", `${weekStart}T00:00:00`)
      .not("check_out", "is", null),
  ]);

  const weeksFromData = [
    ...new Set((weeksWithDataRes.data ?? []).map((w) => w.week_start)),
  ].slice(0, 12);
  const recentWeeks = getRecentWeeks(8);
  const availableWeeks = [
    ...new Set([...weeksFromData, ...recentWeeks, weekStart]),
  ].sort((a, b) => b.localeCompare(a));
  const payrollResults = payrollRes.data ?? [];
  const earningsMap = new Map<string, { total_trips: number; total_revenue: number }>();
  for (const e of earningsRes.data ?? []) {
    earningsMap.set(`${e.driver_id}:${e.week_start}`, {
      total_trips: e.total_trips ?? 0,
      total_revenue: Number(e.total_revenue),
    });
  }

  const tripsByDriver = new Map<string, { total_trips: number; total_revenue: number }>();
  for (const t of tripsRes.data ?? []) {
    const key = t.driver_id;
    const current = tripsByDriver.get(key) ?? { total_trips: 0, total_revenue: 0 };
    current.total_trips += 1;
    current.total_revenue += Number(t.cost ?? 0) + Number(t.tip ?? 0);
    tripsByDriver.set(key, current);
  }

  const currentHoursMap = new Map<string, number>();
  for (const s of shiftsRes.data ?? []) {
    const current = currentHoursMap.get(s.driver_id) ?? 0;
    currentHoursMap.set(s.driver_id, current + Number(s.hours_worked ?? 0));
  }

  const prevHoursMap = new Map<string, number>();
  for (const s of prevShiftsRes.data ?? []) {
    const current = prevHoursMap.get(s.driver_id) ?? 0;
    prevHoursMap.set(s.driver_id, current + Number(s.hours_worked ?? 0));
  }

  const HOURS_THRESHOLD = 40;
  const REVENUE_THRESHOLD = 6000;
  const SUPPORT_AMOUNT = 1000;
  const BASE_SALARY = 2500;
  const BONUS_STEP = 500;
  const BONUS_PER_STEP = 100;
  const OVERTIME_RATE = 50;
  const MAX_OVERTIME_HOURS = 8;

  const resultsWithTrips = payrollResults.map((r) => {
    const earnings = earningsMap.get(`${r.driver_id}:${r.week_start}`);
    const trips = tripsByDriver.get(r.driver_id);
    const total_trips = earnings?.total_trips ?? trips?.total_trips ?? null;
    const revenueFromSource = earnings?.total_revenue ?? trips?.total_revenue ?? 0;
    const revenue = revenueFromSource > 0 ? revenueFromSource : Number(r.revenue);
    const hoursFromShifts = currentHoursMap.get(r.driver_id) ?? 0;
    const hoursWorked = Math.round((hoursFromShifts || Number(r.hours_worked)) * 100) / 100;
    const prevHours = prevHoursMap.get(r.driver_id) ?? 0;

    const meetsHours = hoursWorked >= HOURS_THRESHOLD;
    const meetsRevenue = revenue >= REVENUE_THRESHOLD;

    let base_salary: number;
    let bonus: number;
    let overtime_pay: number;
    let support: number;
    let total: number;

    if (!meetsHours || !meetsRevenue) {
      base_salary = 0;
      bonus = 0;
      overtime_pay = 0;
      support = SUPPORT_AMOUNT;
      total = SUPPORT_AMOUNT;
    } else {
      const excessRevenue = revenue - REVENUE_THRESHOLD;
      const bonusSteps = Math.floor(excessRevenue / BONUS_STEP);
      bonus = bonusSteps * BONUS_PER_STEP;

      let overtimePay = 0;
      if (prevHours >= HOURS_THRESHOLD) {
        const extraHours = Math.min(hoursWorked - HOURS_THRESHOLD, MAX_OVERTIME_HOURS);
        overtimePay = Math.max(0, extraHours) * OVERTIME_RATE;
      }

      base_salary = BASE_SALARY;
      overtime_pay = overtimePay;
      support = 0;
      total = BASE_SALARY + bonus + overtimePay;
    }

    return {
      ...r,
      hours_worked: hoursWorked,
      total_trips,
      revenue,
      base_salary,
      bonus,
      overtime_pay,
      support,
      total,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">
          Nomina semanal de la flotilla
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse rounded-lg border bg-muted h-64" />}>
        <PayrollClient
          results={resultsWithTrips}
          weekStart={weekStart}
          availableWeeks={availableWeeks}
        />
      </Suspense>
    </div>
  );
};

export default PayrollPage;
