import { supabase } from '../supabaseClient';

export const missionService = {
    /** 
     * Asigna o recupera las misiones del día para el usuario.
     * Retorna una lista enriquecida con los templates (iconos, recompensas).
     */
    async getDailyMissions() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // 1. Llamar al RPC que gestiona la asignación
        const { data: assigned, error } = await supabase.rpc('get_or_assign_daily_missions', {
            p_user_id: user.id
        });

        if (error) {
            console.error('[missionService] getDailyMissions error:', error);
            return [];
        }

        // 2. Enriquecer con los templates (unificamos en el frontend o con un join si el RPC lo hiciera)
        // Por simplicidad, el RPC ya nos da los IDs, pero necesitamos los textos.
        const templateIds = assigned.map(m => m.template_id);
        const { data: templates } = await supabase
            .from('mission_templates')
            .select('*')
            .in('id', templateIds);

        // Mezclar
        return assigned.map(m => ({
            ...m,
            template: templates?.find(t => t.id === m.template_id) || {}
        }));
    },

    /**
     * Reclama la recompensa de una misión.
     */
    async claimReward(missionId) {
        const { data, error } = await supabase.rpc('claim_mission_reward', {
            p_mission_id: missionId
        });

        if (error) throw error;
        return data; // { success, starlys, xp }
    },

    /**
     * Actualiza el progreso de una misión específica si el tipo coincide.
     * p_type: 'social' | 'gaming' | 'productivity' | 'exploration'
     * p_template_id: opcional (ej: 'msg_5')
     */
    async updateProgress(type, amount = 1, templateId = null) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscamos misiones activas de hoy de ese tipo
        let query = supabase
            .from('user_missions')
            .select('id, progress, is_completed, template:template_id(target_value, category)')
            .eq('user_id', user.id)
            .eq('is_completed', false)
            .gte('assigned_at', (new Date()).toISOString().split('T')[0]);

        const { data: active } = await query;
        if (!active) return;

        for (const m of active) {
            // Si el template coincide o el tipo coincide
            if (m.id === templateId || m.template.category === type) {
                const newProgress = m.progress + amount;
                const isCompleted = newProgress >= m.template.target_value;

                await supabase
                    .from('user_missions')
                    .update({
                        progress: newProgress,
                        is_completed: isCompleted
                    })
                    .eq('id', m.id);
            }
        }
    }
};
