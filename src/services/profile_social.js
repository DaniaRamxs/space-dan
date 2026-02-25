import { supabase } from '../supabaseClient';

export const profileSocialService = {
    /**
     * Follow or unfollow a user.
     */
    async toggleFollow(targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        // Check if following
        const { data: existing } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', targetUserId);
            if (error) throw error;
            return { following: false };
        } else {
            const { error } = await supabase
                .from('follows')
                .insert({ follower_id: user.id, following_id: targetUserId });
            if (error) throw error;
            return { following: true };
        }
    },

    /**
     * Check if following a user.
     */
    async isFollowing(targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .maybeSingle();

        return !!data;
    },

    /**
     * Get counts
     */
    async getFollowCounts(userId) {
        const { count: followers } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);

        const { count: following } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId);

        return { followers: followers || 0, following: following || 0 };
    },

    /**
     * Profile Comments
     */
    async getProfileComments(profileId) {
        const { data, error } = await supabase
            .from('profile_comments')
            .select(`
        id,
        content,
        created_at,
        author_id,
        author:profiles!author_id (username, avatar_url, nick_style_item:equipped_nickname_style(id))
      `)
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async addProfileComment(profileId, content) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data, error } = await supabase
            .from('profile_comments')
            .insert({
                profile_id: profileId,
                author_id: user.id,
                content
            })
            .select(`
        id,
        content,
        created_at,
        author_id,
        author:profiles!author_id (username, avatar_url, nick_style_item:equipped_nickname_style(id))
      `)
            .single();

        if (error) throw error;
        return data;
    },

    async deleteComment(commentId) {
        const { error } = await supabase
            .from('profile_comments')
            .delete()
            .eq('id', commentId);
        if (error) throw error;
        return true;
    }
};
