-- ============================================================
-- fix_balance_trigger.sql
-- Elimina el trigger que bloquea balance con
-- "Balance no modificable manualmente".
--
-- PROBLEMA: Un trigger BEFORE UPDATE en profiles lanza
-- RAISE EXCEPTION cuando detecta un cambio en la columna
-- `balance`. Esto bloquea incluso las funciones SECURITY
-- DEFINER (award_coins, claim_daily_bonus, etc.) porque los
-- triggers SIEMPRE se ejecutan, sin importar el contexto.
--
-- SOLUCIÓN: Buscar y eliminar el trigger. La seguridad ya
-- la proveen las funciones SECURITY DEFINER con validación
-- de auth.uid(), cooldowns, daily caps y ledger de auditoría.
-- ============================================================

-- ── PASO 1: Diagnóstico ─────────────────────────────────────
-- Ejecuta esto primero para ver todos los triggers en profiles.
-- El resultado te mostrará el nombre del trigger problemático.

SELECT
  t.trigger_name,
  t.event_manipulation,
  t.action_timing,
  t.action_orientation,
  p.proname  AS function_name,
  LEFT(p.prosrc, 200) AS function_preview
FROM information_schema.triggers t
JOIN pg_proc p
  ON p.oid = (
    SELECT oid FROM pg_proc
    WHERE proname = regexp_replace(t.action_statement, 'EXECUTE (PROCEDURE|FUNCTION) ', '', 'i')
    LIMIT 1
  )
WHERE t.event_object_table = 'profiles'
  AND t.event_object_schema = 'public'
ORDER BY t.trigger_name;


-- ── PASO 2: Eliminar el trigger por contenido de función ────
-- Este bloque busca funciones de trigger en profiles cuyo
-- cuerpo contiene "modificable" y elimina el trigger asociado.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT
      t.trigger_name,
      t.event_object_schema AS tbl_schema,
      t.event_object_table  AS tbl_name,
      p.proname             AS func_name
    FROM information_schema.triggers t
    JOIN pg_trigger pt
      ON pt.tgname = t.trigger_name
    JOIN pg_class pc
      ON pc.oid = pt.tgrelid
    JOIN pg_proc p
      ON p.oid = pt.tgfoid
    WHERE t.event_object_table = 'profiles'
      AND t.event_object_schema = 'public'
      AND (
        p.prosrc ILIKE '%modificable%'
        OR p.prosrc ILIKE '%no modificable%'
        OR (p.prosrc ILIKE '%balance%' AND p.prosrc ILIKE '%RAISE EXCEPTION%')
      )
  LOOP
    RAISE NOTICE 'Eliminando trigger "%" (función: %)', r.trigger_name, r.func_name;

    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      r.trigger_name, r.tbl_schema, r.tbl_name
    );

    -- Opcional: eliminar la función también si ya no sirve para nada más
    EXECUTE format('DROP FUNCTION IF EXISTS %I() CASCADE', r.func_name);
  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE 'No se encontró ningún trigger con esa firma. Revisa el Paso 1 para identificarlo manualmente.';
  END IF;
END;
$$;


-- ── PASO 3: Verificar que los RPCs funcionan ────────────────
-- Después de correr el script, prueba en el SQL editor:

-- SELECT public.claim_daily_bonus('<tu-user-uuid>');
-- SELECT public.award_coins('<tu-user-uuid>', 10, 'game_reward');
