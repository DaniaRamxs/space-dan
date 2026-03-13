-- ============================================
-- AUTO-CLEANUP: Borrar actividades expiradas
-- ============================================

-- Función: Borrar actividades inactivas/expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_activities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Borrar actividades que terminaron hace más de 1 hora
    DELETE FROM live_activities
    WHERE status = 'ended'
       OR (ended_at IS NOT NULL AND ended_at < NOW() - INTERVAL '1 hour')
       OR (created_at < NOW() - INTERVAL '24 hours' AND participant_count = 0);
    
    -- Borrar actividades sin participantes desde hace 30 minutos
    DELETE FROM live_activities
    WHERE participant_count = 0
      AND created_at < NOW() - INTERVAL '30 minutes'
      AND status != 'active';
END;
$$;

-- Crear extensión pg_cron si no existe (para schedules)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: Limpiar cada 10 minutos (requiere pg_cron)
-- SELECT cron.schedule('cleanup-activities', '*/10 * * * *', 'SELECT cleanup_expired_activities()');

-- ============================================
-- TRIGGER: Auto-limpiar al consultar trending
-- ============================================

CREATE OR REPLACE FUNCTION get_trending_activities_cleaned(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    participant_count INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Primero limpiar
    PERFORM cleanup_expired_activities();
    
    -- Luego retornar resultados
    RETURN QUERY
    SELECT 
        la.id,
        la.type,
        la.title,
        la.description,
        la.status,
        la.participant_count,
        la.created_at
    FROM live_activities la
    WHERE la.status = 'active'
    ORDER BY la.participant_count DESC, la.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_trending_activities_cleaned IS 
'Retorna actividades en tendencia, limpiando primero las expiradas';

