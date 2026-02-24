import { supabase } from '../supabaseClient';

export const universeService = {
    /**
     * Get the active romantic partnership for the current user.
     */
    async getMyPartnership() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase.rpc('get_active_partnership', {
            p_user_id: user.id
        });

        if (error) {
            console.error('[UniverseService] getMyPartnership error:', error);
            return null;
        }
        return data;
    },

    /**
     * Get partnership for a public profile.
     */
    async getProfilePartnership(userId) {
        const { data, error } = await supabase.rpc('get_active_partnership', {
            p_user_id: userId
        });
        if (error) return null;
        return data;
    },

    /**
     * Register a visit to the private universe.
     */
    async registerVisit(partnershipId) {
        const { error } = await supabase.rpc('register_universe_visit', {
            p_partnership_id: partnershipId
        });
        if (error) throw error;
        return true;
    },

    /**
     * Change partnership status to eclipse or delete.
     */
    async updateStatus(partnershipId, status) {
        const { error } = await supabase
            .from('partnerships')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', partnershipId);

        if (error) throw error;
        return true;
    },

    async breakPartnership(partnershipId) {
        const { error } = await supabase
            .from('partnerships')
            .delete()
            .eq('id', partnershipId);

        if (error) throw error;
        return true;
    },

    /**
     * Partnership Requests
     */
    async sendRequest(receiverId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");

        const { data, error } = await supabase
            .from('partnership_requests')
            .insert({ sender_id: user.id, receiver_id: receiverId, status: 'pending' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getPendingRequests() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('partnership_requests')
            .select('*, sender:profiles!sender_id(id, username, avatar_url)')
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) throw error;
        return data;
    },

    async acceptRequest(requestId) {
        const { data, error } = await supabase.rpc('accept_partnership_request', {
            p_request_id: requestId
        });
        if (error) throw error;
        return data;
    },

    async rejectRequest(requestId) {
        const { error } = await supabase
            .from('partnership_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (error) throw error;
        return true;
    }
};
