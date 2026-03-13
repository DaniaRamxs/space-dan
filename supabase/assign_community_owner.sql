-- ============================================
-- SQL PARA ASIGNAR OWNER A COMUNIDAD EXISTENTE
-- ============================================

-- Opción 1: Asignar owner usando email del usuario
UPDATE communities 
SET owner_id = (
    SELECT id FROM profiles 
    WHERE email = 'tu-email@ejemplo.com' 
    LIMIT 1
)
WHERE slug = 'nombre-de-tu-comunidad';

-- Opción 2: Asignar owner usando username
UPDATE communities 
SET owner_id = (
    SELECT id FROM profiles 
    WHERE username = 'tu-username' 
    LIMIT 1
)
WHERE slug = 'nombre-de-tu-comunidad';

-- Opción 3: Asignar owner usando el ID directo (reemplaza con tu UUID)
UPDATE communities 
SET owner_id = '00000000-0000-0000-0000-000000000000'::UUID
WHERE slug = 'nombre-de-tu-comunidad';

-- Verificar que se asignó correctamente
SELECT c.id, c.name, c.slug, c.owner_id, p.username as owner_username
FROM communities c
LEFT JOIN profiles p ON c.owner_id = p.id
WHERE c.slug = 'nombre-de-tu-comunidad';

-- Opcional: También asignar el rol de owner en community_member_roles
-- (esto permite que el sistema reconozca los permisos correctamente)
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

