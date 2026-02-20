-- Flotilla LAFA: 222 vehiculos electricos (GAC AION ES, Geely EX2, JAC E30X)

-- 1. Inserta 1 EV si no hay ninguno (necesario para reasignar turnos de mock)
INSERT INTO vehicles (plate, model, status, autonomy_km, fast_charge, battery_warranty_km, didi_category)
SELECT 'LAFA-220001', 'GAC AION ES 2026', 'disponible', 440, '20-80% 30 min', 400000, 'DiDi Premier'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE model ILIKE 'GAC AION ES%' OR model ILIKE 'Geely EX2%' OR model ILIKE 'JAC E30X%');

-- 2. Reasigna turnos de vehiculos mock al primer EV disponible (evita violacion FK)
UPDATE shifts
SET vehicle_id = (SELECT id FROM vehicles WHERE (model ILIKE 'GAC AION ES%' OR model ILIKE 'Geely EX2%' OR model ILIKE 'JAC E30X%') LIMIT 1)
WHERE vehicle_id IN (
  SELECT id FROM vehicles
  WHERE model NOT ILIKE 'GAC AION ES%'
    AND model NOT ILIKE 'Geely EX2%'
    AND model NOT ILIKE 'JAC E30X%'
);

-- 3. Elimina vehiculos que NO son electricos
DELETE FROM vehicles
WHERE model NOT ILIKE 'GAC AION ES%'
  AND model NOT ILIKE 'Geely EX2%'
  AND model NOT ILIKE 'JAC E30X%';

-- 4. Inserta vehiculos electricos hasta completar 222 en la flotilla
-- Distribucion: 74 GAC AION ES, 74 Geely EX2, 74 JAC E30X
DO $$
DECLARE
  ev_count int;
  to_insert int;
  specs text[][] := ARRAY[
    ARRAY['GAC AION ES 2026', '440', '20-80% 30 min', 'DiDi Premier'],
    ARRAY['Geely EX2 2026', '410', '10-80% 28 min', 'DiDi Comfort'],
    ARRAY['JAC E30X 2026', '400', '20-80% 30 min', 'DiDi Comfort']
  ];
  i int;
  model_idx int;
  plate_num int;
BEGIN
  SELECT COUNT(*) INTO ev_count FROM vehicles
  WHERE model ILIKE 'GAC AION ES%' OR model ILIKE 'Geely EX2%' OR model ILIKE 'JAC E30X%';
  to_insert := GREATEST(0, 222 - ev_count);

  FOR i IN 1..to_insert LOOP
    model_idx := ((i - 1) % 3) + 1;
    plate_num := 222000 + i;
    INSERT INTO vehicles (plate, model, status, autonomy_km, fast_charge, battery_warranty_km, didi_category)
    VALUES (
      'LAFA-' || plate_num::text,
      specs[model_idx][1],
      'disponible',
      specs[model_idx][2]::int,
      specs[model_idx][3],
      400000,
      specs[model_idx][4]
    );
  END LOOP;
END $$;
