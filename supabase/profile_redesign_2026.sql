-- Rediseño del Perfil Space Dan v2026
-- Incluye: Blog Moderno, Temas de Perfil, Bloques Modulares y Spotify Integration

-- 1. TABLA DE BLOG POSTS
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown
  cover_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  read_time INTEGER, -- minutos (calculado en frontend o trigger)
  views_count INTEGER DEFAULT 0,
  slug TEXT UNIQUE,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA DE TEMAS DE PERFIL
CREATE TABLE IF NOT EXISTS profile_themes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_color TEXT DEFAULT '#06b6d4', -- cyan-500
  secondary_color TEXT DEFAULT '#8b5cf6', -- violet-500
  font_style TEXT DEFAULT 'sans', -- 'sans', 'mono', 'serif', 'display'
  layout_style TEXT DEFAULT 'default', -- 'default', 'compact', 'sidebar'
  background_style TEXT DEFAULT 'mesh', -- 'dark', 'light', 'mesh', 'custom'
  background_url TEXT,
  custom_css TEXT, -- Opcional, pero se recomienda evitar en la versión "controlada"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA DE BLOQUES CONFIGURABLES
CREATE TABLE IF NOT EXISTS profile_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL, -- 'spotify', 'gallery', 'markdown', 'status', 'audio', 'thought', 'stats'
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}', -- Configuración específica del bloque
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, block_type)
);

-- 4. TABLA DE CONEXIONES SPOTIFY (Sincronización segura)
CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  spotify_user_id TEXT,
  spotify_display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SEGURIDAD (RLS)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;

-- Políticas para blog_posts
CREATE POLICY "Public blog posts are viewable by everyone" ON blog_posts
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can manage their own blog posts" ON blog_posts
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para profile_themes
CREATE POLICY "Profile themes are viewable by everyone" ON profile_themes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own profile theme" ON profile_themes
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para profile_blocks
CREATE POLICY "Profile blocks are viewable by everyone" ON profile_blocks
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own profile blocks" ON profile_blocks
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para spotify_connections (Solo el dueño puede ver/gestionar sus tokens)
CREATE POLICY "Users can manage their own spotify connection" ON spotify_connections
  FOR ALL USING (auth.uid() = user_id);

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id ON blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_pinned ON blog_posts(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_profile_blocks_user_id_order ON profile_blocks(user_id, order_index);

-- 7. TRIGGERS para updated_at (Opcional si se gestiona en backend)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_profile_themes_updated_at BEFORE UPDATE ON profile_themes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_spotify_connections_updated_at BEFORE UPDATE ON spotify_connections FOR EACH ROW EXECUTE FUNCTION update_timestamp();
