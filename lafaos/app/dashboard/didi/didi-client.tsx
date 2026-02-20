"use client";

import { useState, useTransition, useRef } from "react";
import * as XLSX from "xlsx";
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
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { importDidiTrips, deleteEarningsRecordAction } from "./actions";

const DeleteEarningsButton = ({
  earningsId,
  driverName,
  weekStart,
}: {
  earningsId: string;
  driverName?: string;
  weekStart: string;
}) => (
  <form
    action={async (formData) => {
      const res = await deleteEarningsRecordAction(formData);
      if (res?.error) throw new Error(res.error);
    }}
  >
    <input type="hidden" name="earningsId" value={earningsId} />
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      aria-label={`Eliminar registro de ${driverName ?? "chofer"} semana ${weekStart}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </form>
);
import type { ParsedTrip } from "./actions";

type EarningRow = {
  id: string;
  driver_id: string;
  week_start: string;
  total_trips: number;
  total_revenue: number;
  created_at: string;
  drivers: { id: string; name: string; employee_id: string } | null;
};

type DidiClientProps = {
  earnings: EarningRow[];
  recentTripsCount: number;
};

/**
 * Calcula el lunes de la semana para una fecha dada.
 */
const getWeekStart = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split("T")[0];
};

/**
 * Limpia un valor monetario: remueve $, comas, espacios.
 */
const parseCurrency = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Math.round(value * 100) / 100;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
};

/**
 * Normaliza un valor de hora a formato HH:MM:SS.
 */
const parseTime = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "00:00:00";

  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  }

  const str = String(value).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = match[2];
    const s = match[3] ?? "00";
    return `${h}:${m}:${s}`;
  }

  return "00:00:00";
};

/**
 * Parsea una fecha del Excel (puede ser serial number o string).
 */
const parseDate = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return new Date().toISOString().split("T")[0];
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
  }

  const str = String(value).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
};

export const DidiClient = ({ earnings, recentTripsCount }: DidiClientProps) => {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [preview, setPreview] = useState<ParsedTrip[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setPreview([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const parsed: ParsedTrip[] = (rows as Record<string, unknown>[])
          .filter((row) => row["Driver ID"] && row["Trip ID"])
          .map((row) => {
            const tripDate = parseDate(row["Date"]);
            return {
              didi_driver_id: Number(row["Driver ID"]),
              trip_id: String(row["Trip ID"]).trim(),
              trip_date: tripDate,
              initial_time: parseTime(row["Initial time"]),
              final_time: parseTime(row["Final time"]),
              cost: parseCurrency(row["Cost"]),
              tip: parseCurrency(row["tip"]),
              initial_coordinates: row["Initial coordinates"] ? String(row["Initial coordinates"]).trim() : null,
              final_coordinates: row["final coordinates"] ? String(row["final coordinates"]).trim() : null,
              week_start: getWeekStart(tripDate),
            };
          });

        if (parsed.length === 0) {
          setResult({ type: "error", message: "No se encontraron viajes validos en el archivo. Verifica que las columnas sean: Driver ID, Date, Trip ID, Initial time, Final time, Cost, tip, Initial coordinates, final coordinates." });
          return;
        }

        setPreview(parsed);
      } catch {
        setResult({ type: "error", message: "Error al leer el archivo. Verifica que sea un .xlsx valido." });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (preview.length === 0) return;

    startTransition(async () => {
      const res = await importDidiTrips(preview);
      if (res.error) {
        setResult({ type: "error", message: res.error });
      } else {
        setResult({ type: "success", message: `${res.inserted} viajes importados correctamente` });
        setPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const handleReset = () => {
    setPreview([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uniqueDrivers = [...new Set(preview.map((t) => t.didi_driver_id))];
  const totalRevenue = preview.reduce((sum, t) => sum + t.cost + t.tip, 0);

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar archivo DiDi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              id="didi-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="sr-only"
              aria-label="Seleccionar archivo Excel de DiDi"
            />
            <label
              htmlFor="didi-file-input"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Upload className="h-4 w-4" />
              Seleccionar archivo (.xlsx, .xls)
            </label>
          </div>

          {result && (
            <div
              className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
                result.type === "success"
                  ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-destructive/50 bg-destructive/10 text-destructive"
              }`}
              role="alert"
            >
              {result.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {result.message}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="secondary">{preview.length} viajes</Badge>
                <Badge variant="secondary">{uniqueDrivers.length} choferes</Badge>
                <Badge variant="secondary">
                  ${totalRevenue.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                </Badge>
              </div>

              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DiDi ID</TableHead>
                      <TableHead>Trip ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora inicio</TableHead>
                      <TableHead>Hora fin</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Propina</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 20).map((trip, i) => (
                      <TableRow key={`${trip.trip_id}-${i}`}>
                        <TableCell className="font-mono">{trip.didi_driver_id}</TableCell>
                        <TableCell className="font-mono">{trip.trip_id}</TableCell>
                        <TableCell>{trip.trip_date}</TableCell>
                        <TableCell>{trip.initial_time}</TableCell>
                        <TableCell>{trip.final_time}</TableCell>
                        <TableCell className="text-right">${trip.cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${trip.tip.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.length > 20 && (
                  <p className="px-4 py-2 text-center text-xs text-muted-foreground">
                    Mostrando 20 de {preview.length} viajes
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={isPending}>
                  {isPending ? "Importando..." : `Importar ${preview.length} viajes`}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Ingresos DiDi por semana</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No hay datos de ingresos DiDi. Importa un archivo para comenzar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chofer</TableHead>
                  <TableHead>Semana</TableHead>
                  <TableHead className="text-right">Viajes</TableHead>
                  <TableHead className="text-right">Ingreso total</TableHead>
                  <TableHead>Importado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.drivers?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      Sem. {e.week_start}
                    </TableCell>
                    <TableCell className="text-right">{e.total_trips}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(e.total_revenue).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("es-MX", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <DeleteEarningsButton earningsId={e.id} driverName={e.drivers?.name} weekStart={e.week_start} />
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
