import { supabase } from '../supabaseClient';
import { streakService } from './streak';
import { createNotification } from './supabaseNotifications';

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

            // Racha Estelar al seguir a alguien
            streakService.trackActivity();

            // Notify the followed user
            supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    const actorName = data?.username || 'Alguien';
                    createNotification(targetUserId, 'follow', `@${actorName} empezó a seguirte`, user.id);
                })
                .catch(() => {});

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
     * Get list of followers for a user.
     */
    async getFollowers(userId) {
        const { data, error } = await supabase
            .from('follows')
            .select('follower:profiles!follower_id (id, username, avatar_url)')
            .eq('following_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(f => f.follower).filter(Boolean);
    },

    /**
     * Get list of users a user is following.
     */
    async getFollowing(userId) {
        const { data, error } = await supabase
            .from('follows')
            .select('following:profiles!following_id (id, username, avatar_url)')
            .eq('follower_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(f => f.following).filter(Boolean);
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

        // Racha Estelar al comentar
        streakService.trackActivity();

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
