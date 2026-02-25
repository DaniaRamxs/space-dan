-- ============================================================
-- emotional_universe.sql :: Digital Identity & Emotional Architecture
-- ============================================================

-- 1. EXTEND PROFILES WITH EMOTIONAL & IDENTITY FIELDS
ALTER TABLE public.profiles
  -- Emotional Mood
  ADD COLUMN IF NOT EXISTS mood_text        text CHECK (char_length(mood_text) <= 60),
  ADD COLUMN IF NOT EXISTS mood_emoji       text,
  ADD COLUMN IF NOT EXISTS mood_expires_at  timestamptz,
  
  -- Identity Data
  ADD COLUMN IF NOT EXISTS mbti             text CHECK (mbti IN ('INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP')),
  ADD COLUMN IF NOT EXISTS zodiac           text CHECK (zodiac IN ('Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces')),
  ADD COLUMN IF NOT EXISTS country          text,
  ADD COLUMN IF NOT EXISTS age              integer CHECK (age >= 13 AND age <= 120),
  
  -- Privacy Core
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{
    "show_age": true,
    "show_country": true,
    "show_zodiac": true,
    "allow_ambient_sound": true,
    "show_mood": true
  }',

  -- Equipment
  ADD COLUMN IF NOT EXISTS equipped_nickname_style text REFERENCES public.store_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipped_theme          text REFERENCES public.store_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipped_primary_role   text REFERENCES public.store_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipped_secondary_role text REFERENCES public.store_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipped_ambient_sound  text REFERENCES public.store_items(id) ON DELETE SET NULL;

-- 2. SOCIAL EXTERNAL LINKS
CREATE TABLE IF NOT EXISTS public.user_social_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform    text NOT NULL CHECK (platform IN ('github', 'discord', 'twitter', 'instagram', 'youtube', 'linkedin', 'spotify', 'lastfm', 'custom')),
    url         text NOT NULL,
    label       text, -- For custom platforms
    is_featured boolean DEFAULT false,
    sort_order  integer DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    UNIQUE(user_id, platform)
);

-- 3. STORE ITEM CATEGORIES EXTENSION (Already exists in economy.sql, just for documentation)
-- categories: 'nickname_style', 'profile_theme', 'role', 'ambient_sound'

-- 4. RLS POLICIES
ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SocialLinks: Public read access" ON public.user_social_links FOR SELECT USING (true);
CREATE POLICY "SocialLinks: Owner manage" ON public.user_social_links FOR ALL USING (auth.uid() = user_id);

-- 5. FUNCTION: CLAIM_MOOD
-- Set temporary or permanent mood
CREATE OR REPLACE FUNCTION public.set_user_mood(
    p_text text,
    p_emoji text DEFAULT NULL,
    p_duration_hours integer DEFAULT NULL -- NULL means permanent
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;

    UPDATE public.profiles
    SET 
        mood_text = p_text,
        mood_emoji = p_emoji,
        mood_expires_at = CASE WHEN p_duration_hours IS NULL THEN NULL ELSE now() + (p_duration_hours || ' hours')::interval END,
        updated_at = now()
    WHERE id = auth.uid();

    RETURN jsonb_build_object('success', true, 'mood', p_text);
END;
$$;

-- 6. CRON / CLEANER (Logic): Auto-delete expired moods
-- This can be run by a worker or via a view that filters them
CREATE OR REPLACE VIEW public.active_profiles AS
SELECT *, 
       CASE WHEN mood_expires_at < now() THEN NULL ELSE mood_text END as effective_mood_text,
       CASE WHEN mood_expires_at < now() THEN NULL ELSE mood_emoji END as effective_mood_emoji
FROM public.profiles;

-- 7. FUNCTION: PURCHASE_IDENTITY_ITEM (Wrapper for purchase_item with role/style logic)
-- purchase_item existing in economy.sql handles basic balance check.
-- Here we can add specific identity logic if needed.
