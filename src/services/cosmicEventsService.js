import { supabase } from '../supabaseClient';

export const cosmicEventsService = {
    // 1. Obtener Evento Cósmico Global Activo (Para el Banner)
    // Filtra exclusivamente por type='cosmic_event' y que no haya expirado.
    getActiveEvent: async () => {
        const { data, error } = await supabase
            .from('universe_events')
            .select('*')
            .eq('type', 'cosmic_event')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[cosmicEventsService] getActiveEvent error:', error);
            return null;
        }

        if (data) {
            // Asegurar una estructura limpia para la UI con valores por defecto (Anti-Undefined)
            return {
                id: data.id,
                name: data.metadata?.name || data.event_name || 'Evento Cósmico',
                multiplier: data.metadata?.multiplier || 1.0,
                duration: data.metadata?.duration_minutes || 10,
                description: data.metadata?.description || 'Un evento altera el equilibrio del cosmos.',
                expires_at: data.expires_at,
                created_at: data.created_at,
                type: 'cosmic'
            };
        }
        return null;
    },

    // 2. Registrar Actividad del Usuario (Solo para el Feed)
    // No activa banner global ni notificaciones de sistema.
    logActivity: async (userId, eventName, metadata = {}) => {
        try {
            const { data, error } = await supabase.rpc('log_feed_activity', {
                p_user_id: userId,
                p_event_name: eventName,
                p_metadata: metadata
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('[cosmicEventsService] logActivity error:', e);
            return null;
        }
    },

    // 3. Crear Evento de Sistema (Opcionalmente disparado por Cron o Admin)
    triggerSystemEvent: async (name, multiplier = 1, duration = 10, desc = '') => {
        try {
            const { data, error } = await supabase.rpc('trigger_cosmic_event', {
                p_name: name,
                p_multiplier: multiplier,
                p_duration_minutes: duration,
                p_description: desc
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('[cosmicEventsService] triggerSystemEvent error:', e);
            return null;
        }
    },

    // Obtener historial de eventos (feed + cosmic)
    getUniverseEvents: async (limit = 20) => {
        const { data, error } = await supabase
            .from('universe_events')
            .select('*, profile:user_id(username, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[cosmicEventsService] getUniverseEvents error:', error);
            return [];
        }
        return data || [];
    },

    // 4. Scheduler (Simulado) — Revisa si es hora de lanzar un evento
    // Se puede llamar al entrar a la app para asegurar dinamismo.
    checkAutoEvent: async () => {
        // Podríamos consultar hace cuánto fue el último evento cósmico
        // Si fue hace más de 4 horas, invocar pg_cron o manualmente el rpc
        const { data: last } = await supabase
            .from('universe_events')
            .select('created_at')
            .eq('type', 'cosmic_event')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
        if (!last || new Date(last.created_at) < fourHoursAgo) {
            console.log('[cosmicEventsService] Ejecutando scheduler de eventos aleatorios...');
            await supabase.rpc('generate_random_cosmic_event');
        }
    },

    // Legacy Support (Bonds/Constellations - Keeping if needed)
    incrementBond: async (userA, userB, points = 1) => {
        if (!userA || !userB || userA === userB) return;
        try {
            await supabase.rpc('increment_user_bond', { u1: userA, u2: userB, points: points });
        } catch (e) { console.error('Error incrementing bond:', e); }
    }
};
