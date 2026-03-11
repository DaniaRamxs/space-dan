-- Tabla para persistir los pixels de Pixel Galaxy
-- Ejecutar esto en el SQL Editor de Supabase

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS pixel_galaxy (
    id SERIAL PRIMARY KEY,
    room_name TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    color TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Clave única para evitar duplicados en la misma posición de la misma sala
    UNIQUE(room_name, x, y)
);

-- Eliminar índices si existen (para evitar errores 42P07) y recrearlos
DROP INDEX IF EXISTS idx_pixel_galaxy_room;
DROP INDEX IF EXISTS idx_pixel_galaxy_user;

-- Crear índices optimizados
CREATE INDEX idx_pixel_galaxy_room ON pixel_galaxy(room_name);
CREATE INDEX idx_pixel_galaxy_user ON pixel_galaxy(user_id);

-- Habilitar RLS (ignora si ya está habilitado)
ALTER TABLE pixel_galaxy ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Allow read access to all" ON pixel_galaxy;
DROP POLICY IF EXISTS "Allow insert to authenticated" ON pixel_galaxy;
DROP POLICY IF EXISTS "Allow update to authenticated" ON pixel_galaxy;
DROP POLICY IF EXISTS "Allow delete to authenticated" ON pixel_galaxy;
DROP POLICY IF EXISTS "Allow all" ON pixel_galaxy;

-- Crear políticas simplificadas
CREATE POLICY "Allow all" 
ON pixel_galaxy FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
