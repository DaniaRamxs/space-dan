import React, { useEffect, useState } from 'react';
import * as storeService from '../../services/store';

const RARITY_WEIGHT = {
    mythic: 5,
    legendary: 4,
    epic: 3,
    rare: 2,
    common: 1
};

export function FeaturedCharacters({ userId }) {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchFeatured() {
            try {
                const chars = await storeService.getUserCollectibles(userId);
                if (chars && chars.length > 0) {
                    const sorted = [...chars].sort((a, b) => RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity]);
                    setCharacters(sorted.slice(0, 4));
                }
            } catch (e) {
                console.error('Error fetching featured characters:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchFeatured();
    }, [userId]);

    if (loading) return (
        <div className="w-full h-32 bg-white/5 rounded-3xl animate-pulse" />
    );

    if (characters.length === 0) return null;

    return (
        <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-4 sm:p-6 space-y-4 transition-all hover:bg-white/[0.03]">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">Equipo Élite</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {characters.map((char) => (
                    <div key={char.id} className="relative group overflow-hidden rounded-2xl aspect-[3/4] border border-white/10 bg-[#0a0f16]">
                        {char.image_url ? (
                            <img src={char.image_url} alt={char.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-3xl">👤</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8 flex flex-col justify-end">
                            <span className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${char.rarity === 'mythic' ? 'text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]' : char.rarity === 'legendary' ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]' : char.rarity === 'epic' ? 'text-purple-400' : char.rarity === 'rare' ? 'text-cyan-400' : 'text-white/50'}`}>
                                {char.rarity}
                            </span>
                            <span className="text-[10px] font-black text-white uppercase tracking-tight truncate leading-tight">
                                {char.name}
                            </span>
                        </div>
                        {char.rarity === 'mythic' && <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(225,29,72,0.4)] rounded-2xl pointer-events-none" />}
                        {char.rarity === 'legendary' && <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(245,158,11,0.4)] rounded-2xl pointer-events-none" />}
                    </div>
                ))}
            </div>
        </div>
    );
}
