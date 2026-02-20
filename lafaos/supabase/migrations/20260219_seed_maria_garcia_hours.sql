-- Agrega Maria Garcia como chofer y turnos para validar reglas de payroll:
-- Semana pasada (lunes 9 feb): 45 horas
-- Esta semana (lunes 16 feb): 20 horas

-- 1. Insertar Maria Garcia como chofer si no existe
INSERT INTO drivers (name, employee_id)
SELECT 'Maria Garcia', 'LAFA-MG001'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE employee_id = 'LAFA-MG001' OR name ILIKE 'Maria Garcia');

-- 2. Insertar turnos para Maria Garcia
DO $$
DECLARE
  v_driver_id uuid;
  v_vehicle_id uuid;
  v_supervisor_id uuid;
BEGIN
  SELECT id INTO v_driver_id FROM drivers WHERE employee_id = 'LAFA-MG001' OR name ILIKE 'Maria Garcia' LIMIT 1;
  SELECT id INTO v_vehicle_id FROM vehicles LIMIT 1;
  SELECT id INTO v_supervisor_id FROM profiles WHERE role IN ('admin', 'supervisor') LIMIT 1;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el chofer Maria Garcia';
  END IF;
  IF v_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'No hay vehiculos en la flotilla';
  END IF;
  IF v_supervisor_id IS NULL THEN
    RAISE EXCEPTION 'No hay supervisor/admin en profiles';
  END IF;

  -- Semana pasada (9 feb 2026): 45 horas (check_in a check_out = 45h)
  INSERT INTO shifts (driver_id, vehicle_id, supervisor_id, check_in, check_out)
  VALUES (
    v_driver_id,
    v_vehicle_id,
    v_supervisor_id,
    '2026-02-09T14:00:00.000Z',
    '2026-02-11T11:00:00.000Z'
  );

  -- Esta semana (16 feb 2026): 20 horas
  INSERT INTO shifts (driver_id, vehicle_id, supervisor_id, check_in, check_out)
  VALUES (
    v_driver_id,
    v_vehicle_id,
    v_supervisor_id,
    '2026-02-16T14:00:00.000Z',
    '2026-02-17T10:00:00.000Z'
  );
END $$;
