import React, { useEffect, useState } from 'react';
import * as storeService from '../../services/store';

export function CollectionSection({ userId }) {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCollection() {
            try {
                const chars = await storeService.getUserCollectibles(userId);
                setCharacters(chars || []);
            } catch (e) {
                console.error('Error fetching collection:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchCollection();
    }, [userId]);

    if (loading) return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="aspect-square rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
                ))}
            </div>
        </div>
    );

    if (characters.length === 0) return null;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] italic mb-1">Universo de Aliados</span>
                    <span className="text-sm font-black text-white uppercase italic tracking-tighter">Colección de Personajes</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/20 via-transparent to-transparent" />
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{characters.length} Detectados</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {characters.map((char) => (
                    <div
                        key={char.id}
                        className="group relative flex flex-col items-center hover:-translate-y-1 transition-transform duration-300"
                    >
                        {/* Character Card */}
                        <div className={`
                            w-full aspect-[4/5] rounded-[2rem] bg-[#0a0a0f] border-2 overflow-hidden flex flex-col transition-all duration-500
                            ${char.rarity === 'legendary' ? 'border-amber-500/50 shadow-[0_10px_30px_-5px_rgba(245,158,11,0.2)]' :
                                char.rarity === 'epic' ? 'border-purple-500/50 shadow-[0_10px_30px_-5px_rgba(168,85,247,0.2)]' :
                                    'border-white/10'}
                        `}>
                            {/* Inner glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />

                            <div className="flex-1 overflow-hidden relative">
                                {char.image_url ? (
                                    <img src={char.image_url} alt={char.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f16]">
                                        <div className="text-3xl mb-2">👤</div>
                                        <div className="text-[10px] text-white/20 font-mono">SIN IMAGEN</div>
                                    </div>
                                )}
                            </div>

                            {/* Info footer */}
                            <div className="p-3 bg-black/40 backdrop-blur-md border-t border-white/5">
                                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5 truncate text-center">
                                    {char.rarity}
                                </p>
                                <p className="text-[10px] font-black text-white uppercase tracking-tight text-center truncate">
                                    {char.name}
                                </p>
                            </div>
                        </div>

                        {/* Hover Tooltip/Detail */}
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-10 translate-y-2 group-hover:translate-y-0">
                            <div className="bg-[#0f0f1a] border border-white/10 p-3 rounded-2xl shadow-2xl text-center">
                                <p className="text-[9px] text-white/60 leading-tight font-bold italic">
                                    {char.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
