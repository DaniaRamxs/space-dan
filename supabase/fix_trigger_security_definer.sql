-- ============================================
-- SOLUCIÓN DEFINITIVA: Trigger con SECURITY DEFINER
-- ============================================

-- 1. Recrear la función del trigger con SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_default_community_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del owner de la función
SET search_path = public
AS $$
DECLARE
    owner_role_id UUID;
    member_role_id UUID;
BEGIN
    -- Crear rol owner
    INSERT INTO community_roles (community_id, name, color, position, permissions, is_default)
    VALUES (NEW.id, 'Owner', '#FFD700', 0, 
        '{"manage_channels": true, "manage_roles": true, "manage_community": true, "kick_members": true, "ban_members": true}'::jsonb, 
        false)
    RETURNING id INTO owner_role_id;
    
    -- Crear rol member (default)
    INSERT INTO community_roles (community_id, name, color, position, permissions, is_default)
    VALUES (NEW.id, 'Member', '#5865F2', 1, 
        '{"send_messages": true, "connect_voice": true, "create_posts": true}'::jsonb, 
        true)
    RETURNING id INTO member_role_id;
    
    -- Asignar owner si existe owner_id
    IF NEW.owner_id IS NOT NULL THEN
        INSERT INTO community_member_roles (community_id, user_id, role_id, assigned_by)
        VALUES (NEW.id, NEW.owner_id, owner_role_id, NEW.owner_id);
        
        -- Asegurar que el owner sea miembro
        INSERT INTO community_members (community_id, user_id)
        VALUES (NEW.id, NEW.owner_id)
        ON CONFLICT (community_id, user_id) DO NOTHING;
    END IF;
    
    -- Crear canal de texto general
    INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
    VALUES (NEW.id, 'general', 'general', 'text', 'Chat general de la comunidad', 0, NEW.owner_id);
    
    -- Crear canal de voz general
    INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
    VALUES (NEW.id, 'General', 'general-voice', 'voice', 'Sala de voz general', 1, NEW.owner_id);
    
    RETURN NEW;
END;
$$;

-- 2. Recrear el trigger
DROP TRIGGER IF EXISTS trigger_create_default_channels ON communities;
CREATE TRIGGER trigger_create_default_channels
    AFTER INSERT ON communities
    FOR EACH ROW
    EXECUTE FUNCTION create_default_community_channels();

-- 3. Políticas RLS permisivas para INSERT (cualquier usuario autenticado puede insertar durante el trigger)
ALTER TABLE community_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_member_roles DISABLE ROW LEVEL SECURITY;

-- 4. Re-activar RLS con políticas solo para SELECT/UPDATE/DELETE
ALTER TABLE community_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_member_roles ENABLE ROW LEVEL SECURITY;

-- Políticas SELECT (visibles para miembros)
CREATE POLICY IF NOT EXISTS "Roles visible to members" ON community_roles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM community_members WHERE community_id = community_roles.community_id AND user_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Channels visible to members" ON community_channels
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM community_members WHERE community_id = community_channels.community_id AND user_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Member roles visible" ON community_member_roles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM community_members WHERE community_id = community_member_roles.community_id AND user_id = auth.uid())
    );

-- Políticas UPDATE/DELETE (solo owner)
CREATE POLICY IF NOT EXISTS "Only owner can modify roles" ON community_roles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM communities WHERE id = community_roles.community_id AND owner_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Only owner can modify channels" ON community_channels
    FOR ALL USING (
        EXISTS (SELECT 1 FROM communities WHERE id = community_channels.community_id AND owner_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Only owner can modify member roles" ON community_member_roles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM communities WHERE id = community_member_roles.community_id AND owner_id = auth.uid())
    );

