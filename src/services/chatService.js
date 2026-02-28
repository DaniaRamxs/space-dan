
import { supabase } from '../supabaseClient';

export const chatService = {
    async sendMessage(content, isVip = false, replyToId = null) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para chatear.');

        const { data, error } = await supabase
            .from('global_chat')
            .insert({
                user_id: user.id,
                content: content,
                is_vip: isVip,
                reply_to_id: replyToId
            })
            .select('id, content, created_at, user_id, is_vip, reply_to_id')
            .single();

        if (error) throw error;
        return data;
    },

    async getRecentMessages(limit = 50) {
        // 1. Obtener mensajes básicos
        const { data: messages, error: msgError } = await supabase
            .from('global_chat')
            .select('id, content, created_at, user_id, is_vip, reply_to_id')
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
                const enriched = messages.map(m => {
                    const author = profiles.find(p => p.id === m.user_id) || { username: 'Viajero' };
                    let reply = null;
                    if (m.reply_to_id) {
                        const originalMsg = messages.find(om => om.id === m.reply_to_id);
                        if (originalMsg) {
                            const originalAuthor = profiles.find(p => p.id === originalMsg.user_id);
                            reply = {
                                content: originalMsg.content,
                                author: originalAuthor?.username || 'Anónimo'
                            };
                        }
                    }
                    return {
                        ...m,
                        author,
                        reply
                    };
                });
                return enriched.reverse();
            }
        }

        return messages.reverse();
    }
};
