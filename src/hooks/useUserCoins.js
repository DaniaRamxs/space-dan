import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para obtener y mantener sincronizado el balance de monedas (coins)
 * de CUALQUIER usuario en tiempo real.
 * 
 * Útil para tarjetas de perfil, leaderboards, etc.
 * 
 * @param {string} userId - ID del usuario a consultar
 * @param {number} initialBalance - Balance inicial (opcional, para UI optimista)
 * @returns {number | null} Balance actualizado
 */
export function useUserCoins(userId, initialBalance = null) {
    const [balance, setBalance] = useState(initialBalance);

    useEffect(() => {
        if (!userId) return;

        let channel = null;

        async function fetchInitialBalance() {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('balance')
                    .eq('id', userId)
                    .single();

                if (!error && data && data.balance !== undefined) {
                    setBalance(data.balance);
                }
            } catch (err) {
                console.error('[useUserCoins] Error fetching initial balance:', err);
            }
        }

        // 1. Fetch inicial
        fetchInitialBalance();

        // 2. Suscribirse a cambios en tiempo real
        channel = supabase.channel(`public:profiles:id=eq.${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    if (payload.new && payload.new.balance !== undefined) {
                        setBalance(payload.new.balance);
                    }
                }
            )
            .subscribe();

        // 3. Cleanup para evitar memory leaks
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [userId]);

    return balance;
}
