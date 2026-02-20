import { createClient } from "@/lib/supabase/server";
import { DriversClient } from "./drivers-client";

/**
 * Pagina de gestion de choferes.
 * Muestra tabla con CRUD completo: crear, editar, eliminar.
 */
const DriversPage = async () => {
  const supabase = await createClient();

  const { data: drivers } = await supabase
    .from("drivers")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Choferes</h1>
        <p className="text-muted-foreground">
          Gestiona los choferes de la flotilla
        </p>
      </div>

      <DriversClient drivers={drivers ?? []} />
    </div>
  );
};

export default DriversPage;
