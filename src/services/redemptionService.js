
import { supabase } from '../supabaseClient';

export const redemptionService = {
    /**
     * Comprueba si el usuario puede jugar a los Juegos de Redención
     */
    async checkEligibility() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { eligible: false };

        const { data, error } = await supabase.rpc('check_redemption_eligibility', {
            p_user_id: user.id
        });

        if (error) {
            console.error('[redemptionService] Error checking eligibility:', error);
            return { eligible: false };
        }

        return data;
    },

    /**
     * Procesa el resultado de un juego de redención
     */
    async submitResult(result, gamesCompleted) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false };

        const { data, error } = await supabase.rpc('process_redemption_result', {
            p_user_id: user.id,
            p_result: result,
            p_games_completed: gamesCompleted
        });

        if (error) {
            console.error('[redemptionService] Error submitting result:', error);
            throw error;
        }

        return data;
    },

    /**
     * Obtiene el historial de redención del usuario
     */
    async getHistory() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('redemption_history')
            .select('*')
            .order('played_at', { ascending: false });

        if (error) {
            console.error('[redemptionService] Error fetching history:', error);
            return [];
        }

        return data;
    }
};
