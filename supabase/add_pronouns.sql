-- 1. Add Pronouns and Social Links to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pronouns     text CHECK (char_length(pronouns) <= 20),
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;

-- 2. Update existing privacy settings default to include pronouns
ALTER TABLE public.profiles 
ALTER COLUMN privacy_settings SET DEFAULT '{
    "show_age": true,
    "show_country": true,
    "show_zodiac": true,
    "allow_ambient_sound": true,
    "show_mood": true,
    "show_pronouns": true,
    "show_socials": true
}';

-- Note: user_social_links table already exists from emotional_universe.sql
-- platforms: 'github', 'discord', 'twitter', 'instagram', 'youtube', 'linkedin', 'spotify', 'lastfm', 'custom'
