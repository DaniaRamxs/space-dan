import { supabase } from '../supabaseClient';

export const activityService = {
    /**
     * Obtiene el feed — filtrado por tipo y/o categoría
     */
    async getFeed(viewerId, filter = 'all', limit = 10, offset = 0, category = null) {
        let query = supabase
            .from('activity_posts')
            .select(`
                id, title, content, type, category, views_count, created_at, updated_at, author_id,
                author:profiles!author_id(username, avatar_url, frame_item_id, nick_style_item:equipped_nickname_style(id))
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Filtrar por tipo
        if (filter === 'post') query = query.eq('type', 'post');
        else if (filter !== 'all') query = query.eq('type', filter);

        // Filtrar por categoría
        if (category && category !== 'all') query = query.eq('category', category);

        const { data, error } = await query;
        if (error) {
            console.error('[activityService] getFeed error:', error);
            throw error;
        }

        // Enriquecer con reactions_metadata básico (vacío hasta que se cargue)
        return (data || []).map(p => ({
            ...p,
            reactions_metadata: p.reactions_metadata || { total_count: 0, top_reactions: [], user_reaction: null },
            original_post: null,
        }));
    },

    /**
     * Obtiene un post individual con reacciones completas e incrementa vistas
     */
    async getPost(postId, viewerId = null) {
        const { data, error } = await supabase
            .from('activity_posts')
            .select(`
                id, title, content, type, category, views_count, created_at, updated_at, author_id,
                author:profiles!author_id(username, avatar_url, frame_item_id, nick_style_item:equipped_nickname_style(id))
            `)
            .eq('id', postId)
            .single();

        if (error) throw error;

        // Incrementar vistas en background (fire and forget)
        supabase.rpc('increment_post_views', { p_post_id: postId }).then(() => { }).catch(() => { });

        // Reacciones
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
            views_count: (data.views_count || 0) + 1, // refleja la vista actual optimistamente
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
     * Alterna una reacción (Toggle)
     */
    async toggleReaction(postId, userId, reactionType) {
        const { data: existing } = await supabase
            .from('activity_reactions')
            .select('id, reaction_type')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .eq('reaction_type', reactionType)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('activity_reactions')
                .delete()
                .eq('id', existing.id);
            if (error) throw error;
            return { action: 'removed', type: reactionType };
        } else {
            // Eliminar cualquier reacción previa diferente del mismo usuario (1 reacción por post)
            await supabase
                .from('activity_reactions')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', userId);

            const { error } = await supabase
                .from('activity_reactions')
                .insert({ post_id: postId, user_id: userId, reaction_type: reactionType });
            if (error) throw error;
            return { action: 'added', type: reactionType };
        }
    },

    /**
     * Obtiene la lista de usuarios que han reaccionado a un post
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
     * Edita título, contenido y/o categoría de un post propio
     */
    async updatePost(postId, { title, content, category }) {
        const { data, error } = await supabase.rpc('update_activity_post', {
            p_post_id: postId,
            p_title: title ?? null,
            p_content: content ?? null,
            p_category: category ?? null,
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
