import { supabase } from '../supabaseClient';

export const signalsService = {
    // Rastrear la visita a un perfil
    trackVisit: async (viewerId, targetId) => {
        if (!viewerId || !targetId || viewerId === targetId) return;
        try {
            await supabase.rpc('track_profile_visit', {
                viewer: viewerId,
                target: targetId
            });
        } catch (e) {
            console.error('Error tracking visit:', e);
        }
    },

    // Obtener las señales de un usuario (para desplegarlas en su pantalla)
    getMySignals: async (userId) => {
        const { data, error } = await supabase
            .from('space_mystery_signals')
            .select(`
                id, visit_count, signal_status, unlocked_clues, created_at,
                visitor:profiles!space_mystery_signals_visitor_id_fkey(id, username, created_at)
            `)
            .eq('receiver_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching signals:', error);
            return [];
        }
        return data || [];
    },

    // Desencriptar / revelar pista
    unlockClue: async (signalId, clueIndex, clueText) => {
        // Obtenemos la señal actual usando maybeSingle para asegurar que la tenemos
        const { data: signal, error: fetchErr } = await supabase
            .from('space_mystery_signals')
            .select('unlocked_clues, signal_status')
            .eq('id', signalId)
            .maybeSingle();

        if (fetchErr || !signal) throw fetchErr || new Error('Signal not found');

        let clues = signal.unlocked_clues || [];
        if (!clues.includes(clueText)) {
            clues.push(clueText);
        }

        // Definir nuevo estatus
        let newStatus = 'decrypting';
        if (clues.length >= 3) newStatus = 'fully_decrypted';

        const { data, error } = await supabase
            .from('space_mystery_signals')
            .update({
                unlocked_clues: clues,
                signal_status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', signalId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
