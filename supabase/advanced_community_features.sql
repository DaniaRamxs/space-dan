-- ============================================
-- SISTEMA COMPLETO: Categorías, Permisos, Invitaciones, Logs, NSFW, Threads, Pins, Slowmode, Emojis
-- ============================================

-- ============================================
-- 1. CATEGORÍAS DE CANALES
-- ============================================

ALTER TABLE community_channels 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES community_channels(id) ON DELETE SET NULL;

-- Tabla de categorías (canales tipo 'category' que actúan como contenedores)
-- Ya existe en community_channels con type='category'

-- ============================================
-- 2. PERMISOS POR ROL Y CANAL
-- ============================================

-- Tabla: Permisos específicos por canal y rol
CREATE TABLE IF NOT EXISTS channel_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES community_roles(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL, -- 'send_messages', 'connect_voice', 'create_posts', 'manage_channel', 'view_channel'
    allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, role_id, permission_type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_channel_permissions_channel ON channel_permissions(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_permissions_role ON channel_permissions(role_id);

-- ============================================
-- 3. INVITACIONES CON EXPIRACIÓN
-- ============================================

CREATE TABLE IF NOT EXISTS community_invites (
    code VARCHAR(16) PRIMARY KEY DEFAULT substr(md5(random()::text), 1, 8),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    max_uses INTEGER DEFAULT NULL, -- NULL = ilimitado
    uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL = nunca expira
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_community ON community_invites(community_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON community_invites(code);

-- Función: Validar invitación
CREATE OR REPLACE FUNCTION validate_community_invite(p_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_invite 
    FROM community_invites 
    WHERE code = p_code;
    
    IF v_invite IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invitación no encontrada');
    END IF;
    
    IF NOT v_invite.is_active THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invitación desactivada');
    END IF;
    
    IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invitación expirada');
    END IF;
    
    IF v_invite.max_uses IS NOT NULL AND v_invite.uses >= v_invite.max_uses THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invitación agotada');
    END IF;
    
    RETURN jsonb_build_object(
        'valid', true, 
        'community_id', v_invite.community_id,
        'code', v_invite.code
    );
END;
$$;

-- ============================================
-- 4. LOGS DE AUDITORÍA
-- ============================================

CREATE TABLE IF NOT EXISTS community_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(50) NOT NULL, -- 'channel_created', 'channel_deleted', 'channel_updated', 'role_assigned', 'member_joined', 'member_left', 'message_deleted'
    target_type VARCHAR(50), -- 'channel', 'role', 'member', 'message'
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_community ON community_audit_logs(community_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON community_audit_logs(created_at);

-- Trigger: Auto-log al crear canal
CREATE OR REPLACE FUNCTION log_channel_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO community_audit_logs (community_id, user_id, action, target_type, target_id, details)
    VALUES (NEW.community_id, NEW.created_by, 'channel_created', 'channel', NEW.id, 
        jsonb_build_object('name', NEW.name, 'type', NEW.type));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_channel_creation ON community_channels;
CREATE TRIGGER trigger_log_channel_creation
    AFTER INSERT ON community_channels
    FOR EACH ROW
    EXECUTE FUNCTION log_channel_creation();

-- Trigger: Auto-log al eliminar canal
CREATE OR REPLACE FUNCTION log_channel_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO community_audit_logs (community_id, user_id, action, target_type, target_id, details)
    VALUES (OLD.community_id, auth.uid(), 'channel_deleted', 'channel', OLD.id,
        jsonb_build_object('name', OLD.name, 'type', OLD.type));
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_channel_deletion ON community_channels;
CREATE TRIGGER trigger_log_channel_deletion
    BEFORE DELETE ON community_channels
    FOR EACH ROW
    EXECUTE FUNCTION log_channel_deletion();

-- ============================================
-- 5. CANALES NSFW/AGE-RESTRICTED
-- ============================================

ALTER TABLE community_channels 
ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT false;

ALTER TABLE community_channels 
ADD COLUMN IF NOT EXISTS min_age INTEGER DEFAULT 0; -- 0 = sin restricción, 18 = +18

ALTER TABLE communities
ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT false; -- Comunidad completa NSFW

-- ============================================
-- 6. THREADS (SUB-CANALES TEMPORALES)
-- ============================================

CREATE TABLE IF NOT EXISTS channel_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id),
    title VARCHAR(255) NOT NULL,
    message_id UUID, -- Mensaje que inició el thread
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMPTZ,
    auto_archive_duration INTEGER DEFAULT 1440, -- minutos (24h default)
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_channel ON channel_threads(channel_id);
CREATE INDEX IF NOT EXISTS idx_threads_archived ON channel_threads(is_archived, last_message_at);

-- Tabla: Mensajes en threads
CREATE TABLE IF NOT EXISTS thread_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES channel_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread ON thread_messages(thread_id);

-- Función: Auto-archivar threads inactivos
CREATE OR REPLACE FUNCTION archive_inactive_threads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE channel_threads
    SET is_archived = true, archived_at = NOW()
    WHERE is_archived = false
    AND last_message_at < NOW() - (auto_archive_duration || ' minutes')::INTERVAL;
END;
$$;

-- ============================================
-- 7. MENSAJES FIJADOS (PINS)
-- ============================================

CREATE TABLE IF NOT EXISTS pinned_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
    message_id UUID NOT NULL, -- ID del mensaje en channel_messages
    pinned_by UUID REFERENCES profiles(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_pinned_channel ON pinned_messages(channel_id);

-- ============================================
-- 8. SLOWMODE (RATE LIMITING)
-- ============================================

ALTER TABLE community_channels 
ADD COLUMN IF NOT EXISTS slowmode_delay INTEGER DEFAULT 0; -- segundos entre mensajes, 0 = desactivado

-- Tabla: Últimos mensajes por usuario para rate limiting
CREATE TABLE IF NOT EXISTS user_message_rate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_rate_channel ON user_message_rate(channel_id);

-- Función: Verificar rate limit
CREATE OR REPLACE FUNCTION check_slowmode(p_channel_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delay INTEGER;
    v_last_message TIMESTAMPTZ;
    v_remaining_seconds INTEGER;
BEGIN
    -- Obtener slowmode del canal
    SELECT slowmode_delay INTO v_delay 
    FROM community_channels WHERE id = p_channel_id;
    
    IF v_delay IS NULL OR v_delay = 0 THEN
        RETURN jsonb_build_object('allowed', true);
    END IF;
    
    -- Obtener último mensaje del usuario
    SELECT last_message_at INTO v_last_message
    FROM user_message_rate
    WHERE channel_id = p_channel_id AND user_id = p_user_id;
    
    IF v_last_message IS NULL THEN
        RETURN jsonb_build_object('allowed', true);
    END IF;
    
    v_remaining_seconds := v_delay - EXTRACT(EPOCH FROM (NOW() - v_last_message))::INTEGER;
    
    IF v_remaining_seconds > 0 THEN
        RETURN jsonb_build_object('allowed', false, 'retry_after', v_remaining_seconds);
    END IF;
    
    RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ============================================
-- 9. EMOJIS PERSONALIZADOS
-- ============================================

CREATE TABLE IF NOT EXISTS community_emojis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL, -- :nombre:
    image_url TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, name)
);

CREATE INDEX IF NOT EXISTS idx_emojis_community ON community_emojis(community_id);

-- Trigger: Actualizar last_message_at en threads
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE channel_threads
    SET last_message_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_thread_message ON thread_messages;
CREATE TRIGGER trigger_update_thread_message
    AFTER INSERT ON thread_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_last_message();

-- RLS Policies para las nuevas tablas

ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_emojis ENABLE ROW LEVEL SECURITY;

-- Invites: visible para owner, usar para todos
CREATE POLICY "Invites visible to owner" ON community_invites
    FOR ALL USING (EXISTS (SELECT 1 FROM communities WHERE id = community_invites.community_id AND owner_id = auth.uid()));

-- Audit logs: visible para miembros
CREATE POLICY "Audit visible to members" ON community_audit_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM community_members WHERE community_id = community_audit_logs.community_id AND user_id = auth.uid()));

-- Channel permissions: visible para miembros
CREATE POLICY "Permissions visible to members" ON channel_permissions
    FOR SELECT USING (EXISTS (SELECT 1 FROM community_members WHERE community_id = (SELECT community_id FROM community_channels WHERE id = channel_permissions.channel_id) AND user_id = auth.uid()));

-- Threads: visible para miembros
CREATE POLICY "Threads visible to members" ON channel_threads
    FOR SELECT USING (EXISTS (SELECT 1 FROM community_members WHERE community_id = channel_threads.community_id AND user_id = auth.uid()));

CREATE POLICY "Threads insert for members" ON channel_threads
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM community_members WHERE community_id = channel_threads.community_id AND user_id = auth.uid()));

-- Thread messages: estándar
CREATE POLICY "Thread messages visible" ON thread_messages
    FOR SELECT USING (true);

CREATE POLICY "Thread messages insert" ON thread_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pinned messages: visible para todos
CREATE POLICY "Pinned visible" ON pinned_messages
    FOR SELECT USING (true);

CREATE POLICY "Pinned managed by owner" ON pinned_messages
    FOR ALL USING (EXISTS (SELECT 1 FROM community_channels ch JOIN communities c ON ch.community_id = c.id WHERE ch.id = pinned_messages.channel_id AND c.owner_id = auth.uid()));

-- Emojis: visible para todos, manage por owner
CREATE POLICY "Emojis visible" ON community_emojis
    FOR SELECT USING (true);

CREATE POLICY "Emojis managed by owner" ON community_emojis
    FOR ALL USING (EXISTS (SELECT 1 FROM communities WHERE id = community_emojis.community_id AND owner_id = auth.uid()));

