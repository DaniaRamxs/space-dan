-- ============================================
-- FIX: RLS para community_roles - Permitir crear comunidades
-- ============================================

-- Eliminar políticas existentes que causan problemas
DROP POLICY IF EXISTS "Roles visible to community members" ON community_roles;
DROP POLICY IF EXISTS "Only owner can create roles" ON community_roles;
DROP POLICY IF EXISTS "Only owner can update roles" ON community_roles;
DROP POLICY IF EXISTS "Only owner can delete roles" ON community_roles;

-- Crear nuevas políticas más permisivas

-- 1. SELECT: Cualquier miembro puede ver roles
CREATE POLICY "Roles visible to community members" ON community_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = community_roles.community_id 
            AND user_id = auth.uid()
        )
    );

-- 2. INSERT: El owner puede crear roles, O cualquiera si es trigger (SECURITY DEFINER)
CREATE POLICY "Owner or trigger can create roles" ON community_roles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            -- Es el owner de la comunidad
            EXISTS (
                SELECT 1 FROM communities 
                WHERE id = community_roles.community_id 
                AND owner_id = auth.uid()
            )
            -- O el rol es creado durante la creación de comunidad (temporal)
            OR EXISTS (
                SELECT 1 FROM communities 
                WHERE id = community_roles.community_id
                AND created_at > NOW() - INTERVAL '1 minute'
            )
        )
    );

-- 3. UPDATE: Solo owner
CREATE POLICY "Only owner can update roles" ON community_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_roles.community_id 
            AND owner_id = auth.uid()
        )
    );

-- 4. DELETE: Solo owner
CREATE POLICY "Only owner can delete roles" ON community_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_roles.community_id 
            AND owner_id = auth.uid()
        )
    );

-- ============================================
-- FIX: RLS para community_channels
-- ============================================

DROP POLICY IF EXISTS "Channels visible to community members" ON community_channels;
DROP POLICY IF EXISTS "Only owner can create channels" ON community_channels;
DROP POLICY IF EXISTS "Only owner can update channels" ON community_channels;
DROP POLICY IF EXISTS "Only owner can delete channels" ON community_channels;

-- 1. SELECT
CREATE POLICY "Channels visible to community members" ON community_channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = community_channels.community_id 
            AND user_id = auth.uid()
        )
    );

-- 2. INSERT: Owner o trigger
CREATE POLICY "Owner or trigger can create channels" ON community_channels
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM communities 
                WHERE id = community_channels.community_id 
                AND owner_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM communities 
                WHERE id = community_channels.community_id
                AND created_at > NOW() - INTERVAL '1 minute'
            )
        )
    );

-- 3. UPDATE
CREATE POLICY "Only owner can update channels" ON community_channels
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_channels.community_id 
            AND owner_id = auth.uid()
        )
    );

-- 4. DELETE
CREATE POLICY "Only owner can delete channels" ON community_channels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_channels.community_id 
            AND owner_id = auth.uid()
        )
    );

-- ============================================
-- FIX: RLS para community_member_roles
-- ============================================

DROP POLICY IF EXISTS "Member roles visible to community members" ON community_member_roles;
DROP POLICY IF EXISTS "Only owner can assign roles" ON community_member_roles;

-- 1. SELECT
CREATE POLICY "Member roles visible to community members" ON community_member_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = community_member_roles.community_id 
            AND user_id = auth.uid()
        )
    );

-- 2. INSERT: Owner o trigger
CREATE POLICY "Owner or trigger can assign roles" ON community_member_roles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM communities 
                WHERE id = community_member_roles.community_id 
                AND owner_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM communities 
                WHERE id = community_member_roles.community_id
                AND created_at > NOW() - INTERVAL '1 minute'
            )
        )
    );

-- 3. DELETE
CREATE POLICY "Only owner can remove member roles" ON community_member_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_member_roles.community_id 
            AND owner_id = auth.uid()
        )
    );

