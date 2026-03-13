-- Sistema de Reputación para Spacely
-- Tabla de reputación por comunidad

CREATE TABLE IF NOT EXISTS community_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    level VARCHAR(50) DEFAULT 'Novato',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, community_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_community_reputation_user ON community_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reputation_community ON community_reputation(community_id);
CREATE INDEX IF NOT EXISTS idx_community_reputation_points ON community_reputation(points DESC);

-- Políticas RLS para community_reputation
ALTER TABLE community_reputation ENABLE ROW LEVEL SECURITY;

-- Política para lectura: cualquiera puede ver reputación
CREATE POLICY "Reputation visible to everyone" 
ON community_reputation FOR SELECT 
TO authenticated, anon 
USING (true);

-- Política para actualización: solo el propio usuario
CREATE POLICY "Users can update own reputation" 
ON community_reputation FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- Política para inserción: solo el propio usuario
CREATE POLICY "Users can insert own reputation" 
ON community_reputation FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Tabla de historial de puntos para auditoría
CREATE TABLE IF NOT EXISTS reputation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'message', 'voice', 'activity', 'other'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para historial
CREATE INDEX IF NOT EXISTS idx_reputation_history_user ON reputation_history(user_id, community_id);
CREATE INDEX IF NOT EXISTS idx_reputation_history_created ON reputation_history(created_at DESC);

-- Políticas RLS para reputation_history
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History visible to everyone" 
ON reputation_history FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Users can insert own history" 
ON reputation_history FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Función para calcular nivel basado en puntos
CREATE OR REPLACE FUNCTION calculate_reputation_level(p_points INTEGER)
RETURNS VARCHAR(50) AS $$
BEGIN
    IF p_points < 50 THEN
        RETURN 'Novato';
    ELSIF p_points < 150 THEN
        RETURN 'Explorador';
    ELSIF p_points < 400 THEN
        RETURN 'Veterano';
    ELSE
        RETURN 'Leyenda';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para actualizar reputación automáticamente
CREATE OR REPLACE FUNCTION update_community_reputation(
    p_user_id UUID,
    p_community_id UUID,
    p_points INTEGER,
    p_action_type VARCHAR(50),
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
    v_new_level VARCHAR(50);
    v_result JSONB;
BEGIN
    -- Insertar o actualizar reputación
    INSERT INTO community_reputation (user_id, community_id, points, level)
    VALUES (p_user_id, p_community_id, p_points, calculate_reputation_level(p_points))
    ON CONFLICT (user_id, community_id)
    DO UPDATE SET 
        points = community_reputation.points + p_points,
        level = calculate_reputation_level(community_reputation.points + p_points),
        last_updated = now()
    RETURNING points INTO v_new_points;
    
    -- Registrar en historial
    INSERT INTO reputation_history (user_id, community_id, points_earned, action_type, description)
    VALUES (p_user_id, p_community_id, p_points, p_action_type, p_description);
    
    -- Obtener nivel actual
    SELECT level INTO v_new_level FROM community_reputation 
    WHERE user_id = p_user_id AND community_id = p_community_id;
    
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'community_id', p_community_id,
        'points_added', p_points,
        'total_points', v_new_points,
        'level', v_new_level
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener ranking de reputación de una comunidad
CREATE OR REPLACE FUNCTION get_community_reputation_ranking(p_community_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    points INTEGER,
    level VARCHAR(50),
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.user_id,
        p.username,
        p.avatar_url,
        cr.points,
        cr.level,
        ROW_NUMBER() OVER (ORDER BY cr.points DESC) as rank
    FROM community_reputation cr
    JOIN profiles p ON cr.user_id = p.id
    WHERE cr.community_id = p_community_id
    ORDER BY cr.points DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE community_reputation IS 'Puntos de reputación de usuarios por comunidad';
COMMENT ON TABLE reputation_history IS 'Historial de puntos ganados para auditoría';
