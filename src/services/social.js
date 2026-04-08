import { supabase } from '../supabaseClient';

/**
 * SOCIAL SERVICE
 * Handles interactions with the Orbit Letters system.
 */

export const socialService = {
    /**
     * Fetch all conversations for the current user.
     * Returns a list of conversations with other user profiles and unread counts.
     */
    async getConversations() {
        const { data, error } = await supabase.rpc('get_my_conversations');
        if (error) throw error;
        return data;
    },

    /**
     * Fetch all letters for a specific conversation.
     * Participants only.
     */
    async getLetters(conversationId) {
        const { data, error } = await supabase.rpc('get_letters', {
            p_conv_id: conversationId
        });
        if (error) throw error;
        return data;
    },

    /**
     * Send a new letter to a user.
     * Handles conversation creation/retrieval internally.
     */
    async sendLetter(toUserId, content) {
        const { data, error } = await supabase.rpc('send_letter', {
            p_to_user_id: toUserId,
            p_content: content
        });
        if (error) throw error;
        return data;
    },

    /**
     * Mark a specific letter as read.
     */
    async markAsRead(letterId) {
        const { error } = await supabase.rpc('mark_letter_read', {
            p_letter_id: letterId
        });
        if (error) throw error;
        return { success: true };
    },

    /**
     * Star/Unstar a letter to save it to its Vault (implicitly).
     */
    async toggleStar(letterId) {
        // Check if already starred
        const { data: existing } = await supabase
            .from('letter_stars')
            .select('*')
            .eq('letter_id', letterId)
            .eq('user_id', (await supabase.auth.getUser()).data.user.id)
            .single();

        if (existing) {
            const { error } = await supabase
                .from('letter_stars')
                .delete()
                .eq('letter_id', letterId)
                .eq('user_id', (await supabase.auth.getUser()).data.user.id);
            if (error) throw error;
            return { starred: false };
        } else {
            const { error } = await supabase
                .from('letter_stars')
                .insert({ letter_id: letterId });
            if (error) throw error;
            return { starred: true };
        }
    },

    /**
     * Get user activity status (privacy-respecting).
     */
    async getUserActivity(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('last_seen_at, show_activity')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const { data: label } = await supabase.rpc('get_activity_label', {
            p_last_seen: data.last_seen_at,
            p_show_activity: data.show_activity
        });

        return label;
    }
};
