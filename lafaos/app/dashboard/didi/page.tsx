import { createClient } from "@/lib/supabase/server";
import { DidiClient } from "./didi-client";

/**
 * Pagina de importacion de datos DiDi.
 * Upload de .xlsx, parseo en frontend, insercion en didi_trips y didi_earnings.
 */
const DidiPage = async () => {
  const supabase = await createClient();

  const { data: earnings } = await supabase
    .from("didi_earnings")
    .select(`
      id,
      driver_id,
      week_start,
      total_trips,
      total_revenue,
      created_at,
      drivers ( id, name, employee_id )
    `)
    .order("week_start", { ascending: false })
    .limit(50);

  const { data: recentTrips } = await supabase
    .from("didi_trips")
    .select("id, trip_id, trip_date, cost, tip, didi_driver_id")
    .order("imported_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DiDi</h1>
        <p className="text-muted-foreground">
          Importa el archivo semanal de viajes DiDi (.xlsx)
        </p>
      </div>

      <DidiClient
        earnings={earnings ?? []}
        recentTripsCount={recentTrips?.length ?? 0}
      />
    </div>
  );
};

export default DidiPage;
