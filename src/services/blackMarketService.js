/**
 * blackMarketService.js — Servicio para la economía clandestina de Spacely.
 */
import { supabase } from '../supabaseClient';

export const blackMarketService = {
    /** Genera ofertas dinámicas para el usuario */
    async getOffers(userId) {
        const { data, error } = await supabase.rpc('get_black_market_offers', { p_user_id: userId });
        if (error) throw error;
        return data;
    },

    /** Ejecuta una transacción con riesgo */
    async executeTrade(userId, offer) {
        const { data, error } = await supabase.rpc('execute_black_market_trade', {
            p_user_id: userId,
            p_type: offer.type,
            p_merchant: offer.merchant,
            p_cost: parseInt(offer.cost),
            p_reward: parseInt(offer.reward),
            p_risk_factor: offer.risk
        });
        if (error) throw error;
        return data;
    },

    /** Obtiene el ranking de contrabandistas */
    async getLeaderboard(limit = 10) {
        const { data, error } = await supabase.rpc('get_clandestine_leaderboard', { p_limit: limit });
        if (error) throw error;
        return data;
    },

    /** Verifica si el mercado negro "aparece" mediante un evento aleatorio o condición */
    checkAccessEligibility(profile) {
        // Aparece por azar (5%) o si el usuario tiene deuda/pacto estelar activo
        const randomness = Math.random() < 0.05;
        const inTrouble = profile?.stellar_pact_active || (profile?.balance < 500);

        return randomness || inTrouble;
    }
};
