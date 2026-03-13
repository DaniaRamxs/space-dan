-- ============================================
-- BOT SYSTEM SCHEMA
-- Esquema para los bots de comunidad
-- ============================================

-- ============================================
-- 1. CHIMUGOTCHI - Tabla de mascotas
-- ============================================
CREATE TABLE IF NOT EXISTS chimugotchi_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Info básica
    name VARCHAR(32) NOT NULL DEFAULT 'Chimuelo',
    personality VARCHAR(20) NOT NULL DEFAULT 'cariñosa',
    
    -- Stats (0-100)
    hunger INTEGER NOT NULL DEFAULT 80 CHECK (hunger >= 0 AND hunger <= 100),
    happiness INTEGER NOT NULL DEFAULT 60 CHECK (happiness >= 0 AND happiness <= 100),
    energy INTEGER NOT NULL DEFAULT 100 CHECK (energy >= 0 AND energy <= 100),
    hygiene INTEGER NOT NULL DEFAULT 90 CHECK (hygiene >= 0 AND hygiene <= 100),
    health INTEGER NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),
    
    -- Estado
    is_sleeping BOOLEAN NOT NULL DEFAULT FALSE,
    is_alive BOOLEAN NOT NULL DEFAULT TRUE,
    age DECIMAL(10,4) NOT NULL DEFAULT 0, -- en días
    
    -- Economía
    coins INTEGER NOT NULL DEFAULT 50,
    
    -- Inventario (JSON)
    inventory JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(owner_id, community_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chimugotchi_owner ON chimugotchi_pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_chimugotchi_community ON chimugotchi_pets(community_id);
CREATE INDEX IF NOT EXISTS idx_chimugotchi_alive ON chimugotchi_pets(is_alive);

-- ============================================
-- 2. CHIMUGOTCHI - Items/Tienda
-- ============================================
CREATE TABLE IF NOT EXISTS chimugotchi_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    emoji VARCHAR(10) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('food', 'toy', 'medicine', 'accessory')),
    price INTEGER NOT NULL DEFAULT 10,
    effect JSONB NOT NULL, -- {hunger: 20, happiness: 10}
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items por defecto
INSERT INTO chimugotchi_items (name, description, emoji, category, price, effect) VALUES
('Maíz', 'Comida básica de paloma', '🌽', 'food', 5, '{"hunger": 15}'),
('Pan', 'Un pedacito de pan', '🍞', 'food', 8, '{"hunger": 20, "happiness": 5}'),
('Uvas', 'Uvas dulces', '🍇', 'food', 15, '{"hunger": 25, "happiness": 10}'),
('Semillas Premium', 'Semillas especiales', '🌾', 'food', 25, '{"hunger": 40, "happiness": 15}'),
('Pelota', 'Para jugar a la pelota', '⚽', 'toy', 20, '{"happiness": 25, "energy": -10}'),
('Espejo', 'Le encanta mirarse', '🪞', 'toy', 30, '{"happiness": 30}'),
('Medicina', 'Cura enfermedades', '💊', 'medicine', 50, '{"health": 50}'),
('Vitamina', 'Recupera energía', '💉', 'medicine', 40, '{"health": 20, "energy": 30}'),
('Collar', 'Un collar elegante', '🎀', 'accessory', 100, '{"happiness": 5}'),
('Corona', 'Para la paloma reina', '👑', 'accessory', 500, '{"happiness": 20}')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. BOT SETTINGS - Configuración de bots
-- ============================================
CREATE TABLE IF NOT EXISTS community_bot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    bot_type VARCHAR(30) NOT NULL CHECK (bot_type IN ('welcome', 'goodbye', 'moderation', 'levels')),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSONB NOT NULL DEFAULT '{}',
    channel_id UUID REFERENCES community_channels(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(community_id, bot_type)
);

CREATE INDEX IF NOT EXISTS idx_bot_settings_community ON community_bot_settings(community_id);

-- ============================================
-- 4. BOT LOGS - Registro de acciones de bots
-- ============================================
CREATE TABLE IF NOT EXISTS bot_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    bot_type VARCHAR(30) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_logs_community ON bot_action_logs(community_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_created ON bot_action_logs(created_at);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE chimugotchi_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chimugotchi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_action_logs ENABLE ROW LEVEL SECURITY;

-- ChimuGotchi pets: owner puede ver/modificar sus propias mascotas
CREATE POLICY "Users can view own pets" ON chimugotchi_pets
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create own pets" ON chimugotchi_pets
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own pets" ON chimugotchi_pets
    FOR UPDATE USING (owner_id = auth.uid());

-- Items: visible para todos
CREATE POLICY "Items visible to all" ON chimugotchi_items
    FOR SELECT USING (true);

-- Bot settings: solo owner puede configurar
CREATE POLICY "Bot settings managed by owner" ON community_bot_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_id 
            AND creator_id = auth.uid()
        )
    );

-- Bot logs: visible para miembros
CREATE POLICY "Bot logs visible to members" ON bot_action_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = bot_action_logs.community_id 
            AND user_id = auth.uid()
        )
    );

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bot_settings_updated_at ON community_bot_settings;
CREATE TRIGGER update_bot_settings_updated_at
    BEFORE UPDATE ON community_bot_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE chimugotchi_pets IS 'Mascotas virtuales tipo Tamagotchi para usuarios';
COMMENT ON TABLE chimugotchi_items IS 'Items comprables para las mascotas';
COMMENT ON TABLE community_bot_settings IS 'Configuración de bots por comunidad';
COMMENT ON TABLE bot_action_logs IS 'Log de acciones de bots';
