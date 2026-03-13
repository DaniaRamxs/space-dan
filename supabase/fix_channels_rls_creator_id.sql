-- Fix RLS policies to use creator_id instead of owner_id
-- The backend uses creator_id, not owner_id

-- Drop existing policies
DROP POLICY IF EXISTS "Only owner can create channels" ON community_channels;
DROP POLICY IF EXISTS "Only owner can update channels" ON community_channels;
DROP POLICY IF EXISTS "Only owner can delete channels" ON community_channels;

-- Create new policies using creator_id
CREATE POLICY "Only owner can create channels" ON community_channels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_channels.community_id 
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Only owner can update channels" ON community_channels
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_channels.community_id 
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Only owner can delete channels" ON community_channels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_channels.community_id 
            AND creator_id = auth.uid()
        )
    );

-- Also update the isCommunityOwner function in the frontend to use creator_id
-- This is a reference note - the JS code was already updated in previous commit
