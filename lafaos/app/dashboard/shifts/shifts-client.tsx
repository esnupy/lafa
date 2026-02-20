"use client";

import { useState, useTransition } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut, Clock } from "lucide-react";
import { checkIn, checkOut } from "./actions";

type ShiftRow = {
  id: string;
  check_in: string;
  check_out: string | null;
  hours_worked: number | null;
  driver_id: string;
  vehicle_id: string;
  drivers: { id: string; name: string; employee_id: string } | null;
  vehicles: { id: string; plate: string; model: string } | null;
  profiles: { id: string; name: string } | null;
};

type DriverOption = { id: string; name: string; employee_id: string };
type VehicleOption = { id: string; plate: string; model: string };

type ShiftsClientProps = {
  shifts: ShiftRow[];
  availableDrivers: DriverOption[];
  availableVehicles: VehicleOption[];
};

export const ShiftsClient = ({
  shifts,
  availableDrivers,
  availableVehicles,
}: ShiftsClientProps) => {
  const [isPending, startTransition] = useTransition();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const activeShifts = shifts.filter((s) => !s.check_out);
  const completedShifts = shifts.filter((s) => s.check_out);

  const handleCheckIn = (formData: FormData) => {
    const driverId = formData.get("driver_id") as string;
    const vehicleId = formData.get("vehicle_id") as string;

    if (!driverId || !vehicleId) {
      setFormError("Selecciona un chofer y un vehiculo");
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const result = await checkIn(driverId, vehicleId);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setCheckInOpen(false);
    });
  };

  const handleCheckOut = (shiftId: string, vehicleId: string) => {
    startTransition(async () => {
      const result = await checkOut(shiftId, vehicleId);
      if (result.error) {
        setFormError(result.error);
      }
    });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("es-MX", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatHours = (hours: number | null) => {
    if (hours === null) return "—";
    return `${hours.toFixed(1)} hrs`;
  };

  return (
    <div className="space-y-6">
      {/* Active Shifts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Turnos activos</CardTitle>
            <Badge variant="default">{activeShifts.length}</Badge>
          </div>
          <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                aria-label="Registrar check-in"
                disabled={availableDrivers.length === 0 || availableVehicles.length === 0}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check-in
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar check-in</DialogTitle>
                <DialogDescription>
                  Asigna un chofer a un vehiculo disponible
                </DialogDescription>
              </DialogHeader>
              <form action={handleCheckIn} className="space-y-4">
                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="checkin-driver">Chofer</Label>
                  <select
                    id="checkin-driver"
                    name="driver_id"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Seleccionar chofer"
                  >
                    <option value="">Selecciona un chofer</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkin-vehicle">Vehiculo</Label>
                  <select
                    id="checkin-vehicle"
                    name="vehicle_id"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Seleccionar vehiculo"
                  >
                    <option value="">Selecciona un vehiculo</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} — {v.model}
                      </option>
                    ))}
                  </select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Registrando..." : "Registrar entrada"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {activeShifts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No hay turnos activos en este momento
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chofer</TableHead>
                  <TableHead>Vehiculo</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">
                      {shift.drivers?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {shift.vehicles?.plate ?? "—"}
                    </TableCell>
                    <TableCell>{formatTime(shift.check_in)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {shift.profiles?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckOut(shift.id, shift.vehicle_id)}
                        disabled={isPending}
                        aria-label={`Check-out ${shift.drivers?.name}`}
                        tabIndex={0}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Check-out
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Completed Shifts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Historial de turnos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {completedShifts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No hay turnos completados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chofer</TableHead>
                  <TableHead>Vehiculo</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">
                      {shift.drivers?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {shift.vehicles?.plate ?? "—"}
                    </TableCell>
                    <TableCell>{formatTime(shift.check_in)}</TableCell>
                    <TableCell>
                      {shift.check_out ? formatTime(shift.check_out) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatHours(shift.hours_worked)}
                      </Badge>
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
