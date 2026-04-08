
import { supabase } from '../supabaseClient';

export const tycoonService = {
    /**
     * Comprueba el estado de magnate del usuario
     */
    async getTycoonStatus() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('galactic_tycoons')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('[tycoonService] Error fetching status:', error);
            return null;
        }

        return data;
    },

    /**
     * Se une a las Grandes Casas si cumple el requisito
     */
    async joinHouses() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false };

        const { data, error } = await supabase.rpc('join_great_houses', {
            p_user_id: user.id
        });

        if (error) throw error;
        return data;
    },

    /**
     * Inicia una inversión galáctica
     */
    async startInvestment(projectType, amount) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false };

        const { data, error } = await supabase.rpc('start_galactic_investment', {
            p_user_id: user.id,
            p_project_type: projectType,
            p_amount: amount
        });

        if (error) throw error;
        return data;
    },

    /**
     * Obtiene inversiones del usuario
     */
    async getInvestments() {
        // Primero procesar retornos pendientes
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.rpc('collect_investment_profits', { p_user_id: user.id });
        }

        const { data, error } = await supabase
            .from('galactic_investments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return [];
        return data;
    },

    /**
     * Obtiene el ranking de magnates
     */
    async getLeaderboard() {
        const { data, error } = await supabase
            .from('magnate_leaderboard')
            .select('*');

        if (error) {
            console.error('[tycoonService] Leaderboard error:', error);
            return [];
        }
        return data;
    },

    /**
     * Dispara una auditoría aleatoria (usar con precaución)
     */
    async triggerAudit() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase.rpc('trigger_random_audit', {
            p_user_id: user.id
        });

        if (error) throw error;
        return data;
    }
};
