import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { affinityService } from '../../services/affinityService';
import StellarConstellation from '../Social/StellarConstellation';

export function AffinityMapBlock({ userId, ownerAvatar }) {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        affinityService.getUserConstellation(userId)
            .then(data => setFriends(data || []))
            .catch(err => console.error('Error loading constellation:', err))
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] h-64 animate-pulse" />
    );

    return (
        <div className="rounded-2xl bg-black/40 border border-white/5 p-6 overflow-hidden relative group">
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Vínculos Estelares</p>
                    <h3 className="text-sm font-black text-white italic uppercase tracking-tight">Mapa de Afinidad</h3>
                </div>
                {friends.length > 0 && (
                    <span className="text-[9px] font-bold text-cyan-400 opacity-40 uppercase tracking-widest">
                        {friends.length} Estrellas en órbita
                    </span>
                )}
            </div>

            <StellarConstellation
                ownerId={userId}
                friends={friends}
                ownerAvatar={ownerAvatar}
            />

            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="text-6xl text-white">🌌</span>
            </div>
        </div>
    );
}
