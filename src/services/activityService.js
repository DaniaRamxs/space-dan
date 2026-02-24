import { supabase } from '../supabaseClient';

export const activityService = {
    /**
     * Obtiene el feed de actividad principal usando el RPC optimizado
     */
    async getFeed(viewerId, filter = 'all', limit = 10, offset = 0) {
        const { data, error } = await supabase.rpc('get_activity_feed', {
            p_viewer_id: viewerId,
            p_filter_type: filter,
            p_limit: limit,
            p_offset: offset
        });

        if (error) {
            console.error('[activityService] getFeed error:', error);
            throw error;
        }
        return data || [];
    },

    /**
     * Obtiene un post individual con su autor y reacciones
     */
    async getPost(postId, viewerId = null) {
        // Usamos el mismo RPC pero con un filtro de ID — más simple: query directa
        const { data, error } = await supabase
            .from('activity_posts')
            .select(`
                id, title, content, type, created_at, updated_at, author_id,
                author:profiles!author_id(username, avatar_url, frame_item_id)
            `)
            .eq('id', postId)
            .single();

        if (error) throw error;

        // Traer metadata de reacciones
        const { data: reactions } = await supabase
            .from('activity_reactions')
            .select('reaction_type, user_id')
            .eq('post_id', postId);

        const reactionCounts = {};
        let userReaction = null;
        for (const r of reactions || []) {
            reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
            if (viewerId && r.user_id === viewerId) userReaction = r.reaction_type;
        }
        const topReactions = Object.entries(reactionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([reaction_type, count]) => ({ reaction_type, count }));

        return {
            ...data,
            reactions_metadata: {
                total_count: reactions?.length || 0,
                top_reactions: topReactions,
                user_reaction: userReaction,
            },
            original_post: null,
        };
    },


    /**
     * Crea un nuevo post, repost o cita
     */
    async createPost(payload) {
        const { data, error } = await supabase
            .from('activity_posts')
            .insert(payload)
            .select('*, author:profiles(username, avatar_url, frame_item_id)')
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Alterna una reacción (Toggle).
     * Si la reacción ya existe y es la misma, la elimina.
     * Si es diferente (o no existe), la inserta/actualiza.
     * Nota: Asumimos que la tabla permite múltiples tipos si no es única por usuario, 
     * pero la UI trata de manejarla como 1 o toggleable.
     */
    async toggleReaction(postId, userId, reactionType) {
        // Primero, revisamos si ya reaccionó con este tipo exacto
        const { data: existing } = await supabase
            .from('activity_reactions')
            .select('id, reaction_type')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .eq('reaction_type', reactionType)
            .maybeSingle();

        if (existing) {
            // Eliminar
            const { error } = await supabase
                .from('activity_reactions')
                .delete()
                .eq('id', existing.id);
            if (error) throw error;
            return { action: 'removed', type: reactionType };
        } else {
            // Insertar nuevo
            const { error } = await supabase
                .from('activity_reactions')
                .insert({
                    post_id: postId,
                    user_id: userId,
                    reaction_type: reactionType
                });
            if (error) throw error;
            return { action: 'added', type: reactionType };
        }
    },

    /**
     * Obtiene la lista de usuarios que han reaccionado a un post
     * Útil para el ReactionModal
     */
    async getPostReactions(postId) {
        const { data, error } = await supabase
            .from('activity_reactions')
            .select('reaction_type, created_at, user:profiles(id, username, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Edita el título y/o contenido de un post propio
     */
    async updatePost(postId, { title, content }) {
        const { data, error } = await supabase.rpc('update_activity_post', {
            p_post_id: postId,
            p_title: title ?? null,
            p_content: content ?? null,
        });
        if (error) throw error;
        return data;
    },

    /**
     * Elimina un post
     */
    async deletePost(postId) {
        const { error } = await supabase
            .from('activity_posts')
            .delete()
            .eq('id', postId);
        if (error) throw error;
        return true;
    }
};
