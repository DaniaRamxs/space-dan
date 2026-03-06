import { supabase } from '../supabaseClient';

/**
 * cosmicEventService.js
 * Registra eventos del sistema (apertura de cofres, cosméticos raros, etc.)
 * en la tabla cosmic_events para que aparezcan en el Global Feed.
 */
export const cosmicEventService = {

    /**
     * Registra un evento cósmico (con anti-spam de 10 min por usuario).
     * Solo acepta rarity: 'epic' | 'legendary' | 'mythic'
     */
    async register({ userId, eventType, rarity, title, description, icon = '✨', metadata = {} }) {
        // Filtrar eventos comunes antes de llamar al backend
        if (!['epic', 'legendary', 'mythic'].includes(rarity)) return null;

        const { data, error } = await supabase.rpc('register_cosmic_event', {
            p_user_id: userId,
            p_event_type: eventType,
            p_rarity: rarity,
            p_title: title,
            p_description: description,
            p_icon: icon,
            p_metadata: metadata,
        });

        if (error) {
            console.warn('[cosmicEventService] register error:', error.message);
            return null;
        }
        return data;
    },

    /**
     * Registrar apertura de cofre con personaje épico+
     */
    async registerChestOpen({ userId, username, chestTitle, characterName, rarity }) {
        const icons = { epic: '💎', legendary: '🏆', mythic: '🌌' };
        const rarityLabel = { epic: 'Épico', legendary: 'Legendario', mythic: 'Mítico' }[rarity] || rarity;

        return this.register({
            userId,
            eventType: 'chest_open',
            rarity,
            title: `${username} abrió un ${chestTitle}`,
            description: `y descubrió a ${characterName} (${rarityLabel})`,
            icon: icons[rarity] || '✨',
            metadata: { chest_title: chestTitle, character_name: characterName, rarity },
        });
    },

    /**
     * Registrar desbloqueo de cosmético raro (marco, efecto de chat, etc.)
     */
    async registerCosmeticUnlock({ userId, username, itemTitle, itemCategory, rarity }) {
        const categoryLabel = {
            frame: 'el marco',
            chat_effect: 'el efecto de chat',
            chat_badge: 'la insignia',
            holocard: 'la holocard',
            nickname_style: 'el estilo de nickname',
        }[itemCategory] || 'el cosmético';

        const icons = { epic: '💠', legendary: '👑', mythic: '🌠' };
        const rarityLabel = { epic: 'Épico', legendary: 'Legendario', mythic: 'Mítico' }[rarity] || rarity;

        return this.register({
            userId,
            eventType: 'cosmetic_rare',
            rarity,
            title: `${username} desbloqueó ${categoryLabel} "${itemTitle}"`,
            description: `Un cosmético de categoría ${rarityLabel} ahora brilla en el universo`,
            icon: icons[rarity] || '✨',
            metadata: { item_title: itemTitle, item_category: itemCategory, rarity },
        });
    },

    /**
     * Registrar colección completada
     */
    async registerCollectionComplete({ userId, username, collectionName }) {
        return this.register({
            userId,
            eventType: 'collection_complete',
            rarity: 'legendary',
            title: `${username} completó la colección "${collectionName}"`,
            description: 'Todos los personajes de la serie han sido descubiertos',
            icon: '🎖️',
            metadata: { collection_name: collectionName },
        });
    },

    /**
     * Obtiene los últimos eventos cósmicos (últimas 24h)
     * para integrar en el feed
     */
    async getRecentEvents(limit = 20) {
        const { data, error } = await supabase
            .from('cosmic_events')
            .select(`
                *,
                author:profiles(id, username, avatar_url, equipped_nickname_style)
            `)
            .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.warn('[cosmicEventService] getRecentEvents error:', error.message);
            return [];
        }
        return (data || []).map(e => ({ ...e, kind: 'cosmic_event' }));
    },
};
