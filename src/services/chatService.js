
import { supabase } from '../supabaseClient';

export const chatService = {
    async sendMessage(content, isVip = false) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para chatear.');

        const { data, error } = await supabase
            .from('global_chat')
            .insert({
                user_id: user.id,
                content: content,
                is_vip: isVip
            })
            .select('id, content, created_at, user_id, is_vip')
            .single();

        if (error) throw error;
        return data;
    },

    async getRecentMessages(limit = 50) {
        // 1. Obtener mensajes básicos
        const { data: messages, error: msgError } = await supabase
            .from('global_chat')
            .select('id, content, created_at, user_id, is_vip')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (msgError) throw msgError;
        if (!messages || messages.length === 0) return [];

        // 2. Enriquecer (Con Joins para roles)
        const userIds = [...new Set(messages.map(m => m.user_id))].filter(id => id && id.length > 10);

        if (userIds.length > 0) {
            const { data: profiles, error: profError } = await supabase
                .from('profiles')
                .select(`
                    *,
                    primary_role_item:equipped_primary_role(id, title, metadata)
                `)
                .in('id', userIds);

            if (!profError && profiles) {
                const enriched = messages.map(m => ({
                    ...m,
                    author: profiles.find(p => p.id === m.user_id) || { username: 'Viajero' }
                }));
                return enriched.reverse();
            }
        }

        return messages.reverse();
    }
};
