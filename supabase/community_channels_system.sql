-- ============================================
-- COMMUNITY CHANNELS SYSTEM
-- Sistema de canales tipo Discord para comunidades
-- ============================================

-- Tabla: community_channels
-- Almacena los canales de cada comunidad
CREATE TABLE IF NOT EXISTS community_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'voice', 'forum')),
    description TEXT,
    position INTEGER DEFAULT 0,
    parent_id UUID REFERENCES community_channels(id) ON DELETE SET NULL,
    is_private BOOLEAN DEFAULT FALSE,
    allowed_roles UUID[] DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(community_id, slug)
);

-- Tabla: community_roles
-- Roles personalizados para comunidades
CREATE TABLE IF NOT EXISTS community_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#5865F2',
    position INTEGER DEFAULT 0,
    permissions JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: community_member_roles
-- Asignación de roles a miembros
CREATE TABLE IF NOT EXISTS community_member_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES community_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(community_id, user_id, role_id)
);

-- Tabla: forum_posts
-- Posts para canales tipo foro
CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    reactions JSONB DEFAULT '{}',
    views_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: forum_comments
-- Comentarios en posts de foro
CREATE TABLE IF NOT EXISTS forum_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    reactions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actualizar tabla communities para agregar owner_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communities' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE communities ADD COLUMN owner_id UUID REFERENCES profiles(id);
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_channels_community ON community_channels(community_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON community_channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_position ON community_channels(position);
CREATE INDEX IF NOT EXISTS idx_roles_community ON community_roles(community_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_community ON community_member_roles(community_id, user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_channel ON forum_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_community ON forum_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id);

-- Trigger: auto-crear canal general y rol owner al crear comunidad
CREATE OR REPLACE FUNCTION create_default_community_channels()
RETURNS TRIGGER AS $$
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
    END IF;
    
    -- Crear canal de texto general
    INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
    VALUES (NEW.id, 'general', 'general', 'text', 'Chat general de la comunidad', 0, NEW.owner_id);
    
    -- Crear canal de voz general
    INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
    VALUES (NEW.id, 'General', 'general-voice', 'voice', 'Sala de voz general', 1, NEW.owner_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_create_default_channels ON communities;
CREATE TRIGGER trigger_create_default_channels
    AFTER INSERT ON communities
    FOR EACH ROW
    EXECUTE FUNCTION create_default_community_channels();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de updated_at
DROP TRIGGER IF EXISTS update_channels_updated_at ON community_channels;
CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON community_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON community_roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON community_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER update_forum_posts_updated_at
    BEFORE UPDATE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_comments_updated_at ON forum_comments;
CREATE TRIGGER update_forum_comments_updated_at
    BEFORE UPDATE ON forum_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Canales visibles para miembros de la comunidad
CREATE POLICY "Channels visible to community members" ON community_channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = community_channels.community_id 
            AND user_id = auth.uid()
        )
    );

-- Policy: Solo owner puede crear canales
CREATE POLICY "Only owner can create channels" ON community_channels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_channels.community_id 
            AND owner_id = auth.uid()
        )
    );

-- Policy: Solo owner puede modificar/eliminar canales
CREATE POLICY "Only owner can update channels" ON community_channels
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_channels.community_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Only owner can delete channels" ON community_channels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_channels.community_id 
            AND owner_id = auth.uid()
        )
    );

-- Comments for documentation
COMMENT ON TABLE community_channels IS 'Canales de comunidad tipo Discord (texto, voz, foro)';
COMMENT ON TABLE community_roles IS 'Roles personalizados por comunidad';
COMMENT ON TABLE community_member_roles IS 'Asignación de roles a miembros';
COMMENT ON TABLE forum_posts IS 'Posts para canales tipo foro';
COMMENT ON TABLE forum_comments IS 'Comentarios en posts de foro';

