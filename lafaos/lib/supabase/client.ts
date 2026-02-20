import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Crea un cliente Supabase tipado para uso en componentes del lado del cliente (browser).
 * @returns Instancia de SupabaseClient<Database> configurada con las variables de entorno publicas.
 */
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
