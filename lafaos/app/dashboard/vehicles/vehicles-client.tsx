"use client";

import { useState, useTransition, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { createVehicle, updateVehicle, deleteVehicle } from "./actions";
import type { VehicleFormData } from "./actions";
import {
  VEHICLE_MODELS,
  getModelDisplayName,
} from "./vehicle-models";

type Vehicle = {
  id: string;
  plate: string;
  model: string;
  status: "disponible" | "asignado" | "mantenimiento";
  created_at: string;
  autonomy_km: number | null;
  fast_charge: string | null;
  battery_warranty_km: number | null;
  didi_category: string | null;
};

type VehiclesClientProps = {
  vehicles: Vehicle[];
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  disponible: "default",
  asignado: "secondary",
  mantenimiento: "destructive",
};

const STATUS_OPTIONS: Vehicle["status"][] = ["disponible", "asignado", "mantenimiento"];

export const VehiclesClient = ({ vehicles }: VehiclesClientProps) => {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q) ||
        (v.didi_category?.toLowerCase().includes(q) ?? false)
    );
  }, [vehicles, searchQuery]);

  const handleCreate = (formData: FormData) => {
    const modelKey = formData.get("model_key") as string;
    const spec = modelKey
      ? VEHICLE_MODELS.find((m) => getModelDisplayName(m) === modelKey)
      : null;
    const data: VehicleFormData = {
      plate: formData.get("plate") as string,
      model: modelKey || (formData.get("model") as string) || "",
      status: formData.get("status") as Vehicle["status"],
      autonomy_km: spec?.autonomy_km ?? null,
      fast_charge: spec?.fast_charge ?? null,
      battery_warranty_km: spec?.battery_warranty_km ?? null,
      didi_category: spec?.didi_category ?? null,
    };

    setFormError(null);
    startTransition(async () => {
      const result = await createVehicle(data);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setCreateOpen(false);
    });
  };

  const handleEdit = (formData: FormData) => {
    if (!editingVehicle) return;

    const modelKey = formData.get("model_key") as string;
    const spec = modelKey
      ? VEHICLE_MODELS.find((m) => getModelDisplayName(m) === modelKey)
      : null;
    const data: VehicleFormData = {
      plate: formData.get("plate") as string,
      model: modelKey || (formData.get("model") as string) || editingVehicle.model,
      status: formData.get("status") as Vehicle["status"],
      autonomy_km: spec?.autonomy_km ?? (editingVehicle.autonomy_km ?? null),
      fast_charge: spec?.fast_charge ?? editingVehicle.fast_charge ?? null,
      battery_warranty_km:
        spec?.battery_warranty_km ?? editingVehicle.battery_warranty_km ?? null,
      didi_category: spec?.didi_category ?? editingVehicle.didi_category ?? null,
    };

    setFormError(null);
    startTransition(async () => {
      const result = await updateVehicle(editingVehicle.id, data);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setEditOpen(false);
      setEditingVehicle(null);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteVehicle(id);
      if (result.error) {
        setFormError(result.error);
      }
    });
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormError(null);
    setEditOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-3">
          <CardTitle className="shrink-0">Flotilla</CardTitle>
          <div className="relative w-40 shrink-0">
            <Search
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Buscar"
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-8 pl-8 text-sm"
              aria-label="Buscar vehiculos"
            />
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 shrink-0"
                aria-label="Agregar vehiculo"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Agregar vehiculo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo vehiculo</DialogTitle>
                <DialogDescription>
                  Agrega una unidad a la flotilla
                </DialogDescription>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="create-plate">Placa</Label>
                  <Input id="create-plate" name="plate" placeholder="ABC-123" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-model">Modelo</Label>
                  <select
                    id="create-model"
                    name="model_key"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Modelo del vehiculo"
                  >
                    <option value="">Selecciona un modelo</option>
                    {VEHICLE_MODELS.map((m) => (
                      <option key={getModelDisplayName(m)} value={getModelDisplayName(m)}>
                        {getModelDisplayName(m)} - {m.autonomy_km} km - {m.didi_category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-status">Estado</Label>
                  <select
                    id="create-status"
                    name="status"
                    defaultValue="disponible"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Estado del vehiculo"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Autonomía</TableHead>
                <TableHead>Carga rápida</TableHead>
                <TableHead>Garantía batería</TableHead>
                <TableHead>DiDi</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono font-medium">
                    {vehicle.plate}
                  </TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {vehicle.autonomy_km != null
                      ? `${vehicle.autonomy_km} km`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {vehicle.fast_charge ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vehicle.battery_warranty_km != null
                      ? `${(vehicle.battery_warranty_km / 1000).toFixed(0)}k km`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {vehicle.didi_category ? (
                      <Badge variant="secondary">{vehicle.didi_category}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[vehicle.status]}>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(vehicle.created_at).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(vehicle)}
                        aria-label={`Editar ${vehicle.plate}`}
                        tabIndex={0}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(vehicle.id)}
                        disabled={isPending}
                        aria-label={`Eliminar ${vehicle.plate}`}
                        tabIndex={0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    {searchQuery.trim()
                      ? "No se encontraron vehiculos con ese criterio"
                      : "No hay vehiculos registrados"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar vehiculo</DialogTitle>
            <DialogDescription>
              Modifica los datos de la unidad {editingVehicle?.plate}
            </DialogDescription>
          </DialogHeader>
          {editingVehicle && (
            <form action={handleEdit} className="space-y-4">
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-plate">Placa</Label>
                <Input
                  id="edit-plate"
                  name="plate"
                  defaultValue={editingVehicle.plate}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Modelo</Label>
                <select
                  id="edit-model"
                  name="model_key"
                  defaultValue={editingVehicle.model}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Modelo del vehiculo"
                >
                  {!VEHICLE_MODELS.some(
                    (m) => getModelDisplayName(m) === editingVehicle.model
                  ) && (
                    <option value={editingVehicle.model}>
                      {editingVehicle.model}
                    </option>
                  )}
                  {VEHICLE_MODELS.map((m) => (
                    <option key={getModelDisplayName(m)} value={getModelDisplayName(m)}>
                      {getModelDisplayName(m)} - {m.autonomy_km} km - {m.didi_category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Estado</Label>
                <select
                  id="edit-status"
                  name="status"
                  defaultValue={editingVehicle.status}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Estado del vehiculo"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
