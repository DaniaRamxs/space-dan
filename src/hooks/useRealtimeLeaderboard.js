import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { getLeaderboard, getUserRankInGame } from '../services/supabaseScores';
import { useAuthContext } from '../contexts/AuthContext';

export function useRealtimeLeaderboard(gameId, limit = 50) {
    const { user } = useAuthContext();
    const [leaderboard, setLeaderboard] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [ptsToNext, setPtsToNext] = useState(null);
    const [rankDrop, setRankDrop] = useState(false);
    const [loading, setLoading] = useState(true);

    const prevRankRef = useRef(null);
    const fetchTimeoutRef = useRef(null);

    const fetchBoard = useCallback(async () => {
        if (!gameId) return;
        try {
            const data = await getLeaderboard(gameId, limit);

            if (user) {
                const rData = await getUserRankInGame(user.id, gameId);

                // Si la posición empeoró (número mayor) 
                if (prevRankRef.current && rData && rData.user_position > prevRankRef.current.user_position) {
                    setRankDrop(true);
                    setTimeout(() => setRankDrop(false), 2000);
                }

                // Calcular ptsToNext
                if (rData && data && data.length > 0) {
                    // Si el usuario es el #1, no necesita pts 
                    if (rData.user_position === 1) {
                        setPtsToNext(0);
                    } else {
                        // Buscar la persona justo por encima (posición - 1)
                        // Como los arrays son 0-index, rank 2 está en index 0
                        const targetRankIndex = rData.user_position - 2;
                        if (targetRankIndex >= 0 && targetRankIndex < data.length) {
                            const nextScore = data[targetRankIndex].best_score;
                            const diff = nextScore - rData.max_score + 1; // +1 para superarlo
                            setPtsToNext(diff > 0 ? diff : 1);
                        } else {
                            // Si el de arriba no está en nuestro top (ej: user es #100, y limit es 50)
                            setPtsToNext(null);
                        }
                    }
                }

                prevRankRef.current = rData;
                setUserRank(rData);
            }
            // Mover esto abajo previene desincronización
            setLeaderboard(data || []);
        } catch (e) {
            console.error('Error fetching realtime board', e);
        }
    }, [gameId, user, limit]);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            setLoading(true);
            await fetchBoard();
            if (mounted) setLoading(false);
        };
        init();
        return () => { mounted = false; };
    }, [fetchBoard]);

    useEffect(() => {
        if (!gameId) return;

        // Suscripción Realtime solo al game actual
        const channel = supabase.channel(`realtime:scores:${gameId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `game_id=eq.${gameId}` }, (payload) => {
                // Debounce simple para no inundar el servidor en juegos masivos
                clearTimeout(fetchTimeoutRef.current);
                fetchTimeoutRef.current = setTimeout(() => {
                    fetchBoard();
                }, 1000);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            clearTimeout(fetchTimeoutRef.current);
        };
    }, [gameId, fetchBoard]);

    return { leaderboard, userRank, ptsToNext, rankDrop, loading };
}
