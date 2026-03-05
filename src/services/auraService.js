import { supabase } from '../supabaseClient';

export const auraService = {
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
