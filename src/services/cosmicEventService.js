import { supabase } from '../supabaseClient';
import { cosmicEventsService } from './cosmicEventsService';

/**
 * cosmicEventService.js (Singular - Legacy Proxy)
 * Mantiene compatibilidad mientras migramos a cosmicEventsService.js (Plural)
 */
export const cosmicEventService = {

    /**
     * Registra un evento de actividad de usuario (Solo Feed)
     */
    async register({ userId, eventType, rarity, title, description, icon = '✨', metadata = {} }) {
        // Solo actividades destacadas van al feed
        if (!['epic', 'legendary', 'mythic'].includes(rarity)) return null;

        return cosmicEventsService.logActivity(userId, eventType, {
            rarity,
            title,
            description,
            icon,
            ...metadata
        });
    },

    /**
     * Registrar apertura de cofre con personaje épico+
     */
    async registerChestOpen({ userId, username, chestTitle, characterName, rarity }) {
        const icons = { epic: '💎', legendary: '🏆', mythic: '🌌' };
        const rarityLabel = { epic: 'Épico', legendary: 'Legendario', mythic: 'Mítico' }[rarity] || rarity;

        return this.register({
            userId,
            eventType: 'legendary_purchase', // Mapeado a feed_activity
            rarity,
            title: `${username} abrió un ${chestTitle}`,
            description: `y descubrió a ${characterName} (${rarityLabel})`,
            icon: icons[rarity] || '✨',
            metadata: { chest_title: chestTitle, character_name: characterName, rarity },
        });
    },

    /**
     * Registrar desbloqueo de cosmético raro
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
            eventType: 'cosmetic_unlock',
            rarity,
            title: `${username} desbloqueó ${categoryLabel} "${itemTitle}"`,
            description: `Un cosmético de categoría ${rarityLabel} ahora brilla en el universo`,
            icon: icons[rarity] || '✨',
            metadata: { item_title: itemTitle, item_category: itemCategory, rarity },
        });
    },

    /**
     * Obtiene los últimos eventos cósmicos y actividades para el feed
     */
    async getRecentEvents(limit = 20) {
        return cosmicEventsService.getUniverseEvents(limit);
    },
};
