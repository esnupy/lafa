import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehiclesClient } from "./vehicles-client";
import { VEHICLE_MODELS, getModelDisplayName } from "./vehicle-models";

/**
 * Cuenta vehiculos por modelo (GAC AION ES, Geely EX2, JAC E30X).
 * Usa ILIKE para coincidir variantes como "GAC AION ES 2026".
 */
const getModelCounts = (
  vehicles: { model: string }[]
): { model: string; displayName: string; count: number }[] =>
  VEHICLE_MODELS.map((spec) => ({
    model: spec.model,
    displayName: getModelDisplayName(spec),
    count: vehicles.filter((v) =>
      v.model.toLowerCase().includes(spec.model.toLowerCase())
    ).length,
  }));

/**
 * Pagina de gestion de vehiculos.
 * Muestra cards con conteo por modelo y tabla con CRUD completo.
 */
const VehiclesPage = async () => {
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: true });

  const vehiclesList = vehicles ?? [];
  const modelCounts = getModelCounts(vehiclesList);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vehiculos</h1>
        <p className="text-muted-foreground">
          Gestiona la flotilla de unidades
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modelCounts.map(({ model, displayName, count }) => (
          <Card key={model}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {displayName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
              <p className="text-xs text-muted-foreground">
                {count === 1 ? "unidad" : "unidades"} en flotilla
              </p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehiclesList.length}</div>
            <p className="text-xs text-muted-foreground">
              vehiculos en flotilla
            </p>
          </CardContent>
        </Card>
      </div>

      <VehiclesClient vehicles={vehiclesList} />
    </div>
  );
};

export default VehiclesPage;
