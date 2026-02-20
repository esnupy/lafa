-- Maria Garcia: 49 horas trabajadas la semana del 16 de febrero 2026
-- Ejecutar despues de seed_realistic_payroll_data (timestamp 20260220)
-- hours_worked es columna generada; se actualiza solo check_out

UPDATE shifts
SET check_out = check_in + interval '49 hours'
WHERE driver_id = (SELECT id FROM drivers WHERE employee_id = 'LAFA-MG001' OR name ILIKE 'Maria Garcia' LIMIT 1)
  AND check_in >= '2026-02-16'
  AND check_in < '2026-02-23';
