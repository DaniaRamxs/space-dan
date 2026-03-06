import { supabase } from '../supabaseClient';

export const cosmicEventsService = {
    // Obtener evento cósmico activo
    getActiveEvent: async () => {
        const { data, error } = await supabase
            .from('cosmic_events')
            .select('*')
            .in('rarity', ['legendary', 'mythic'])  // solo eventos raros recientes
            .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching cosmic event:', error);
            return null;
        }
        return data || null;
    },

    getRecentCosmicEvents: async (limit = 10) => {
        const { data, error } = await supabase
            .from('cosmic_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent cosmic events:', error);
            return [];
        }
        return data || [];
    },

    // Incrementar interactividad entre usuarios para crear posibles constelaciones
    incrementBond: async (userA, userB, points = 1) => {
        if (!userA || !userB || userA === userB) return;
        try {
            await supabase.rpc('increment_user_bond', {
                u1: userA,
                u2: userB,
                points: points
            });
        } catch (e) {
            console.error('Error incrementing bond:', e);
        }
    },

    // Obtener las constelaciones de un usuario
    getUserConstellations: async (userId) => {
        const { data, error } = await supabase
            .from('space_constellation_members')
            .select(`
                constellation_id,
                joined_at,
                constellation:space_constellations (
                    id, name, description,
                    members:space_constellation_members (
                        user:profiles (id, username, avatar_url)
                    )
                )
            `)
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching constellations:', error);
            return [];
        }

        // Flatten data
        return data.map(row => ({
            id: row.constellation.id,
            name: row.constellation.name,
            description: row.constellation.description,
            members: row.constellation.members.map(m => m.user)
        }));
    }
};
