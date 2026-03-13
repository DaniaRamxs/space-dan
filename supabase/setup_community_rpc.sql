-- ============================================
-- SOLUCIÓN: Función RPC para setupear comunidad existente
-- Cualquier owner puede llamar esta función desde el frontend
-- ============================================

-- Función: setup_community_defaults
-- Crea roles, canales y asigna owner para comunidades antiguas
CREATE OR REPLACE FUNCTION setup_community_defaults(p_community_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del owner de la DB
AS $$
DECLARE
    v_owner_id UUID;
    v_owner_role_id UUID;
    v_member_role_id UUID;
    v_result JSONB;
BEGIN
    -- Verificar que el usuario actual es owner de la comunidad
    SELECT owner_id INTO v_owner_id
    FROM communities
    WHERE id = p_community_id;
    
    IF v_owner_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comunidad no tiene owner asignado');
    END IF;
    
    IF v_owner_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solo el owner puede ejecutar este setup');
    END IF;
    
    -- Crear rol Owner si no existe
    INSERT INTO community_roles (community_id, name, color, position, permissions, is_default)
    VALUES (p_community_id, 'Owner', '#FFD700', 0, 
        '{"manage_channels": true, "manage_roles": true, "manage_community": true, "kick_members": true, "ban_members": true}'::jsonb, 
        false)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_owner_role_id;
    
    IF v_owner_role_id IS NULL THEN
        SELECT id INTO v_owner_role_id 
        FROM community_roles 
        WHERE community_id = p_community_id AND name = 'Owner';
    END IF;
    
    -- Crear rol Member si no existe
    INSERT INTO community_roles (community_id, name, color, position, permissions, is_default)
    VALUES (p_community_id, 'Member', '#5865F2', 1, 
        '{"send_messages": true, "connect_voice": true, "create_posts": true}'::jsonb, 
        true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_member_role_id;
    
    IF v_member_role_id IS NULL THEN
        SELECT id INTO v_member_role_id 
        FROM community_roles 
        WHERE community_id = p_community_id AND name = 'Member';
    END IF;
    
    -- Asignar rol Owner al owner
    INSERT INTO community_member_roles (community_id, user_id, role_id, assigned_by)
    VALUES (p_community_id, v_owner_id, v_owner_role_id, v_owner_id)
    ON CONFLICT DO NOTHING;
    
    -- Asegurar que el owner es miembro
    INSERT INTO community_members (community_id, user_id)
    VALUES (p_community_id, v_owner_id)
    ON CONFLICT DO NOTHING;
    
    -- Crear canal de texto general
    INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
    VALUES (p_community_id, 'general', 'general', 'text', 'Chat general de la comunidad', 0, v_owner_id)
    ON CONFLICT DO NOTHING;
    
    -- Crear canal de voz general
    INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
    VALUES (p_community_id, 'General', 'general-voice', 'voice', 'Sala de voz general', 1, v_owner_id)
    ON CONFLICT DO NOTHING;
    
    v_result := jsonb_build_object(
        'success', true,
        'community_id', p_community_id,
        'owner_role_id', v_owner_role_id,
        'member_role_id', v_member_role_id,
        'channels_created', 2,
        'message', 'Setup completado exitosamente'
    );
    
    RETURN v_result;
END;
$$;

-- Política: Solo usuarios autenticados pueden llamar la función
-- (la función internamente verifica que sea owner)

COMMENT ON FUNCTION setup_community_defaults IS 
'Setupea una comunidad existente creando roles por defecto (Owner, Member) y canales (general, voice).
Solo el owner de la comunidad puede ejecutar esta función.';

-- ============================================
-- VISTA: Ver comunidades que necesitan setup
-- ============================================

CREATE OR REPLACE VIEW communities_needing_setup AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.owner_id,
    p.username as owner_username,
    (SELECT COUNT(*) FROM community_roles WHERE community_id = c.id) as role_count,
    (SELECT COUNT(*) FROM community_channels WHERE community_id = c.id) as channel_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM community_roles WHERE community_id = c.id) = 0 
          OR (SELECT COUNT(*) FROM community_channels WHERE community_id = c.id) = 0 
        THEN true 
        ELSE false 
    END as needs_setup
FROM communities c
LEFT JOIN profiles p ON c.owner_id = p.id
WHERE c.owner_id IS NOT NULL;

-- Ejemplo de uso:
-- SELECT * FROM communities_needing_setup WHERE needs_setup = true;
-- SELECT setup_community_defaults('uuid-de-la-comunidad');

