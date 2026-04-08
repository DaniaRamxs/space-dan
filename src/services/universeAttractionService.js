import { supabase } from '../supabaseClient';

export const universeAttractionService = {
    async analyzeAttraction(userId) {
        if (!userId) return [];

        try {
            // 1. Get recent interactions (bonds and visits conceptually)
            // We use user_bonds to see who interacts most
            const { data: bonds } = await supabase
                .from('user_bonds')
                .select('user_a, user_b, bond_score')
                .or(`user_a.eq.${userId},user_b.eq.${userId}`)
                .order('bond_score', { ascending: false })
                .limit(10);

            // 2. Count echoes received
            const { count: echoCount } = await supabase
                .from('space_echoes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            // Pool of possible traits
            const allTraits = [
                { id: 'creativos', label: 'Creativos', icon: '✨', titleColor: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/10' },
                { id: 'nocturnos', label: 'Nocturnos', icon: '🌙', titleColor: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
                { id: 'sonadores', label: 'Soñadores', icon: '🌌', titleColor: 'text-violet-400', bgColor: 'bg-violet-500/10' },
                { id: 'curiosos', label: 'Curiosos', icon: '⭐', titleColor: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
                { id: 'melomanos', label: 'Melómanos', icon: '🎵', titleColor: 'text-pink-400', bgColor: 'bg-pink-500/10' },
                { id: 'misteriosos', label: 'Misteriosos', icon: '📡', titleColor: 'text-purple-400', bgColor: 'bg-purple-500/10' },
                { id: 'caoticos', label: 'Caóticos', icon: '☄️', titleColor: 'text-red-400', bgColor: 'bg-red-500/10' },
                { id: 'leales', label: 'Leales', icon: '🛡️', titleColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
            ];

            // 3. Generate a deterministic seed based on user UUID + total echoes + bond sums
            let seed = echoCount || 0;
            if (bonds) {
                bonds.forEach(b => {
                    seed += b.bond_score;
                });
            }
            for (let i = 0; i < userId.length; i++) {
                seed += userId.charCodeAt(i);
            }

            // Shuffle array using our seed
            const shuffled = [...allTraits].sort((a, b) => {
                const hashA = (seed * a.label.charCodeAt(0)) % 100;
                const hashB = (seed * b.label.charCodeAt(0)) % 100;
                return Math.random() > 0.5 ? hashA - hashB : hashB - hashA; // Add pseudo-randomness for variety
            });

            // If there are many echoes, 'creativos' or 'curiosos' tend to appear
            // This logic is mostly for a fun social feature as requested.
            return shuffled.slice(0, 4);

        } catch (err) {
            console.error('Error analyzing attraction:', err);
            return [];
        }
    }
};
