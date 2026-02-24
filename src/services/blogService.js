import { supabase } from '../supabaseClient';

export const blogService = {
    // 1. Get Global Feed (Published only)
    async getGlobalFeed(limit = 20, offset = 0) {
        const { data, error } = await supabase
            .from('posts')
            .select('*, author:profiles(username, avatar_url, frame_item_id)')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data;
    },

    // 2. Get User Profile Posts (Published only unless requesting own drafts)
    async getUserPosts(userId, includeDrafts = false) {
        let query = supabase
            .from('posts')
            .select('*, author:profiles(username)')
            .eq('user_id', userId);

        if (!includeDrafts) {
            query = query.eq('status', 'published');
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // 3. Get Single Post by Slug
    async getPostBySlug(slug) {
        const { data, error } = await supabase
            .from('posts')
            .select('*, author:profiles(username, avatar_url)')
            .eq('slug', slug)
            .single();

        if (error) throw error;

        // Increment view asynchronously
        if (data && data.status === 'published') {
            supabase.rpc('increment_post_views', { p_post_id: data.id }).catch(() => { });
        }

        return data;
    },

    // 4. Create Draft/Post
    async createPost(userId, payload) {
        const slug = this._generateSlug(payload.title);
        const { data, error } = await supabase
            .from('posts')
            .insert({ ...payload, user_id: userId, slug })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // 5. Update Post
    async updatePost(postId, payload) {
        // If title changes, we might want to update slug (optional, kept simple here not changing slug)
        const { data, error } = await supabase
            .from('posts')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', postId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // 6. Delete Post
    async deletePost(postId) {
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (error) throw error;
    },

    // Helper
    _generateSlug(title) {
        const baseSlug = title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
        const randomHash = Math.random().toString(36).substring(2, 6);
        return `${baseSlug}-${randomHash}`;
    }
};
