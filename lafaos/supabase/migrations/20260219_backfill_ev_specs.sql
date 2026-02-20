-- Rellena autonomy_km y specs para vehiculos electricos existentes sin datos
-- Identifica EVs por modelo (GAC AION ES, Geely EX2, JAC E30X)
UPDATE vehicles
SET
  autonomy_km = CASE
    WHEN model ILIKE 'GAC AION ES%' THEN 440
    WHEN model ILIKE 'Geely EX2%' THEN 410
    WHEN model ILIKE 'JAC E30X%' THEN 400
    ELSE autonomy_km
  END,
  fast_charge = CASE
    WHEN model ILIKE 'GAC AION ES%' THEN '20-80% 30 min'
    WHEN model ILIKE 'Geely EX2%' THEN '10-80% 28 min'
    WHEN model ILIKE 'JAC E30X%' THEN '20-80% 30 min'
    ELSE fast_charge
  END,
  battery_warranty_km = CASE
    WHEN model ILIKE 'GAC AION ES%' OR model ILIKE 'Geely EX2%' OR model ILIKE 'JAC E30X%' THEN 400000
    ELSE battery_warranty_km
  END,
  didi_category = CASE
    WHEN model ILIKE 'GAC AION ES%' THEN 'DiDi Premier'
    WHEN model ILIKE 'Geely EX2%' OR model ILIKE 'JAC E30X%' THEN 'DiDi Comfort'
    ELSE didi_category
  END
WHERE
  (model ILIKE 'GAC AION ES%' OR model ILIKE 'Geely EX2%' OR model ILIKE 'JAC E30X%')
  AND autonomy_km IS NULL;
