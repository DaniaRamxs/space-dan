-- Sistema de Notificaciones para Spacely
-- Tabla de notificaciones en tiempo real

-- Eliminar funciones existentes para evitar conflictos
DO $$
DECLARE
    func RECORD;
BEGIN
    FOR func IN 
        SELECT proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname IN ('create_notification', 'mark_notifications_read', 'get_user_notifications', 
                          'notify_message_reply', 'notify_voice_activity', 'notify_community_activity', 
                          'cleanup_old_notifications')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I(%s)', func.proname, func.args);
    END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'reply', 'voice_activity', 'community_activity', 'mention', 'system'
    title VARCHAR(200),
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Datos adicionales contextuales
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- URL opcional para navegar al hacer click
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Políticas RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política para lectura: solo el usuario propietario puede ver sus notificaciones
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Política para inserción: servicios pueden crear notificaciones para cualquier usuario
CREATE POLICY "Services can create notifications" 
ON notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política para actualización: solo el propio usuario puede marcar como leída
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- Política para eliminación: solo el propio usuario
CREATE POLICY "Users can delete own notifications" 
ON notifications FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Vista para contar notificaciones no leídas por usuario
CREATE OR REPLACE VIEW user_notification_counts AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE NOT is_read) as unread_count,
    COUNT(*) as total_count
FROM notifications
GROUP BY user_id;

-- Función para crear notificación
DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB, TEXT);
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(200),
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data, action_url)
    VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar notificaciones como leídas
DROP FUNCTION IF EXISTS mark_notifications_read(UUID, UUID[]);
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_notification_ids IS NOT NULL AND array_length(p_notification_ids, 1) > 0 THEN
        -- Marcar específicas
        UPDATE notifications 
        SET is_read = true, read_at = now()
        WHERE user_id = p_user_id 
        AND id = ANY(p_notification_ids)
        AND NOT is_read;
    ELSE
        -- Marcar todas
        UPDATE notifications 
        SET is_read = true, read_at = now()
        WHERE user_id = p_user_id 
        AND NOT is_read;
    END IF;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener notificaciones de un usuario
DROP FUNCTION IF EXISTS get_user_notifications(UUID, INTEGER, INTEGER, BOOLEAN);
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_only_unread BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    data JSONB,
    is_read BOOLEAN,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.action_url,
        n.created_at,
        n.read_at
    FROM notifications n
    WHERE n.user_id = p_user_id
    AND (NOT p_only_unread OR NOT n.is_read)
    ORDER BY n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para notificar respuesta a mensaje
DROP FUNCTION IF EXISTS notify_message_reply(UUID, UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION notify_message_reply(
    p_parent_user_id UUID,
    p_reply_user_id UUID,
    p_community_id UUID,
    p_community_name TEXT,
    p_message_preview TEXT
)
RETURNS UUID AS $$
DECLARE
    v_reply_username TEXT;
    v_notification_id UUID;
BEGIN
    SELECT username INTO v_reply_username FROM profiles WHERE id = p_reply_user_id;
    
    SELECT create_notification(
        p_parent_user_id,
        'reply',
        'Nueva respuesta',
        v_reply_username || ' respondió tu mensaje en ' || p_community_name || ': "' || LEFT(p_message_preview, 50) || '"',
        jsonb_build_object(
            'reply_user_id', p_reply_user_id,
            'reply_username', v_reply_username,
            'community_id', p_community_id,
            'community_name', p_community_name,
            'message_preview', p_message_preview
        ),
        '/community/' || p_community_id
    ) INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para notificar actividad de voz
DROP FUNCTION IF EXISTS notify_voice_activity(UUID, UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION notify_voice_activity(
    p_user_id UUID,
    p_actor_user_id UUID,
    p_community_id UUID,
    p_community_name TEXT,
    p_room_name TEXT DEFAULT 'Sala de voz'
)
RETURNS UUID AS $$
DECLARE
    v_actor_username TEXT;
    v_notification_id UUID;
BEGIN
    SELECT username INTO v_actor_username FROM profiles WHERE id = p_actor_user_id;
    
    SELECT create_notification(
        p_user_id,
        'voice_activity',
        'Sala de voz iniciada',
        v_actor_username || ' inició ' || p_room_name || ' en ' || p_community_name,
        jsonb_build_object(
            'actor_user_id', p_actor_user_id,
            'actor_username', v_actor_username,
            'community_id', p_community_id,
            'community_name', p_community_name,
            'room_name', p_room_name
        ),
        '/chat?voice=community-' || p_community_id
    ) INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para notificar actividad en comunidad
DROP FUNCTION IF EXISTS notify_community_activity(UUID, UUID, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION notify_community_activity(
    p_user_id UUID,
    p_community_id UUID,
    p_community_name TEXT,
    p_activity_type TEXT,
    p_activity_name TEXT
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    SELECT create_notification(
        p_user_id,
        'community_activity',
        'Nueva actividad',
        'Nueva ' || p_activity_type || ' "' || p_activity_name || '" en ' || p_community_name,
        jsonb_build_object(
            'community_id', p_community_id,
            'community_name', p_community_name,
            'activity_type', p_activity_type,
            'activity_name', p_activity_name
        ),
        '/community/' || p_community_id
    ) INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para limpiar notificaciones antiguas (más de 30 días)
DROP FUNCTION IF EXISTS cleanup_old_notifications();
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE created_at < now() - interval '30 days' 
    AND is_read = true;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE notifications IS 'Sistema de notificaciones en tiempo real para usuarios';
COMMENT ON FUNCTION create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB, TEXT) IS 'Crea una nueva notificación para un usuario';
COMMENT ON FUNCTION mark_notifications_read(UUID, UUID[]) IS 'Marca notificaciones como leídas';
