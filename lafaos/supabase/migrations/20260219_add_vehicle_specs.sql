-- Agrega columnas de especificaciones para vehiculos electricos DiDi
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS autonomy_km integer,
  ADD COLUMN IF NOT EXISTS fast_charge text,
  ADD COLUMN IF NOT EXISTS battery_warranty_km integer,
  ADD COLUMN IF NOT EXISTS didi_category text;

COMMENT ON COLUMN vehicles.autonomy_km IS 'Autonomia en km';
COMMENT ON COLUMN vehicles.fast_charge IS 'Tiempo de carga rapida (ej: 20-80% 30 min)';
COMMENT ON COLUMN vehicles.battery_warranty_km IS 'Garantia de bateria en km';
COMMENT ON COLUMN vehicles.didi_category IS 'Categoria DiDi: Premier o Comfort';
