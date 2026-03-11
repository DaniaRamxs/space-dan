import { supabase } from '../supabaseClient';

export const streakService = {
    /**
     * Llama al RPC de base de datos para registrar actividad real hoy.
     * Solo debe ser llamado al realizar acciones significativas (post, comment, like, etc.)
     */
    async trackActivity() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            await supabase.rpc('update_user_streak', { p_user_id: user.id });
        } catch (err) {
            console.error('[streakService] Error al actualizar racha:', err);
        }
    },

    /**
     * Obtiene el ranking de rachas
     */
    async getStreakLeaderboard(limit = 50) {
        const { data, error } = await supabase.rpc('get_streak_leaderboard', { p_limit: limit });
        if (error) throw error;
        return data || [];
    }
};
