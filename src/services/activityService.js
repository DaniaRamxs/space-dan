
import { supabase } from '../supabaseClient';

export const activityService = {
    async awardActivityXP(amount, source) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase.rpc('award_activity_xp', {
            p_user_id: user.id,
            p_amount: amount,
            p_source: source
        });

        if (error) {
            console.error('[activityService] awardActivityXP error:', error);
            return null;
        }
        return data; // { activity_xp, activity_level, level_up }
    }
};
