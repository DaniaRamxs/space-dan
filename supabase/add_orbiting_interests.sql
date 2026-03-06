-- ============================================================
-- Migración: Agregar columna `interests` a perfiles
-- Permite que los usuarios personalicen sus órbitas de intereses
-- ============================================================

-- Agregar columna interests como JSONB (array de {icon, label})
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT NULL;

-- Comentario descriptivo
COMMENT ON COLUMN profiles.interests IS 'Array de intereses del usuario para el OrbitingInterests. Formato: [{icon: string, label: string}]';
