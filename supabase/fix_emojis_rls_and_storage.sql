-- Fix community_emojis RLS policies and create storage bucket
-- Issue: Policies use owner_id but should use creator_id

-- ============================================
-- 1. Fix RLS policies for community_emojis
-- ============================================

-- Drop existing emoji policies
DROP POLICY IF EXISTS "Emojis visible" ON community_emojis;
DROP POLICY IF EXISTS "Emojis managed by owner" ON community_emojis;

-- Policy: Emojis visible to everyone
CREATE POLICY "Emojis visible" ON community_emojis
    FOR SELECT USING (true);

-- Policy: Only owner (creator) can manage emojis
CREATE POLICY "Emojis managed by owner" ON community_emojis
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_emojis.community_id 
            AND creator_id = auth.uid()
        )
    );

-- ============================================
-- 2. Create emojis storage bucket (if not exists)
-- ============================================

-- Insert bucket into storage.buckets (this creates it if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('emojis', 'emojis', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Storage policies for emojis bucket
-- ============================================

-- Allow anyone to view emojis (they are public)
CREATE POLICY "Emojis storage public read" 
ON storage.objects FOR SELECT
USING (bucket_id = 'emojis');

-- Only authenticated users can upload (we check ownership in the app layer)
-- or you can restrict further if needed
CREATE POLICY "Authenticated users can upload emojis"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'emojis' 
    AND auth.role() = 'authenticated'
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own emojis"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'emojis' 
    AND owner = auth.uid()
);
