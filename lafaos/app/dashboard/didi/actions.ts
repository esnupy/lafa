"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type ParsedTrip = {
  didi_driver_id: number;
  trip_id: string;
  trip_date: string;
  initial_time: string;
  final_time: string;
  cost: number;
  tip: number;
  initial_coordinates: string | null;
  final_coordinates: string | null;
  week_start: string;
};

/**
 * Inserta viajes parseados en didi_trips y actualiza didi_earnings.
 * Mapea didi_driver_id a driver_id interno via la tabla drivers.
 * Usa service role para evitar RLS; valida que el usuario sea admin/supervisor.
 * @param trips - Array de viajes ya parseados y limpios desde el frontend.
 */
export const importDidiTrips = async (trips: ParsedTrip[]) => {
  const supabase = await createClient();

  if (trips.length === 0) {
    return { error: "No hay viajes para importar", inserted: 0 };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Debes iniciar sesión para importar", inserted: 0 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || !["admin", "supervisor"].includes(profile.role)) {
    return { error: "No tienes permiso para importar viajes DiDi", inserted: 0 };
  }

  const adminClient = createServiceRoleClient();
  const uniqueDriverIds = [...new Set(trips.map((t) => t.didi_driver_id))];

  const { data: drivers } = await adminClient
    .from("drivers")
    .select("id, didi_driver_id")
    .in("didi_driver_id", uniqueDriverIds);

  const driverMap = new Map(
    (drivers ?? []).map((d) => [Number(d.didi_driver_id), d.id])
  );

  const unmapped = uniqueDriverIds.filter((id) => !driverMap.has(id));
  if (unmapped.length > 0) {
    return {
      error: `DiDi Driver IDs sin mapear en el sistema: ${unmapped.join(", ")}. Registra estos choferes primero.`,
      inserted: 0,
    };
  }

  const rows = trips.map((t) => ({
    driver_id: driverMap.get(t.didi_driver_id)!,
    didi_driver_id: t.didi_driver_id,
    trip_id: t.trip_id,
    trip_date: t.trip_date,
    initial_time: t.initial_time,
    final_time: t.final_time,
    cost: t.cost,
    tip: t.tip,
    initial_coordinates: t.initial_coordinates,
    final_coordinates: t.final_coordinates,
    week_start: t.week_start,
  }));

  const uniqueRows = Array.from(
    new Map(rows.map((r) => [r.trip_id, r])).values()
  );

  const uniqueTrips = Array.from(
    new Map(trips.map((t) => [t.trip_id, t])).values()
  );

  const { error: insertError, count } = await adminClient
    .from("didi_trips")
    .upsert(uniqueRows, { onConflict: "trip_id", count: "exact" });

  if (insertError) {
    return { error: insertError.message, inserted: 0 };
  }

  const earningsMap = new Map<string, { driver_id: string; week_start: string; total_trips: number; total_revenue: number; raw_data: ParsedTrip[] }>();

  for (const trip of uniqueTrips) {
    const driverId = driverMap.get(trip.didi_driver_id)!;
    const key = `${driverId}_${trip.week_start}`;

    if (!earningsMap.has(key)) {
      earningsMap.set(key, {
        driver_id: driverId,
        week_start: trip.week_start,
        total_trips: 0,
        total_revenue: 0,
        raw_data: [],
      });
    }

    const entry = earningsMap.get(key)!;
    entry.total_trips += 1;
    entry.total_revenue += trip.cost + trip.tip;
    entry.raw_data.push(trip);
  }

  const earningsRows = Array.from(earningsMap.values()).map((e) => ({
    driver_id: e.driver_id,
    week_start: e.week_start,
    total_trips: e.total_trips,
    total_revenue: Math.round(e.total_revenue * 100) / 100,
    raw_data: JSON.stringify(e.raw_data),
  }));

  const { error: earningsError } = await adminClient
    .from("didi_earnings")
    .upsert(earningsRows, { onConflict: "driver_id,week_start" });

  if (earningsError) {
    return { error: `Viajes insertados pero error en earnings: ${earningsError.message}`, inserted: count ?? 0 };
  }

  revalidatePath("/dashboard/didi");
  revalidatePath("/dashboard");
  return { error: null, inserted: count ?? uniqueRows.length };
};

/**
 * Elimina un registro de ingresos DiDi y sus viajes asociados.
 * Requiere rol admin o supervisor.
 * @param earningsId - ID del registro en didi_earnings
 */
export const deleteEarningsRecord = async (earningsId: string) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Debes iniciar sesion para eliminar" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || !["admin", "supervisor"].includes(profile.role)) {
    return { error: "No tienes permiso para eliminar registros DiDi" };
  }

  const { data: earnings } = await supabase
    .from("didi_earnings")
    .select("driver_id, week_start")
    .eq("id", earningsId)
    .single();

  if (!earnings) {
    return { error: "Registro no encontrado" };
  }

  const adminClient = createServiceRoleClient();

  const { error: tripsError } = await adminClient
    .from("didi_trips")
    .delete()
    .eq("driver_id", earnings.driver_id)
    .eq("week_start", earnings.week_start);

  if (tripsError) {
    return { error: `Error al eliminar viajes: ${tripsError.message}` };
  }

  const { error: earningsError } = await adminClient
    .from("didi_earnings")
    .delete()
    .eq("id", earningsId);

  if (earningsError) {
    return { error: `Error al eliminar registro: ${earningsError.message}` };
  }

  revalidatePath("/dashboard/didi");
  revalidatePath("/dashboard");
  return { error: null };
};

/**
 * Wrapper para usar en form action. Recibe FormData con earningsId.
 */
export const deleteEarningsRecordAction = async (formData: FormData) => {
  const id = formData.get("earningsId") as string;
  if (!id) return { error: "ID requerido" };
  return deleteEarningsRecord(id);
};
