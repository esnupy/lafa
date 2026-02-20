/**
 * Modelos de vehiculos electricos disponibles para la flotilla DiDi.
 */
export type VehicleModelSpec = {
  model: string;
  year: number;
  autonomy_km: number;
  fast_charge: string;
  battery_warranty_km: number;
  didi_category: string;
};

export const VEHICLE_MODELS: VehicleModelSpec[] = [
  {
    model: "GAC AION ES",
    year: 2026,
    autonomy_km: 440,
    fast_charge: "20-80% 30 min",
    battery_warranty_km: 400_000,
    didi_category: "DiDi Premier",
  },
  {
    model: "Geely EX2",
    year: 2026,
    autonomy_km: 410,
    fast_charge: "10-80% 28 min",
    battery_warranty_km: 400_000,
    didi_category: "DiDi Comfort",
  },
  {
    model: "JAC E30X",
    year: 2026,
    autonomy_km: 400,
    fast_charge: "20-80% 30 min",
    battery_warranty_km: 400_000,
    didi_category: "DiDi Comfort",
  },
];

export const getModelDisplayName = (spec: VehicleModelSpec) =>
  `${spec.model} ${spec.year}`;
