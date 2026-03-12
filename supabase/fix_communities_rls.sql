-- ============================================
-- FIX: Communities RLS Policies
-- ============================================
-- Run this in Supabase SQL Editor to fix RLS policies
-- for the communities table

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON communities;
DROP POLICY IF EXISTS "Creators can update their communities" ON communities;
DROP POLICY IF EXISTS "Creators can delete their communities" ON communities;

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can view all communities
CREATE POLICY "Communities are viewable by everyone"
  ON communities FOR SELECT
  USING (true);

-- INSERT: Authenticated users can create communities where they are the creator
CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- UPDATE: Creators can update their own communities
CREATE POLICY "Creators can update their communities"
  ON communities FOR UPDATE
  USING (auth.uid() = creator_id);

-- DELETE: Creators can delete their own communities
CREATE POLICY "Creators can delete their communities"
  ON communities FOR DELETE
  USING (auth.uid() = creator_id);
