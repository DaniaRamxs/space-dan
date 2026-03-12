-- Spacely Communities & Activities System
-- Migration: 2026-03-11

-- ============================================
-- COMMUNITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  banner_url TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_category ON communities(category);
CREATE INDEX idx_communities_creator ON communities(creator_id);

-- ============================================
-- COMMUNITY MEMBERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- member, moderator, admin
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);

-- ============================================
-- ACTIVITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- voice, watch, music, game, interactive
  title TEXT NOT NULL,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active', -- active, paused, ended
  participant_count INTEGER DEFAULT 0,
  spectator_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_community ON activities(community_id);
CREATE INDEX idx_activities_host ON activities(host_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

-- ============================================
-- ACTIVITY PARTICIPANTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activity_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_spectator BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ
);

CREATE INDEX idx_activity_participants_activity ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_user ON activity_participants(user_id);
CREATE INDEX idx_activity_participants_active ON activity_participants(activity_id, user_id) WHERE left_at IS NULL;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment community member count
CREATE OR REPLACE FUNCTION increment_community_members(community_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE communities SET member_count = member_count + 1 WHERE id = community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement community member count
CREATE OR REPLACE FUNCTION decrement_community_members(community_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment activity participant count
CREATE OR REPLACE FUNCTION increment_activity_participants(activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE activities SET participant_count = participant_count + 1 WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement activity participant count
CREATE OR REPLACE FUNCTION decrement_activity_participants(activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE activities SET participant_count = GREATEST(0, participant_count - 1) WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment activity spectator count
CREATE OR REPLACE FUNCTION increment_activity_spectators(activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE activities SET spectator_count = spectator_count + 1 WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement activity spectator count
CREATE OR REPLACE FUNCTION decrement_activity_spectators(activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE activities SET spectator_count = GREATEST(0, spectator_count - 1) WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Communities: Public read, authenticated create
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Communities are viewable by everyone"
  ON communities FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their communities"
  ON communities FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their communities"
  ON communities FOR DELETE
  USING (auth.uid() = creator_id);

-- Community Members: Members can view, authenticated can join
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community members are viewable by everyone"
  ON community_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join communities"
  ON community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  USING (auth.uid() = user_id);

-- Activities: Public read, authenticated create
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activities are viewable by everyone"
  ON activities FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create activities"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their activities"
  ON activities FOR UPDATE
  USING (auth.uid() = host_id);

-- Activity Participants: Public read, authenticated join
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity participants are viewable by everyone"
  ON activity_participants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join activities"
  ON activity_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
  ON activity_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to create sample communities
/*
INSERT INTO communities (name, slug, description, category, creator_id) VALUES
  ('Anime Universe', 'anime-universe', 'Para fans del anime y manga', 'anime', (SELECT id FROM profiles LIMIT 1)),
  ('Gaming Hub', 'gaming-hub', 'Comunidad de gamers', 'gaming', (SELECT id FROM profiles LIMIT 1)),
  ('Music Lounge', 'music-lounge', 'Descubre y comparte música', 'music', (SELECT id FROM profiles LIMIT 1)),
  ('Tech Talk', 'tech-talk', 'Tecnología y desarrollo', 'tech', (SELECT id FROM profiles LIMIT 1));
*/
