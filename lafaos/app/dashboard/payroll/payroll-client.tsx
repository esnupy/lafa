"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, DollarSign, Info, Calendar } from "lucide-react";

type PayrollRow = {
  id: string;
  driver_id: string;
  week_start: string;
  hours_worked: number;
  revenue: number;
  base_salary: number;
  bonus: number;
  overtime_pay: number;
  support: number;
  total: number;
  calculated_at: string;
  total_trips: number | null;
  drivers: { id: string; name: string; employee_id: string } | null;
};

type PayrollClientProps = {
  results: PayrollRow[];
  weekStart: string;
  availableWeeks: string[];
};

const formatMXN = (value: number) =>
  `$${Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

const formatWeekLabel = (weekStart: string) => {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `Semana del ${date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
};

export const PayrollClient = ({
  results,
  weekStart,
  availableWeeks,
}: PayrollClientProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleWeekChange = (newWeek: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", newWeek);
    router.push(`/dashboard/payroll?${params.toString()}`);
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = [
      "Chofer",
      "ID Empleado",
      "Semana",
      "Horas",
      "Viajes",
      "Ingresos DiDi",
      "Salario Base",
      "Bono",
      "Horas Extra",
      "Apoyo",
      "Total",
    ];

    const rows = results.map((r) => [
      r.drivers?.name ?? "",
      r.drivers?.employee_id ?? "",
      r.week_start,
      Number(r.hours_worked).toFixed(1),
      r.total_trips ?? "",
      Number(r.revenue).toFixed(2),
      Number(r.base_salary).toFixed(2),
      Number(r.bonus).toFixed(2),
      Number(r.overtime_pay).toFixed(2),
      Number(r.support).toFixed(2),
      Number(r.total).toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll_lafa_${weekStart}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const grandTotal = results.reduce((sum, r) => sum + Number(r.total), 0);
  const hasNoData = results.length === 0;

  return (
    <div className="space-y-6">
      {/* Selector de semana */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Semana a pagar
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecciona la semana para ver el detalle de pago de cada chofer
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="week-select">Semana (lunes)</Label>
              <Select value={weekStart} onValueChange={handleWeekChange}>
                <SelectTrigger id="week-select" className="w-[280px]">
                  <SelectValue placeholder="Seleccionar semana" />
                </SelectTrigger>
                <SelectContent>
                  {availableWeeks.map((w) => (
                    <SelectItem key={w} value={w}>
                      {formatWeekLabel(w)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criterios de calculo */}
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            Criterios de calculo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Horas:</strong> de turnos registrados (check-in/check-out). Meta: ≥40 hrs.
          </p>
          <p>
            <strong className="text-foreground">Ingresos DiDi:</strong> suma de viajes importados. Meta: ≥$6,000 MXN.
          </p>
          <p>
            Si cumple ambas metas: Base $2,500 + Bono ($100 por cada $500 sobre $6,000) + Horas extra ($50/hr, max 8 hrs, solo si semana anterior ≥40 hrs).
          </p>
          <p>
            Si no cumple: Apoyo $1,000.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resultados de nomina
            </CardTitle>
            {results.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {formatWeekLabel(weekStart)} | {results.length} chofer(es) | Total: {formatMXN(grandTotal)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {formatWeekLabel(weekStart)}
              </p>
            )}
          </div>
          {results.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleExportCSV} aria-label="Exportar CSV">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {hasNoData ? (
            <p className="py-8 text-center text-muted-foreground">
              No hay nomina calculada para esta semana.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chofer</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Viajes</TableHead>
                    <TableHead className="text-right">Ingresos DiDi</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Bono</TableHead>
                    <TableHead className="text-right">Hrs Extra</TableHead>
                    <TableHead className="text-right">Apoyo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => {
                    const isSupport = Number(r.support) > 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.drivers?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(r.hours_worked) >= 40 ? "default" : "destructive"}>
                            {Number(r.hours_worked).toFixed(1)} hrs
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.total_trips != null ? (
                            <span className="tabular-nums">{r.total_trips}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(r.revenue) >= 6000 ? "default" : "destructive"}>
                            {formatMXN(Number(r.revenue))}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatMXN(Number(r.base_salary))}</TableCell>
                        <TableCell className="text-right">{formatMXN(Number(r.bonus))}</TableCell>
                        <TableCell className="text-right">{formatMXN(Number(r.overtime_pay))}</TableCell>
                        <TableCell className="text-right">
                          {isSupport ? (
                            <Badge variant="secondary">{formatMXN(Number(r.support))}</Badge>
                          ) : (
                            formatMXN(0)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatMXN(Number(r.total))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
