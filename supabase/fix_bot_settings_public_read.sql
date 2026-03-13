-- Allow community members to read bot settings (needed for /rules command)
-- Members need to read 'moderation' settings to see community rules

-- First drop the overly restrictive ALL policy
DROP POLICY IF EXISTS "Bot settings managed by owner" ON community_bot_settings;

-- Recreate: only owners can write
CREATE POLICY "Bot settings write by owner" ON community_bot_settings
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM communities WHERE id = community_id AND creator_id = auth.uid())
    );

CREATE POLICY "Bot settings update by owner" ON community_bot_settings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM communities WHERE id = community_id AND creator_id = auth.uid())
    );

CREATE POLICY "Bot settings delete by owner" ON community_bot_settings
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM communities WHERE id = community_id AND creator_id = auth.uid())
    );

-- Members can read bot settings (needed for /rules, /welcome test, etc.)
CREATE POLICY "Bot settings readable by members" ON community_bot_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_id = community_bot_settings.community_id
            AND user_id = auth.uid()
        )
    );
