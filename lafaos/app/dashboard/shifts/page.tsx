import { createClient } from "@/lib/supabase/server";
import { ShiftsClient } from "./shifts-client";

/**
 * Pagina de gestion de turnos.
 * Muestra turnos activos con opcion de check-out, y formulario de check-in.
 */
const ShiftsPage = async () => {
  const supabase = await createClient();

  const { data: shifts } = await supabase
    .from("shifts")
    .select(`
      id,
      check_in,
      check_out,
      hours_worked,
      created_at,
      driver_id,
      vehicle_id,
      drivers ( id, name, employee_id ),
      vehicles ( id, plate, model ),
      profiles ( id, name )
    `)
    .order("check_in", { ascending: false })
    .limit(50);

  const { data: availableDrivers } = await supabase
    .from("drivers")
    .select("id, name, employee_id")
    .order("name");

  const { data: availableVehicles } = await supabase
    .from("vehicles")
    .select("id, plate, model")
    .eq("status", "disponible")
    .order("plate");

  const activeShiftDriverIds = (shifts ?? [])
    .filter((s) => !s.check_out)
    .map((s) => s.driver_id);

  const driversWithoutActiveShift = (availableDrivers ?? []).filter(
    (d) => !activeShiftDriverIds.includes(d.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Turnos</h1>
        <p className="text-muted-foreground">
          Registra check-in y check-out de choferes
        </p>
      </div>

      <ShiftsClient
        shifts={shifts ?? []}
        availableDrivers={driversWithoutActiveShift}
        availableVehicles={availableVehicles ?? []}
      />
    </div>
  );
};

export default ShiftsPage;
