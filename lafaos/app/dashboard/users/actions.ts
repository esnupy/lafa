"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Actualiza el rol de un usuario en la tabla profiles.
 * Solo accesible por admins (protegido por RLS).
 * @param profileId - UUID del perfil a actualizar.
 * @param newRole - Nuevo rol: 'admin' o 'supervisor'.
 */
export const updateUserRole = async (profileId: string, newRole: "admin" | "supervisor") => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", profileId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/users");
};
