"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Inicia sesion con email y password.
 * Redirige al dashboard si es exitoso, o devuelve error.
 * @param formData - FormData con campos email y password.
 */
export const signIn = async (formData: FormData) => {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
};

/**
 * Registra un nuevo usuario con email, password y nombre.
 * El trigger de DB crea automaticamente el perfil con rol supervisor.
 * @param formData - FormData con campos email, password y name.
 */
export const signUp = async (formData: FormData) => {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
};
