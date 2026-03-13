-- ============================================
-- SQL PARA BORRAR UNA COMUNIDAD COMPLETAMENTE
-- ============================================

-- Reemplaza 'nombre-de-la-comunidad' con el slug de la comunidad a borrar

-- Paso 1: Obtener el ID de la comunidad (para usar en los siguientes pasos)
 SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad';

-- Paso 2: Borrar comentarios de foro
DELETE FROM forum_comments 
WHERE post_id IN (
    SELECT id FROM forum_posts 
    WHERE community_id = (SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad')
);

-- Paso 3: Borrar posts de foro
DELETE FROM forum_posts 
WHERE community_id = (SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad');

-- Paso 4: Borrar mensajes de canales
DELETE FROM channel_messages 
WHERE channel_id IN (
    SELECT id FROM community_channels 
    WHERE community_id = (SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad')
);

-- Paso 5: Borrar canales
DELETE FROM community_channels 
WHERE community_id = (SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad');

-- Paso 6: Borrar roles de miembros
DELETE FROM community_member_roles 
WHERE community_id = (SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad');

-- Paso 7: Borrar roles de la comunidad
DELETE FROM community_roles 
WHERE community_id = (SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad');

-- Paso 8: Borrar membresías
DELETE FROM community_members 
WHERE community_id = (SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad');

-- Paso 9: Borrar mensajes del chat global de la comunidad
DELETE FROM global_chat 
WHERE channel_id LIKE 'community-' || (SELECT id FROM communities WHERE slug = 'nombre-de-la-comunidad') || '%';

-- Paso 10: Finalmente borrar la comunidad
DELETE FROM communities 
WHERE slug = 'nombre-de-la-comunidad';

-- ============================================
-- OPCIÓN SIMPLE: Todo en una sola transacción
-- ============================================

DO $$
DECLARE
    v_community_id UUID;
BEGIN
    -- Obtener ID
    SELECT id INTO v_community_id 
    FROM communities 
    WHERE slug = 'nombre-de-la-comunidad';
    
    IF v_community_id IS NULL THEN
        RAISE EXCEPTION 'Comunidad no encontrada';
    END IF;
    
    -- Borrar en orden correcto
    DELETE FROM forum_comments WHERE post_id IN (SELECT id FROM forum_posts WHERE community_id = v_community_id);
    DELETE FROM forum_posts WHERE community_id = v_community_id;
    DELETE FROM channel_messages WHERE channel_id IN (SELECT id FROM community_channels WHERE community_id = v_community_id);
    DELETE FROM community_channels WHERE community_id = v_community_id;
    DELETE FROM community_member_roles WHERE community_id = v_community_id;
    DELETE FROM community_roles WHERE community_id = v_community_id;
    DELETE FROM community_members WHERE community_id = v_community_id;
    DELETE FROM communities WHERE id = v_community_id;
    
    RAISE NOTICE 'Comunidad % borrada exitosamente', v_community_id;
END $$;

-- ============================================
-- LISTAR TODAS LAS COMUNIDADES CON INFO
-- ============================================

SELECT 
    c.id,
    c.name,
    c.slug,
    c.owner_id,
    p.username as owner_username,
    c.member_count,
    c.created_at,
    (SELECT COUNT(*) FROM community_channels WHERE community_id = c.id) as channels,
    (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members
FROM communities c
LEFT JOIN profiles p ON c.owner_id = p.id
ORDER BY c.created_at DESC;

