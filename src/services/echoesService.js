import { supabase } from '../supabaseClient';

export const echoesService = {
    // Obtener ecos de un perfil
    getProfileEchoes: async (userId) => {
        const { data, error } = await supabase
            .from('space_echoes')
            .select(`
        *,
        author:profiles!space_echoes_author_id_fkey(id, username, avatar_url),
        stars:space_echo_stars(user_id)
      `)
            .eq('user_id', userId)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Convertir 'stars' en un array de userIds para fácil acceso
        return data.map(echo => ({
            ...echo,
            hasStarred: (echo.stars || []).length > 0
        }));
    },

    // Crear un nuevo eco
    createEcho: async (userId, echoType, content = null, metadata = {}, isFleeting = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para dejar un eco.');

        let expiresAt = null;
        if (isFleeting) {
            // 24 horas default
            const date = new Date();
            date.setHours(date.getHours() + 24);
            expiresAt = date.toISOString();
        }

        const { data, error } = await supabase
            .from('space_echoes')
            .insert({
                user_id: userId,
                author_id: user.id,
                echo_type: echoType,
                content: content,
                metadata: metadata,
                is_fleeting: isFleeting,
                expires_at: expiresAt
            })
            .select(`
        *,
        author:profiles!space_echoes_author_id_fkey(id, username, avatar_url)
      `)
            .single();

        if (error) throw error;
        return { ...data, stars: [] };
    },

    // Dar o quitar estrella a un eco
    toggleStar: async (echoId, isStarred) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión.');

        if (isStarred) {
            // Quitar estrella
            const { error } = await supabase
                .from('space_echo_stars')
                .delete()
                .eq('echo_id', echoId)
                .eq('user_id', user.id);
            if (error) throw error;
            return false;
        } else {
            // Dar estrella
            const { error } = await supabase
                .from('space_echo_stars')
                .insert({ echo_id: echoId, user_id: user.id });
            if (error) throw error;
            return true;
        }
    },

    // Eliminar eco
    deleteEcho: async (echoId) => {
        const { error } = await supabase
            .from('space_echoes')
            .delete()
            .eq('id', echoId);
        if (error) throw error;
    },

    // Fijar/Desfijar eco
    togglePinEcho: async (echoId, isPinned) => {
        const { data, error } = await supabase
            .from('space_echoes')
            .update({ is_pinned: !isPinned })
            .eq('id', echoId)
            .select()
            .single();
        if (error) throw error;
        return data.is_pinned;
    }
};
