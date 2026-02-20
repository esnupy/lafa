"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type VehicleFormData = {
  plate: string;
  model: string;
  status: "disponible" | "asignado" | "mantenimiento";
  autonomy_km?: number | null;
  fast_charge?: string | null;
  battery_warranty_km?: number | null;
  didi_category?: string | null;
};

/**
 * Crea un nuevo vehiculo en la flotilla.
 * @param data - Datos del vehiculo: placa, modelo, estado y especificaciones.
 */
export const createVehicle = async (data: VehicleFormData) => {
  const supabase = await createClient();

  const { error } = await supabase.from("vehicles").insert({
    plate: data.plate.trim().toUpperCase(),
    model: data.model.trim(),
    status: data.status,
    autonomy_km: data.autonomy_km ?? null,
    fast_charge: data.fast_charge ?? null,
    battery_warranty_km: data.battery_warranty_km ?? null,
    didi_category: data.didi_category ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/vehicles");
  return { error: null };
};

/**
 * Actualiza un vehiculo existente.
 * @param id - UUID del vehiculo.
 * @param data - Campos a actualizar.
 */
export const updateVehicle = async (id: string, data: Partial<VehicleFormData>) => {
  const supabase = await createClient();

  const updateData: Record<string, string | number | null> = {};
  if (data.plate) updateData.plate = data.plate.trim().toUpperCase();
  if (data.model) updateData.model = data.model.trim();
  if (data.status) updateData.status = data.status;
  if (data.autonomy_km !== undefined) updateData.autonomy_km = data.autonomy_km;
  if (data.fast_charge !== undefined) updateData.fast_charge = data.fast_charge;
  if (data.battery_warranty_km !== undefined)
    updateData.battery_warranty_km = data.battery_warranty_km;
  if (data.didi_category !== undefined) updateData.didi_category = data.didi_category;

  const { error } = await supabase.from("vehicles").update(updateData).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/vehicles");
  return { error: null };
};

/**
 * Elimina un vehiculo de la flotilla.
 * Falla si el vehiculo tiene turnos asociados (FK constraint).
 * @param id - UUID del vehiculo.
 */
export const deleteVehicle = async (id: string) => {
  const supabase = await createClient();

  const { error } = await supabase.from("vehicles").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/vehicles");
  return { error: null };
};
