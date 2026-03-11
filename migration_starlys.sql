-- ============================================================
-- space-dan :: Migración a Starlys
-- ============================================================
-- Este script realiza safely el rename de las columnas existentes
-- relacionadas a dancoins en caso de ya existir para no perder datos.

DO $$
BEGIN
    -- 1) Renombrar 'dancoins_earned' a 'starlys_earned' dentro de la tabla cabin_stats
    IF EXISTS(
        SELECT *
        FROM information_schema.columns
        WHERE table_name='cabin_stats' AND column_name='dancoins_earned'
    ) THEN
        ALTER TABLE public.cabin_stats RENAME COLUMN dancoins_earned TO starlys_earned;
        RAISE NOTICE '¡Columna dancoins_earned renombrada a starlys_earned en cabin_stats!';
    ELSE
        RAISE NOTICE 'La columna dancoins_earned no existe en cabin_stats (puede que ya se haya migrado).';
    END IF;
END $$;

-- NOTA IMPORTANTE PARA EL USER:
-- Todo la moneda principal del usuario SIEMPRE ESTUVO guardada 
-- en la columna llamada `balance` en la tabla `profiles`.
-- Por lo tanto, ¡los balances de los usuarios están completamente a salvo
-- y NO necesitan ser migrados ni tocados! 

-- Para actualizar los mensajes de error/lógica de las funciones actuales
-- recuerda pegar y correr nuevamente los archivos modificados:
-- 1. supabase/economy.sql
-- 2. supabase/cabin_productivity.sql
