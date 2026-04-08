import { supabase } from '../supabaseClient';

export const AURA_TYPES = {
    SUPERNOVA: { id: 'supernova', label: 'Modo Supernova', cost: 50000, duration: 1, glow: '#ffcc33', effect: 'radial-pulse' },
    NEBULA: { id: 'nebula', label: 'Aura de Nebulosa', cost: 150000, duration: 6, glow: '#ff00ff', effect: 'cloud-vortex' },
    VOID: { id: 'void', label: 'Vacío Primordial', cost: 500000, duration: 24, glow: '#8855ff', effect: 'shadow-drift' }
};

export const auraService = {
    /**
     * Activa un aura consumiendo Starlys.
     */
    async activateAura(userId, auraType) {
        const aura = AURA_TYPES[auraType.toUpperCase()];
        if (!aura) throw new Error('Tipo de aura no válido');

        const { data, error } = await supabase.rpc('activate_user_aura', {
            p_user_id: userId,
            p_aura_type: aura.id,
            p_cost: aura.cost,
            p_duration_hours: aura.duration
        });

        if (error) throw error;
        return data; // { success, aura_type, expires_at, new_balance }
    },

    /**
     * Obtiene el aura activa (cronometrada) de un usuario.
     */
    async getActiveAura(userId) {
        if (!userId) return null;
        try {
            const { data, error } = await supabase
                .from('user_auras')
                .select('*')
                .eq('user_id', userId)
                .limit(1);

            if (error) {
                // Silently fail if table doesn't exist yet or 406 error
                return null;
            }

            const active = data?.[0];
            if (active && new Date(active.expires_at) > new Date()) {
                return active;
            }
        } catch (e) {
            return null;
        }
        return null;
    },
    async getAura(userId) {
        if (!userId) return [];

        try {
            // Get profile stats
            const { data: profile } = await supabase
                .from('profiles')
                .select('level, balance')
                .eq('id', userId)
                .single();

            const { count: echoCount } = await supabase
                .from('space_echoes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            const allTraits = [
                { id: 'calmado', label: 'Calmado', icon: '🌙', colorClass: 'from-blue-500 via-blue-800', textColor: 'text-blue-300', bgClass: 'bg-blue-500/10 border-blue-500/20' },
                { id: 'creativo', label: 'Creativo', icon: '✨', colorClass: 'from-violet-500 via-violet-800', textColor: 'text-violet-300', bgClass: 'bg-violet-500/10 border-violet-500/20' },
                { id: 'profundo', label: 'Profundo', icon: '🌌', colorClass: 'from-indigo-500 via-indigo-800', textColor: 'text-indigo-300', bgClass: 'bg-indigo-500/10 border-indigo-500/20' },
                { id: 'curioso', label: 'Curioso', icon: '⭐', colorClass: 'from-amber-400 via-amber-700', textColor: 'text-amber-300', bgClass: 'bg-amber-500/10 border-amber-500/20' },
                { id: 'intenso', label: 'Intenso', icon: '🔥', colorClass: 'from-rose-500 via-rose-800', textColor: 'text-rose-300', bgClass: 'bg-rose-500/10 border-rose-500/20' },
                { id: 'reflexivo', label: 'Reflexivo', icon: '🪐', colorClass: 'from-purple-500 via-purple-800', textColor: 'text-purple-300', bgClass: 'bg-purple-500/10 border-purple-500/20' },
                { id: 'aventurero', label: 'Aventurero', icon: '☄️', colorClass: 'from-orange-500 via-orange-800', textColor: 'text-orange-300', bgClass: 'bg-orange-500/10 border-orange-500/20' },
                { id: 'inspirador', label: 'Inspirador', icon: '🌠', colorClass: 'from-fuchsia-500 via-fuchsia-800', textColor: 'text-fuchsia-300', bgClass: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
            ];

            // Deterministic random
            let seed = (profile?.level || 1) + (profile?.balance || 0) + (echoCount || 0);
            for (let i = 0; i < userId.length; i++) {
                seed += userId.charCodeAt(i);
            }

            // Shuffle array using seed
            const shuffled = [...allTraits].sort((a, b) => {
                const hashA = (seed * a.label.charCodeAt(0)) % 100;
                const hashB = (seed * b.label.charCodeAt(0)) % 100;
                return Math.random() > 0.5 ? hashA - hashB : hashB - hashA; // Add pseudo randomness for variety on page load
            });

            // Return 3 or 4 traits
            const traitCount = (seed % 2 === 0) ? 4 : 3;
            return shuffled.slice(0, traitCount);

        } catch (error) {
            console.error('Error fetching aura:', error);
            return [];
        }
    }
};
