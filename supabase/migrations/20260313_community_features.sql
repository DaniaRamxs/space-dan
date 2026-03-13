-- ============================================================
-- community_member_passports
-- Guarda la firma personalizada de un miembro en una comunidad
-- ============================================================
CREATE TABLE IF NOT EXISTS community_member_passports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  signature   TEXT DEFAULT '',           -- frase/estado personalizado
  joined_at   TIMESTAMPTZ DEFAULT NOW(), -- cuándo se unió a la comunidad
  UNIQUE (user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_passport_user     ON community_member_passports(user_id);
CREATE INDEX IF NOT EXISTS idx_passport_community ON community_member_passports(community_id);

ALTER TABLE community_member_passports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passport_select" ON community_member_passports
  FOR SELECT USING (true);

CREATE POLICY "passport_upsert" ON community_member_passports
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- community_polls
-- Encuestas nativas persistentes por canal
-- ============================================================
CREATE TABLE IF NOT EXISTS community_polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  creator_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL DEFAULT '[]', -- [{ id, text }]
  ends_at     TIMESTAMPTZ,                 -- NULL = sin expiración
  is_closed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_channel ON community_polls(channel_id);

ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_select" ON community_polls
  FOR SELECT USING (true);

CREATE POLICY "poll_insert" ON community_polls
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "poll_update" ON community_polls
  FOR UPDATE USING (auth.uid() = creator_id);

-- ============================================================
-- community_poll_votes
-- Un voto por usuario por encuesta
-- ============================================================
CREATE TABLE IF NOT EXISTS community_poll_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_id   TEXT NOT NULL,              -- id del option dentro del JSONB
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, user_id)               -- un voto por persona por encuesta
);

CREATE INDEX IF NOT EXISTS idx_vote_poll ON community_poll_votes(poll_id);

ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vote_select" ON community_poll_votes
  FOR SELECT USING (true);

CREATE POLICY "vote_insert" ON community_poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vote_delete" ON community_poll_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Agregar campo poll_id a channel_messages (opcional, para
-- que un mensaje pueda referenciar la encuesta que creó)
-- ============================================================
ALTER TABLE channel_messages
  ADD COLUMN IF NOT EXISTS poll_id UUID REFERENCES community_polls(id) ON DELETE SET NULL;
