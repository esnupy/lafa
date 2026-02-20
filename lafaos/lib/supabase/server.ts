import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Crea un cliente Supabase para Server Components y Server Actions.
 * Gestiona cookies de sesion de forma segura en el servidor.
 * @returns Instancia de SupabaseClient con acceso a cookies del request.
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll puede fallar en Server Components (read-only).
            // Es seguro ignorar si el middleware maneja el refresh.
          }
        },
      },
    }
  );
};

/**
 * Cliente con service role para operaciones que requieren bypass de RLS.
 * SOLO usar en Server Actions, nunca exponer al cliente.
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local
 */
export const createServiceRoleClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada en .env.local");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false } }
  );
};
