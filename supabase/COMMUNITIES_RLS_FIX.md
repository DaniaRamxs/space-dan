# Communities RLS Fix Guide

## Problem

When trying to create a community from the frontend, you get:
```
"new row violates row-level security policy for table "communities""
```

## Root Cause

The RLS policies in your migration file are **correct**, but the error typically occurs when:

1. **The `creator_id` field is not being set correctly** in the frontend insert
2. **The user is not authenticated** when making the request
3. **The `creator_id` doesn't match `auth.uid()`** (the authenticated user's ID)

The INSERT policy requires: `auth.uid() = creator_id`

This means the frontend MUST pass the authenticated user's ID as `creator_id`, and it must match the session's `auth.uid()`.

## SQL Solution

Run this in **Supabase SQL Editor**:

```sql
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
```

## Frontend Solution (React + Supabase JS)

### ✅ CORRECT Implementation

```jsx
import { supabase } from './supabaseClient';
import { useState } from 'react';

function CreateCommunityForm() {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'general',
    avatar_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get the authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to create a community');
      }

      // Insert the community with creator_id set to the authenticated user's ID
      const { data, error: insertError } = await supabase
        .from('communities')
        .insert([
          {
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            category: formData.category,
            avatar_url: formData.avatar_url,
            creator_id: user.id  // ✅ CRITICAL: Must match auth.uid()
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('Community created:', data);
      
      // Optionally: Auto-join the creator as a member
      await supabase
        .from('community_members')
        .insert([
          {
            community_id: data.id,
            user_id: user.id,
            role: 'admin'
          }
        ]);

      // Reset form or redirect
      setFormData({ name: '', slug: '', description: '', category: 'general', avatar_url: '' });
      
    } catch (err) {
      console.error('Error creating community:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Community Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      
      <input
        type="text"
        placeholder="Slug (URL-friendly)"
        value={formData.slug}
        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
        required
      />
      
      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />
      
      <select
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      >
        <option value="general">General</option>
        <option value="gaming">Gaming</option>
        <option value="anime">Anime</option>
        <option value="music">Music</option>
        <option value="tech">Tech</option>
      </select>

      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Community'}
      </button>
    </form>
  );
}

export default CreateCommunityForm;
```

### ❌ WRONG Implementation (causes RLS error)

```jsx
// ❌ Missing creator_id
const { data, error } = await supabase
  .from('communities')
  .insert([
    {
      name: formData.name,
      slug: formData.slug,
      description: formData.description
      // ❌ No creator_id! RLS will fail!
    }
  ]);

// ❌ Wrong creator_id (hardcoded or from wrong source)
const { data, error } = await supabase
  .from('communities')
  .insert([
    {
      name: formData.name,
      creator_id: 'some-hardcoded-uuid'  // ❌ Won't match auth.uid()
    }
  ]);
```

## Security Best Practices

### ✅ DO:
- Always get `user.id` from `supabase.auth.getUser()` on the client
- Set `creator_id: user.id` when inserting
- Check if user is authenticated before attempting insert
- Use `WITH CHECK` in INSERT policies to validate data
- Use `USING` in UPDATE/DELETE policies to restrict access

### ❌ DON'T:
- Don't trust client-provided `creator_id` without validation (RLS handles this)
- Don't disable RLS in production
- Don't use `USING (true)` for INSERT/UPDATE/DELETE policies
- Don't hardcode user IDs

## Testing the Fix

1. **Run the SQL** in Supabase SQL Editor
2. **Verify policies** exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'communities';
   ```
3. **Test in frontend**:
   - Ensure user is logged in
   - Try creating a community
   - Check browser console for errors
   - Verify in Supabase dashboard that row was created

## Additional Notes

- The `creator_id` field references `profiles(id)`, so ensure your user has a profile
- The `slug` must be unique (enforced by UNIQUE constraint)
- Consider adding validation for slug format (lowercase, hyphens only)
- The migration file has been updated with the DELETE policy
