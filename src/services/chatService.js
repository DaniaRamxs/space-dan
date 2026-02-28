
import { supabase } from '../supabaseClient';

export const chatService = {
    async sendMessage(content, isVip = false, replyToId = null, channelId = 'global') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para chatear.');

        if (!content.trim()) return null;

        const { data, error } = await supabase
            .from('global_chat')
            .insert({
                user_id: user.id,
                content: content,
                is_vip: isVip,
                reply_to_id: replyToId,
                channel_id: channelId
            })
            .select('id, content, created_at, user_id, is_vip, reply_to_id, channel_id')
            .single();

        if (error) throw error;
        return data;
    },

    async sendBotMessage(content, channelId = 'global', botId = '00000000-0000-0000-0000-000000000bb1') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión.');

        const { data, error } = await supabase
            .from('global_chat')
            .insert({
                user_id: user.id,
                content: `[HYPERBOT_MSG]:${content}`,
                is_vip: false,
                reply_to_id: null,
                channel_id: channelId
            })
            .select('id, content, created_at, user_id, is_vip, reply_to_id, channel_id')
            .single();

        if (error) throw error;
        return data;
    },

    async getRecentMessages(limit = 50, channelId = 'global') {
        // 1. Obtener mensajes básicos filtrados por canal
        const { data: messages, error: msgError } = await supabase
            .from('global_chat')
            .select('id, content, created_at, user_id, is_vip, reply_to_id, channel_id')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (msgError) throw msgError;
        if (!messages || messages.length === 0) return [];

        // 2. Enriquecer (Con Joins para roles si es posible)
        const userIds = [...new Set(messages.map(m => m.user_id))].filter(id => id && id.length > 10);

        if (userIds.length > 0) {
            const { data: profiles, error: profError } = await supabase
                .from('profiles')
                .select(`
                    id, username, avatar_url, equipped_nickname_style,
                    primary_role_item:equipped_primary_role(id, title, metadata)
                `)
                .in('id', userIds);

            if (!profError && profiles) {
                const enriched = messages.map(m => {
                    let author = profiles.find(p => p.id === m.user_id) || { username: 'Viajero', id: m.user_id };
                    let content = m.content;

                    if (content.startsWith('[HYPERBOT_MSG]:')) {
                        content = content.replace('[HYPERBOT_MSG]:', '');
                        author = {
                            id: '00000000-0000-0000-0000-000000000bb1',
                            username: 'HyperBot',
                            avatar_url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=HyperBot&backgroundColor=b6e3f4',
                            nickname_style: 'hyperbot',
                            level: 999
                        };
                    }

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
                        user_id: author.id,
                        content,
                        author,
                        reply
                    };
                });
                return enriched.reverse();
            }
        }

        return messages.reverse();
    },

    async clearChannel(channelId) {
        const { error } = await supabase.rpc('clear_channel_messages', { p_channel_id: channelId });
        if (error) throw error;
        return true;
    },

    async getProfileByUsername(username) {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                primary_role_item:equipped_primary_role(id, title, metadata),
                nick_style_item:equipped_nickname_style(id, metadata)
            `)
            .ilike('username', username)
            .maybeSingle();
        if (error) throw error;
        return data;
    }
};
