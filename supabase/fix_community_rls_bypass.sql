-- ============================================
-- FIX: RLS Error al crear roles/canales en comunidad existente
-- Ejecuta este SQL completo en Supabase
-- ============================================

-- Reemplaza estos valores:
-- 'TU-COMUNIDAD' = slug de la comunidad
-- 'TU-USERNAME' = tu nombre de usuario

-- ============================================
-- PASO 1: Desactivar RLS temporalmente para arreglar la comunidad
-- ============================================

-- Desactivar RLS en tablas relacionadas (temporalmente)
ALTER TABLE community_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_member_roles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 2: Obtener IDs
-- ============================================
DO $$
DECLARE
    v_community_id UUID;
    v_user_id UUID;
    v_owner_role_id UUID;
    v_member_role_id UUID;
BEGIN
    -- Obtener ID de la comunidad
    SELECT id INTO v_community_id 
    FROM communities 
    WHERE slug = 'TU-COMUNIDAD';
    
    IF v_community_id IS NULL THEN
        RAISE EXCEPTION 'Comunidad no encontrada';
    END IF;
    
    -- Obtener ID del usuario por username
    SELECT id INTO v_user_id 
    FROM profiles 
    WHERE username = 'TU-USERNAME';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    
    RAISE NOTICE 'Comunidad ID: %, Usuario ID: %', v_community_id, v_user_id;
    
    -- Asignar owner a la comunidad
    UPDATE communities 
    SET owner_id = v_user_id 
    WHERE id = v_community_id;
    
    -- Crear rol Owner si no existe
    INSERT INTO community_roles (community_id, name, color, position, permissions, is_default)
    VALUES (v_community_id, 'Owner', '#FFD700', 0, 
        '{"manage_channels": true, "manage_roles": true, "manage_community": true, "kick_members": true, "ban_members": true}'::jsonb, 
        false)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_owner_role_id;
    
    -- Si ya existía, obtener su ID
    IF v_owner_role_id IS NULL THEN
        SELECT id INTO v_owner_role_id 
        FROM community_roles 
        WHERE community_id = v_community_id AND name = 'Owner';
    END IF;
    
    -- Crear rol Member si no existe
    INSERT INTO community_roles (community_id, name, color, position, permissions, is_default)
    VALUES (v_community_id, 'Member', '#5865F2', 1, 
        '{"send_messages": true, "connect_voice": true, "create_posts": true}'::jsonb, 
        true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_member_role_id;
    
    -- Si ya existía, obtener su ID
    IF v_member_role_id IS NULL THEN
        SELECT id INTO v_member_role_id 
        FROM community_roles 
        WHERE community_id = v_community_id AND name = 'Member';
    END IF;
    
    -- Asignar rol Owner al usuario
    INSERT INTO community_member_roles (community_id, user_id, role_id, assigned_by)
    VALUES (v_community_id, v_user_id, v_owner_role_id, v_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Agregar como miembro si no lo es
    INSERT INTO community_members (community_id, user_id)
    VALUES (v_community_id, v_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Crear canal de texto general
    INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
    VALUES (v_community_id, 'general', 'general', 'text', 'Chat general de la comunidad', 0, v_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Crear canal de voz general
    INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
    VALUES (v_community_id, 'General', 'general-voice', 'voice', 'Sala de voz general', 1, v_user_id)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Setup completado para comunidad: %', v_community_id;
END $$;

-- ============================================
-- PASO 3: Reactivar RLS
-- ============================================

ALTER TABLE community_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_member_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 
    c.id,
    c.name,
    c.slug,
    c.owner_id,
    p.username as owner_username,
    (SELECT COUNT(*) FROM community_roles WHERE community_id = c.id) as roles_count,
    (SELECT COUNT(*) FROM community_channels WHERE community_id = c.id) as channels_count
FROM communities c
LEFT JOIN profiles p ON c.owner_id = p.id
WHERE c.slug = 'TU-COMUNIDAD';

-- Ver roles creados
SELECT * FROM community_roles 
WHERE community_id = (SELECT id FROM communities WHERE slug = 'TU-COMUNIDAD');

-- Ver canales creados
SELECT * FROM community_channels 
WHERE community_id = (SELECT id FROM communities WHERE slug = 'TU-COMUNIDAD');

