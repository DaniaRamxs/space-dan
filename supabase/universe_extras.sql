-- ============================================================
-- space-dan :: Universe Extras (Notes, Gallery, Milestones)
-- Execute AFTER private_universe.sql
-- ============================================================

-- 1. UNIVERSE NOTES (Notas Estelares)
CREATE TABLE IF NOT EXISTS public.universe_notes (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partnership_id uuid NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
    author_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content        text NOT NULL CHECK (char_length(content) <= 200),
    created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.universe_notes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.universe_notes TO authenticated;
GRANT SELECT ON public.universe_notes TO anon;

DROP POLICY IF EXISTS "Notes viewable by participants" ON public.universe_notes;
CREATE POLICY "Notes viewable by participants"
    ON public.universe_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.partnerships p 
            WHERE p.id = partnership_id 
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Notes insertable by participants" ON public.universe_notes;
CREATE POLICY "Notes insertable by participants"
    ON public.universe_notes FOR INSERT
    WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.partnerships p 
            WHERE p.id = partnership_id 
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Notes deletable by author" ON public.universe_notes;
CREATE POLICY "Notes deletable by author"
    ON public.universe_notes FOR DELETE
    USING (auth.uid() = author_id);

-- 2. UNIVERSE GALLERY (Galería Compartida)
CREATE TABLE IF NOT EXISTS public.universe_gallery (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partnership_id uuid NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
    uploaded_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url      text NOT NULL,
    caption        text CHECK (char_length(caption) <= 100),
    created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.universe_gallery ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.universe_gallery TO authenticated;
GRANT SELECT ON public.universe_gallery TO anon;

DROP POLICY IF EXISTS "Gallery viewable by participants" ON public.universe_gallery;
CREATE POLICY "Gallery viewable by participants"
    ON public.universe_gallery FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.partnerships p 
            WHERE p.id = partnership_id 
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Gallery insertable by participants" ON public.universe_gallery;
CREATE POLICY "Gallery insertable by participants"
    ON public.universe_gallery FOR INSERT
    WITH CHECK (
        auth.uid() = uploaded_by AND
        EXISTS (
            SELECT 1 FROM public.partnerships p 
            WHERE p.id = partnership_id 
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Gallery deletable by uploader" ON public.universe_gallery;
CREATE POLICY "Gallery deletable by uploader"
    ON public.universe_gallery FOR DELETE
    USING (auth.uid() = uploaded_by);

-- 3. Add streak tracking columns to universe_stats
ALTER TABLE public.universe_stats 
    ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_streak_date date;

-- 4. Storage bucket for universe gallery images
-- NOTE: Create this bucket manually in Supabase Dashboard -> Storage -> New Bucket
-- Name: universe-gallery, Public: true
