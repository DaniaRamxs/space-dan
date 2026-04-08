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
    },

    // ── Stellar Notes ──

    async getNotes(partnershipId) {
        const { data, error } = await supabase
            .from('universe_notes')
            .select('*, author:profiles!author_id(id, username, avatar_url)')
            .eq('partnership_id', partnershipId)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        return data || [];
    },

    async addNote(partnershipId, content) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");
        const { data, error } = await supabase
            .from('universe_notes')
            .insert({ partnership_id: partnershipId, author_id: user.id, content })
            .select('*, author:profiles!author_id(id, username, avatar_url)')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteNote(noteId) {
        const { error } = await supabase
            .from('universe_notes')
            .delete()
            .eq('id', noteId);
        if (error) throw error;
    },

    // ── Gallery ──

    async getGallery(partnershipId) {
        const { data, error } = await supabase
            .from('universe_gallery')
            .select('*, uploader:profiles!uploaded_by(id, username)')
            .eq('partnership_id', partnershipId)
            .order('created_at', { ascending: false })
            .limit(30);
        if (error) throw error;
        return data || [];
    },

    async uploadGalleryImage(partnershipId, file, caption = '') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");

        const ext = file.name.split('.').pop();
        const path = `${partnershipId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('universe-gallery')
            .upload(path, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('universe-gallery')
            .getPublicUrl(path);

        const { data, error } = await supabase
            .from('universe_gallery')
            .insert({
                partnership_id: partnershipId,
                uploaded_by: user.id,
                image_url: urlData.publicUrl,
                caption
            })
            .select('*, uploader:profiles!uploaded_by(id, username)')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteGalleryImage(imageId, imageUrl) {
        // Delete from storage
        try {
            const urlParts = imageUrl.split('/universe-gallery/');
            if (urlParts[1]) {
                await supabase.storage.from('universe-gallery').remove([urlParts[1]]);
            }
        } catch (e) { /* non-critical */ }

        const { error } = await supabase
            .from('universe_gallery')
            .delete()
            .eq('id', imageId);
        if (error) throw error;
    },

    // ── Stats ──

    async getStats(partnershipId) {
        const { data, error } = await supabase
            .from('universe_stats')
            .select('*')
            .eq('partnership_id', partnershipId)
            .maybeSingle();
        if (error) throw error;
        return data;
    }
};
