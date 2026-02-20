"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, MoreVertical, DollarSign } from "lucide-react";
import { createDriver, updateDriver, deleteDriver } from "./actions";
import type { DriverFormData } from "./actions";

type Driver = {
  id: string;
  name: string;
  employee_id: string;
  didi_driver_id: number | null;
  created_at: string;
};

type DriversClientProps = {
  drivers: Driver[];
};

const getCurrentWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
};

export const DriversClient = ({ drivers }: DriversClientProps) => {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const extractFormData = (formData: FormData): DriverFormData => ({
    name: formData.get("name") as string,
    employee_id: formData.get("employee_id") as string,
    didi_driver_id: formData.get("didi_driver_id") as string,
  });

  const handleCreate = (formData: FormData) => {
    const data = extractFormData(formData);
    setFormError(null);
    startTransition(async () => {
      const result = await createDriver(data);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setCreateOpen(false);
    });
  };

  const handleEdit = (formData: FormData) => {
    if (!editingDriver) return;
    const data = extractFormData(formData);
    setFormError(null);
    startTransition(async () => {
      const result = await updateDriver(editingDriver.id, data);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setEditOpen(false);
      setEditingDriver(null);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteDriver(id);
      if (result.error) {
        setFormError(result.error);
      }
    });
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormError(null);
    setEditOpen(true);
  };

  const renderForm = (
    onAction: (formData: FormData) => void,
    defaults?: Driver
  ) => (
    <form action={onAction} className="space-y-4">
      {formError && <p className="text-sm text-destructive">{formError}</p>}
      <div className="space-y-2">
        <Label htmlFor={defaults ? "edit-name" : "create-name"}>Nombre</Label>
        <Input
          id={defaults ? "edit-name" : "create-name"}
          name="name"
          placeholder="Juan Perez"
          defaultValue={defaults?.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={defaults ? "edit-employee_id" : "create-employee_id"}>
          ID Empleado (LAFA)
        </Label>
        <Input
          id={defaults ? "edit-employee_id" : "create-employee_id"}
          name="employee_id"
          placeholder="LAFA-001"
          defaultValue={defaults?.employee_id}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={defaults ? "edit-didi_id" : "create-didi_id"}>
          DiDi Driver ID
        </Label>
        <Input
          id={defaults ? "edit-didi_id" : "create-didi_id"}
          name="didi_driver_id"
          type="number"
          placeholder="10001"
          defaultValue={defaults?.didi_driver_id?.toString() ?? ""}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : defaults ? "Guardar cambios" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Choferes</CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" aria-label="Agregar chofer">
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo chofer</DialogTitle>
                <DialogDescription>
                  Registra un chofer en el sistema
                </DialogDescription>
              </DialogHeader>
              {renderForm(handleCreate)}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>ID Empleado</TableHead>
                <TableHead>DiDi ID</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell className="font-mono">{driver.employee_id}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {driver.didi_driver_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(driver.created_at).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={`Acciones de ${driver.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/payroll?week=${getCurrentWeekStart()}&driver=${driver.id}`}
                            className="flex cursor-pointer items-center"
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Ver nomina
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(driver)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(driver.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No hay choferes registrados
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
            <DialogTitle>Editar chofer</DialogTitle>
            <DialogDescription>
              Modifica los datos de {editingDriver?.name}
            </DialogDescription>
          </DialogHeader>
          {editingDriver && renderForm(handleEdit, editingDriver)}
        </DialogContent>
      </Dialog>
    </>
  );
};
