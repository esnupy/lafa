"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Registra check-in de un chofer: crea un turno nuevo con vehiculo asignado.
 * Valida que el chofer no tenga un turno activo y que el vehiculo este disponible.
 * @param driverId - UUID del chofer.
 * @param vehicleId - UUID del vehiculo a asignar.
 */
export const checkIn = async (driverId: string, vehicleId: string) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return { error: "Perfil no encontrado" };
  }

  const { data: activeShift } = await supabase
    .from("shifts")
    .select("id")
    .eq("driver_id", driverId)
    .is("check_out", null)
    .maybeSingle();

  if (activeShift) {
    return { error: "Este chofer ya tiene un turno activo" };
  }

  const { error: shiftError } = await supabase.from("shifts").insert({
    driver_id: driverId,
    vehicle_id: vehicleId,
    supervisor_id: profile.id,
  });

  if (shiftError) {
    return { error: shiftError.message };
  }

  await supabase
    .from("vehicles")
    .update({ status: "asignado" as const })
    .eq("id", vehicleId);

  revalidatePath("/dashboard/shifts");
  return { error: null };
};

/**
 * Registra check-out de un turno activo.
 * Calcula horas trabajadas automaticamente (columna generada en DB).
 * Libera el vehiculo asignado.
 * @param shiftId - UUID del turno a cerrar.
 * @param vehicleId - UUID del vehiculo a liberar.
 */
export const checkOut = async (shiftId: string, vehicleId: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("shifts")
    .update({ check_out: new Date().toISOString() })
    .eq("id", shiftId);

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("vehicles")
    .update({ status: "disponible" as const })
    .eq("id", vehicleId);

  revalidatePath("/dashboard/shifts");
  return { error: null };
};
