-- Fix RLS policies for forum_posts and forum_comments
-- Error 403 when creating posts - missing RLS policies

-- ============================================
-- RLS POLICIES FOR forum_posts
-- ============================================

-- Enable RLS
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Forum posts visible to community members" ON forum_posts;
DROP POLICY IF EXISTS "Community members can create posts" ON forum_posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON forum_posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON forum_posts;

-- Policy: Posts visible to community members
CREATE POLICY "Forum posts visible to community members" ON forum_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = forum_posts.community_id 
            AND user_id = auth.uid()
        )
    );

-- Policy: Community members can create posts
CREATE POLICY "Community members can create posts" ON forum_posts
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = forum_posts.community_id 
            AND user_id = auth.uid()
        )
    );

-- Policy: Authors can update own posts
CREATE POLICY "Authors can update own posts" ON forum_posts
    FOR UPDATE USING (auth.uid() = author_id);

-- Policy: Authors can delete own posts
CREATE POLICY "Authors can delete own posts" ON forum_posts
    FOR DELETE USING (auth.uid() = author_id);

-- ============================================
-- RLS POLICIES FOR forum_comments
-- ============================================

-- Enable RLS
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Forum comments visible to community members" ON forum_comments;
DROP POLICY IF EXISTS "Community members can create comments" ON forum_comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON forum_comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON forum_comments;

-- Policy: Comments visible to community members
CREATE POLICY "Forum comments visible to community members" ON forum_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM forum_posts fp
            JOIN community_members cm ON fp.community_id = cm.community_id
            WHERE fp.id = forum_comments.post_id
            AND cm.user_id = auth.uid()
        )
    );

-- Policy: Community members can create comments
CREATE POLICY "Community members can create comments" ON forum_comments
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM forum_posts fp
            JOIN community_members cm ON fp.community_id = cm.community_id
            WHERE fp.id = forum_comments.post_id
            AND cm.user_id = auth.uid()
        )
    );

-- Policy: Authors can update own comments
CREATE POLICY "Authors can update own comments" ON forum_comments
    FOR UPDATE USING (auth.uid() = author_id);

-- Policy: Authors can delete own comments
CREATE POLICY "Authors can delete own comments" ON forum_comments
    FOR DELETE USING (auth.uid() = author_id);
