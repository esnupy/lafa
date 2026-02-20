-- =============================================================================
-- Fix RLS policies for didi_trips y didi_earnings
-- Ejecuta este script en Supabase: SQL Editor
-- =============================================================================
-- Usa get_user_role() para evitar RLS circular con profiles.
-- Si get_user_role no existe, se crea.
-- =============================================================================

-- Crear get_user_role si no existe (SECURITY DEFINER evita bloqueo por RLS en profiles)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Permitir que usuarios autenticados ejecuten la función
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Opcional: ver políticas actuales antes de modificar
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies WHERE tablename IN ('didi_trips', 'didi_earnings');

-- didi_trips: eliminar TODAS las políticas existentes (Supabase puede usar nombres distintos)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'didi_trips') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON didi_trips', r.policyname);
  END LOOP;
END $$;

-- didi_trips: políticas usando get_user_role() (evita RLS circular con profiles)
CREATE POLICY "didi_trips_insert_policy" ON didi_trips
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "didi_trips_select_policy" ON didi_trips
  FOR SELECT
  USING (get_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "didi_trips_update_policy" ON didi_trips
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'supervisor'))
  WITH CHECK (get_user_role() IN ('admin', 'supervisor'));

-- didi_earnings: eliminar TODAS las políticas existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'didi_earnings') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON didi_earnings', r.policyname);
  END LOOP;
END $$;

-- didi_earnings: políticas usando get_user_role()
CREATE POLICY "didi_earnings_insert_policy" ON didi_earnings
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "didi_earnings_select_policy" ON didi_earnings
  FOR SELECT
  USING (get_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "didi_earnings_update_policy" ON didi_earnings
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'supervisor'))
  WITH CHECK (get_user_role() IN ('admin', 'supervisor'));
