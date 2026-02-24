import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';

export function useSeason() {
    const { user } = useAuthContext();
    const [season, setSeason] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function fetchSeason() {
            if (!user) return;
            try {
                const { data, error } = await supabase.rpc('get_season_status', { p_user_id: user.id });
                if (error) throw error;
                if (active) setSeason(data);
            } catch (err) {
                console.error('Error fetching season:', err);
            } finally {
                if (active) setLoading(false);
            }
        }

        fetchSeason();

        // Configura un intervalo sutil cada 30 segundos usando visibilidad de pestaña para sincronismo pasivo
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchSeason();
        }, 30000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [user]);

    /**
     * Obtiene la recompensa estacional asegurizando toda la lógica del lado del backend.
     * La app React solo solicita "x" monedas base, y el backend aplica: multiplicadores, límite diario, fase final, etc.
     */
    const claimSeasonReward = async (baseCoins) => {
        if (!user) return null;
        try {
            const { data, error } = await supabase.rpc('award_competitive_coins', {
                p_user_id: user.id,
                p_base_coins: baseCoins
            });
            if (error) throw error;
            // 'data' contiene la metadata del backend: multiplicadores aplicados, cap_hit, etc.
            return data;
        } catch (err) {
            console.error('Error claiming season reward:', err);
            return null;
        }
    };

    return { season, loading, claimSeasonReward };
}
