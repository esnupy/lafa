-- Datos realistas para validar payroll: esta semana (16 feb) y proxima (23 feb).
-- Incluye shifts (horas) y didi_earnings (viajes + ingresos) para todos los choferes.
-- Variedad: algunos cumplen metas (40hrs + $6k), otros reciben apoyo.

-- Limpiar datos previos de estas semanas para evitar duplicados
DELETE FROM shifts WHERE check_in >= '2026-02-16' AND check_in < '2026-03-02';
DELETE FROM didi_earnings WHERE week_start IN ('2026-02-16', '2026-02-23');

DO $$
DECLARE
  v_vehicle_id uuid;
  v_supervisor_id uuid;
  r RECORD;
  idx int := 0;
  -- Perfiles: 0=full (45h, $8.5k), 1=base+bonus (42h, $7.2k), 2=base only (40h, $6k), 3=support (35h, $5k), 4=support (38h, $4.5k)
  v_hours numeric;
  v_revenue numeric;
  v_trips int;
  v_week_start date;
  v_check_in timestamptz;
  v_check_out timestamptz;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles LIMIT 1;
  SELECT id INTO v_supervisor_id FROM profiles WHERE role IN ('admin', 'supervisor') LIMIT 1;

  IF v_vehicle_id IS NULL OR v_supervisor_id IS NULL THEN
    RAISE NOTICE 'Saltando seed: falta vehicle o supervisor';
    RETURN;
  END IF;

  FOR r IN (SELECT id, name FROM drivers ORDER BY name)
  LOOP
    -- Semana 16 feb 2026 (esta semana)
    v_week_start := '2026-02-16';
    CASE (idx % 5)
      WHEN 0 THEN v_hours := 45; v_revenue := 8500; v_trips := 92;
      WHEN 1 THEN v_hours := 42; v_revenue := 7200; v_trips := 78;
      WHEN 2 THEN v_hours := 40; v_revenue := 6000; v_trips := 65;
      WHEN 3 THEN v_hours := 35; v_revenue := 5000; v_trips := 54;
      ELSE       v_hours := 38; v_revenue := 4500; v_trips := 48;
    END CASE;

    v_check_in := v_week_start::text || ' 08:00:00-06';
    v_check_out := v_check_in + (v_hours || ' hours')::interval;

    INSERT INTO shifts (driver_id, vehicle_id, supervisor_id, check_in, check_out)
    VALUES (r.id, v_vehicle_id, v_supervisor_id, v_check_in, v_check_out);

    INSERT INTO didi_earnings (driver_id, week_start, total_trips, total_revenue)
    VALUES (r.id, v_week_start, v_trips, v_revenue);

    -- Semana 23 feb 2026 (proxima semana) - rotar perfiles para variedad
    v_week_start := '2026-02-23';
    CASE ((idx + 1) % 5)
      WHEN 0 THEN v_hours := 45; v_revenue := 8200; v_trips := 88;
      WHEN 1 THEN v_hours := 43; v_revenue := 7500; v_trips := 81;
      WHEN 2 THEN v_hours := 41; v_revenue := 6300; v_trips := 68;
      WHEN 3 THEN v_hours := 36; v_revenue := 5200; v_trips := 56;
      ELSE       v_hours := 39; v_revenue := 5800; v_trips := 60;
    END CASE;

    v_check_in := v_week_start::text || ' 08:00:00-06';
    v_check_out := v_check_in + (v_hours || ' hours')::interval;

    INSERT INTO shifts (driver_id, vehicle_id, supervisor_id, check_in, check_out)
    VALUES (r.id, v_vehicle_id, v_supervisor_id, v_check_in, v_check_out);

    INSERT INTO didi_earnings (driver_id, week_start, total_trips, total_revenue)
    VALUES (r.id, v_week_start, v_trips, v_revenue);

    idx := idx + 1;
  END LOOP;
END $$;
