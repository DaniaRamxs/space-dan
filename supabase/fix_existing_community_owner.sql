-- ============================================
-- FIX: Asignar owner a comunidad existente sin roles/canales
-- ============================================

-- Paso 1: Verificar roles existentes en la comunidad
SELECT * FROM community_roles WHERE community_id = (
    SELECT id FROM communities WHERE slug = 'nombre-de-tu-comunidad'
);

-- Paso 2: Crear roles si no existen (para comunidades creadas antes del trigger)
INSERT INTO community_roles (community_id, name, color, position, permissions, is_default)
SELECT 
    c.id,
    'Owner',
    '#FFD700',
    0,
    '{"manage_channels": true, "manage_roles": true, "manage_community": true, "kick_members": true, "ban_members": true}'::jsonb,
    false
FROM communities c
WHERE c.slug = 'nombre-de-tu-comunidad'
AND NOT EXISTS (
    SELECT 1 FROM community_roles r WHERE r.community_id = c.id AND r.name = 'Owner'
);

INSERT INTO community_roles (community_id, name, color, position, permissions, is_default)
SELECT 
    c.id,
    'Member',
    '#5865F2',
    1,
    '{"send_messages": true, "connect_voice": true, "create_posts": true}'::jsonb,
    true
FROM communities c
WHERE c.slug = 'nombre-de-tu-comunidad'
AND NOT EXISTS (
    SELECT 1 FROM community_roles r WHERE r.community_id = c.id AND r.name = 'Member'
);

-- Paso 3: Asignar owner_id si no está asignado
UPDATE communities 
SET owner_id = (
    SELECT id FROM profiles WHERE username = 'tu-username' LIMIT 1
)
WHERE slug = 'nombre-de-tu-comunidad'
AND owner_id IS NULL;

-- Paso 4: Asignar rol Owner al usuario
INSERT INTO community_member_roles (community_id, user_id, role_id, assigned_by)
SELECT 
    c.id,
    c.owner_id,
    r.id,
    c.owner_id
FROM communities c
JOIN community_roles r ON r.community_id = c.id AND r.name = 'Owner'
WHERE c.slug = 'nombre-de-tu-comunidad'
ON CONFLICT (community_id, user_id, role_id) DO NOTHING;

-- Paso 5: Crear canales por defecto si no existen
INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
SELECT 
    c.id,
    'general',
    'general',
    'text',
    'Chat general de la comunidad',
    0,
    c.owner_id
FROM communities c
WHERE c.slug = 'nombre-de-tu-comunidad'
AND NOT EXISTS (
    SELECT 1 FROM community_channels ch 
    WHERE ch.community_id = c.id AND ch.slug = 'general' AND ch.type = 'text'
);

INSERT INTO community_channels (community_id, name, slug, type, description, position, created_by)
SELECT 
    c.id,
    'General',
    'general-voice',
    'voice',
    'Sala de voz general',
    1,
    c.owner_id
FROM communities c
WHERE c.slug = 'nombre-de-tu-comunidad'
AND NOT EXISTS (
    SELECT 1 FROM community_channels ch 
    WHERE ch.community_id = c.id AND ch.slug = 'general-voice' AND ch.type = 'voice'
);

-- Paso 6: Verificar todo quedó correcto
SELECT 
    c.id,
    c.name,
    c.slug,
    c.owner_id,
    p.username as owner_username,
    (SELECT COUNT(*) FROM community_roles WHERE community_id = c.id) as roles_count,
    (SELECT COUNT(*) FROM community_channels WHERE community_id = c.id) as channels_count,
    (SELECT COUNT(*) FROM community_member_roles WHERE community_id = c.id AND user_id = c.owner_id) as owner_roles_assigned
FROM communities c
LEFT JOIN profiles p ON c.owner_id = p.id
WHERE c.slug = 'nombre-de-tu-comunidad';

