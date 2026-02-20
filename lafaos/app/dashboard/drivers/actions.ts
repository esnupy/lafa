"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DriverFormData = {
  name: string;
  employee_id: string;
  didi_driver_id: string;
};

/**
 * Crea un nuevo chofer.
 * @param data - Nombre, ID interno LAFA y DiDi Driver ID.
 */
export const createDriver = async (data: DriverFormData) => {
  const supabase = await createClient();

  const { error } = await supabase.from("drivers").insert({
    name: data.name.trim(),
    employee_id: data.employee_id.trim().toUpperCase(),
    didi_driver_id: data.didi_driver_id ? Number(data.didi_driver_id) : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/drivers");
  return { error: null };
};

/**
 * Actualiza un chofer existente.
 * @param id - UUID del chofer.
 * @param data - Campos a actualizar.
 */
export const updateDriver = async (id: string, data: DriverFormData) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("drivers")
    .update({
      name: data.name.trim(),
      employee_id: data.employee_id.trim().toUpperCase(),
      didi_driver_id: data.didi_driver_id ? Number(data.didi_driver_id) : null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/drivers");
  return { error: null };
};

/**
 * Elimina un chofer.
 * Falla si tiene turnos o viajes asociados (FK constraint).
 * @param id - UUID del chofer.
 */
export const deleteDriver = async (id: string) => {
  const supabase = await createClient();

  const { error } = await supabase.from("drivers").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/drivers");
  return { error: null };
};
