-- ============================================================
-- Pixel Galaxy — canvas persistente por sala de voz
-- Ejecutar después de schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pixel_galaxy (
  room_name  text      NOT NULL,
  x          smallint  NOT NULL CHECK (x >= 0 AND x < 128),
  y          smallint  NOT NULL CHECK (y >= 0 AND y < 128),
  color      text      NOT NULL CHECK (color ~* '^#[0-9a-fA-F]{6}$'),
  user_id    text      NOT NULL DEFAULT '',   -- session-based (not auth uuid)
  username   text      DEFAULT NULL,
  placed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_name, x, y)
);

CREATE INDEX IF NOT EXISTS idx_pixel_galaxy_room
  ON public.pixel_galaxy (room_name);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.pixel_galaxy ENABLE ROW LEVEL SECURITY;

-- Lectura pública (para futura visualización en perfiles, etc.)
DROP POLICY IF EXISTS "pixel_galaxy_public_read"  ON public.pixel_galaxy;
CREATE POLICY "pixel_galaxy_public_read" ON public.pixel_galaxy
  FOR SELECT USING (true);

-- El servidor Colyseus escribe con la anon key → necesita acceso completo
-- (Las escrituras llegan solo desde el backend, no del frontend directamente)
DROP POLICY IF EXISTS "pixel_galaxy_server_write" ON public.pixel_galaxy;
CREATE POLICY "pixel_galaxy_server_write" ON public.pixel_galaxy
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
