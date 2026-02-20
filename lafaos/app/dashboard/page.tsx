import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Car, UserCheck, Clock, DollarSign, FileSpreadsheet, TrendingUp } from "lucide-react";

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

const getNextWeekStart = (weekStart: string): string => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
};

/**
 * Pagina principal del dashboard.
 * Muestra metricas resumen de la operacion: vehiculos, choferes, turnos activos, ingresos DiDi y payroll.
 */
const DashboardPage = async () => {
  const supabase = await createClient();
  const weekStart = getCurrentWeekStart();
  const nextWeek = getNextWeekStart(weekStart);

  const prevWeek = (() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  })();

  const [
    vehiclesRes,
    driversRes,
    driversListRes,
    activeShiftsRes,
    earningsRes,
    earningsDetailRes,
    tripsRes,
    shiftsRes,
    prevShiftsRes,
  ] = await Promise.all([
    supabase.from("vehicles").select("id", { count: "exact", head: true }),
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("drivers").select("id, name, employee_id").order("name"),
    supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .is("check_out", null),
    supabase
      .from("didi_earnings")
      .select("total_revenue, total_trips")
      .eq("week_start", weekStart),
    supabase
      .from("didi_earnings")
      .select("driver_id, total_trips, total_revenue, drivers(name, employee_id)")
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

  const computePayrollForDriver = (driverId: string, hoursWorked: number, revenue: number) => {
    const prevHours = prevHoursMap.get(driverId) ?? 0;
    const meetsHours = hoursWorked >= HOURS_THRESHOLD;
    const meetsRevenue = revenue >= REVENUE_THRESHOLD;

    if (!meetsHours || !meetsRevenue) {
      return SUPPORT_AMOUNT;
    }
    const excessRevenue = revenue - REVENUE_THRESHOLD;
    const bonus = Math.floor(excessRevenue / BONUS_STEP) * BONUS_PER_STEP;
    let overtimePay = 0;
    if (prevHours >= HOURS_THRESHOLD) {
      const extraHours = Math.min(hoursWorked - HOURS_THRESHOLD, MAX_OVERTIME_HOURS);
      overtimePay = Math.max(0, extraHours) * OVERTIME_RATE;
    }
    return BASE_SALARY + bonus + overtimePay;
  };

  const payrollTotal = (driversListRes.data ?? []).reduce((sum, d) => {
    const hoursWorked = Math.round((currentHoursMap.get(d.id) ?? 0) * 100) / 100;
    const earnings = earningsDetailRes.data?.find((e) => e.driver_id === d.id);
    const trips = tripsRes.data?.filter((t) => t.driver_id === d.id) ?? [];
    const revenue = earnings?.total_revenue ?? trips.reduce((s, t) => s + Number(t.cost ?? 0) + Number(t.tip ?? 0), 0);
    return sum + computePayrollForDriver(d.id, hoursWorked, Number(revenue ?? 0));
  }, 0);

  const earningsRevenue = (earningsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total_revenue),
    0
  );
  const earningsTrips = (earningsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total_trips),
    0
  );

  const tripsRevenue = (tripsRes.data ?? []).reduce(
    (sum, t) => sum + Number(t.cost ?? 0) + Number(t.tip ?? 0),
    0
  );
  const tripsCount = tripsRes.data?.length ?? 0;

  const didiRevenue = earningsRevenue > 0 ? earningsRevenue : tripsRevenue;
  const didiTrips = earningsTrips > 0 ? earningsTrips : tripsCount;

  const formatMXN = (value: number) =>
    `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const payrollByDriver = new Map<string, number>();
  for (const d of driversListRes.data ?? []) {
    const hoursWorked = Math.round((currentHoursMap.get(d.id) ?? 0) * 100) / 100;
    const earnings = earningsDetailRes.data?.find((e) => e.driver_id === d.id);
    const trips = tripsRes.data?.filter((t) => t.driver_id === d.id) ?? [];
    const revenue = earnings?.total_revenue ?? trips.reduce((s, t) => s + Number(t.cost ?? 0) + Number(t.tip ?? 0), 0);
    payrollByDriver.set(d.id, computePayrollForDriver(d.id, hoursWorked, Number(revenue ?? 0)));
  }

  const earningsByDriver = new Map(
    (earningsDetailRes.data ?? []).map((e) => [
      e.driver_id,
      {
        total_trips: e.total_trips ?? 0,
        total_revenue: Number(e.total_revenue),
      },
    ])
  );

  const tripsByDriver = new Map<string, { count: number; revenue: number }>();
  for (const t of tripsRes.data ?? []) {
    const existing = tripsByDriver.get(t.driver_id) ?? { count: 0, revenue: 0 };
    tripsByDriver.set(t.driver_id, {
      count: existing.count + 1,
      revenue: existing.revenue + Number(t.cost ?? 0) + Number(t.tip ?? 0),
    });
  }

  const driversSummary = (driversListRes.data ?? []).map((d) => {
    const payroll = payrollByDriver.get(d.id);
    const earnings = earningsByDriver.get(d.id);
    const trips = tripsByDriver.get(d.id);
    const tripsCount = earnings?.total_trips ?? trips?.count ?? 0;
    const tripsRevenue = earnings?.total_revenue ?? trips?.revenue ?? 0;
    return {
      id: d.id,
      name: d.name,
      employee_id: d.employee_id,
      trips: tripsCount,
      revenue: tripsRevenue,
      payroll: payroll ?? null,
    };
  });

  const metrics = [
    {
      title: "Vehiculos",
      value: vehiclesRes.count ?? 0,
      icon: Car,
      description: "Total registrados",
    },
    {
      title: "Choferes",
      value: driversRes.count ?? 0,
      icon: UserCheck,
      description: "Total registrados",
    },
    {
      title: "Turnos activos",
      value: activeShiftsRes.count ?? 0,
      icon: Clock,
      description: "Sin check-out",
    },
    {
      title: "Ingresos DiDi",
      value: formatMXN(didiRevenue),
      icon: FileSpreadsheet,
      description: `${didiTrips} viajes esta semana`,
    },
    {
      title: "Payroll",
      value: formatMXN(payrollTotal),
      icon: DollarSign,
      description: "Nomina esta semana",
    },
    {
      title: "Semana",
      value: weekStart,
      icon: TrendingUp,
      description: "Semana actual (lunes)",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de la operacion de LAFA
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choferes - Semana actual</CardTitle>
          <p className="text-sm text-muted-foreground">
            Viajes e ingresos DiDi, y nomina de la semana {weekStart}
          </p>
        </CardHeader>
        <CardContent>
          {driversSummary.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay choferes registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chofer</TableHead>
                  <TableHead>ID Empleado</TableHead>
                  <TableHead className="text-right">Viajes</TableHead>
                  <TableHead className="text-right">Ingresos DiDi</TableHead>
                  <TableHead className="text-right">Nomina</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driversSummary.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.employee_id}</TableCell>
                    <TableCell className="text-right">{row.trips}</TableCell>
                    <TableCell className="text-right">
                      {formatMXN(row.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.payroll !== null ? formatMXN(row.payroll) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
