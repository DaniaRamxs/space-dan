
import { supabase } from '../supabaseClient';

export const activityService = {
    async awardActivityXP(amount, source) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase.rpc('award_activity_xp', {
            p_user_id: user.id,
            p_amount: amount,
            p_source: source
        });

        if (error) {
            console.error('[activityService] awardActivityXP error:', error);
            return null;
        }
        return data; // { activity_xp, activity_level, level_up }
    },

    async getFeed(targetUserId = null, filter = 'all', limit = 15, offset = 0, category = null) {
        const { data: { user } } = await supabase.auth.getUser();

        // We call the specialized RPC for optimized feed retrieval
        const { data, error } = await supabase.rpc('get_activity_feed', {
            p_viewer_id: user?.id || null,
            p_filter_type: filter,
            p_limit: limit,
            p_offset: offset,
            p_author_id: targetUserId // We'll add this to the RPC
        });

        if (error) {
            console.error('[activityService] getFeed error:', error);
            throw error;
        }

        return data || [];
    },

    async getPost(postId, viewerId = null) {
        const { data, error } = await supabase
            .from('activity_posts')
            .select(`
                *,
                author:profiles(
                    id,
                    username,
                    avatar_url,
                    frame_item_id,
                    badge_color,
                    equipped_nickname_style,
                    level,
                    activity_level
                )
            `)
            .eq('id', postId)
            .single();

        if (error) {
            console.error('[activityService] getPost error:', error);
            throw error;
        }

        return data;
    },

    async createPost(payload) {
        const { data, error } = await supabase
            .from('activity_posts')
            .insert([{
                author_id: payload.author_id,
                title: payload.title || null,
                content: payload.content || null,
                category: payload.category || 'general',
                type: payload.type || 'post',
                metadata: payload.metadata || null,
            }])
            .select(`
                *,
                author:profiles(
                    id, username, avatar_url, frame_item_id,
                    badge_color, equipped_nickname_style, level, activity_level
                )
            `)
            .single();

        if (error) {
            console.error('[activityService] createPost error:', error);
            throw error;
        }
        return data;
    },

    async updatePost(postId, updates) {
        const { data, error } = await supabase
            .from('activity_posts')
            .update({
                title: updates.title ?? null,
                content: updates.content ?? null,
                category: updates.category || 'general',
                updated_at: new Date().toISOString(),
            })
            .eq('id', postId)
            .select('*')
            .single();

        if (error) {
            console.error('[activityService] updatePost error:', error);
            throw error;
        }
        return data;
    },

    async deletePost(postId) {
        const { error } = await supabase
            .from('activity_posts')
            .delete()
            .eq('id', postId);

        if (error) {
            console.error('[activityService] deletePost error:', error);
            throw error;
        }
        return true;
    }
};
