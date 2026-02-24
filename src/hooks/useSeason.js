import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';

export function useSeason() {
    const { user } = useAuthContext();
    const [season, setSeason] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSeason = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase.rpc('get_season_status', { p_user_id: user.id });
            if (error) throw error;
            setSeason(data);
        } catch (err) {
            console.error('Error fetching season:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSeason();

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchSeason();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchSeason]);

    /** Reclama recompensa y refresca el estado local */
    const claimSeasonReward = async (baseCoins) => {
        if (!user) return null;
        try {
            const { data, error } = await supabase.rpc('award_competitive_coins', {
                p_user_id: user.id,
                p_base_coins: baseCoins
            });
            if (error) throw error;

            // Refrescamos inmediatamente para ver el cambio en Daily Capacity
            await fetchSeason();
            return data;
        } catch (err) {
            console.error('Error claiming season reward:', err);
            return null;
        }
    };

    return { season, loading, claimSeasonReward, refreshSeason: fetchSeason };
}
