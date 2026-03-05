import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { profileSocialService } from '../../services/profile_social';

const ConnectionChip = ({ user, category }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.98 }}
            className="group relative"
        >
            <Link
                to={`/@${user.username}`}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-[20px] bg-white/[0.06] border border-white/[0.08] backdrop-blur-md transition-all duration-300"
            >
                <div className="relative shrink-0">
                    {/* Soft Halo */}
                    <div className="absolute -inset-1.5 bg-cyan-400/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/10">
                        <img
                            src={user.avatar_url || '/default_user_blank.png'}
                            alt={user.username}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors truncate max-w-[100px]">
                    {user.username}
                </span>
            </Link>
        </motion.div>
    );
};

export const ConnectionsSection = ({ userId, followCounts }) => {
    const [connections, setConnections] = useState({
        closest: [],
        frequent: [],
        recent: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch followers and following
                const [followers, following] = await Promise.all([
                    profileSocialService.getFollowers(userId),
                    profileSocialService.getFollowing(userId)
                ]);

                // Sort/Categorize logic
                // Closest: Mutual follows
                const followingIds = new Set(following.map(u => u.id));
                const mutuals = followers.filter(f => followingIds.has(f.id));
                const onlyFollowers = followers.filter(f => !followingIds.has(f.id));
                const onlyFollowing = following.filter(f => !followers.some(fol => fol.id === f.id));

                setConnections({
                    closest: mutuals.slice(0, 6),
                    frequent: onlyFollowing.slice(0, 6),
                    recent: onlyFollowers.slice(0, 6)
                });
            } catch (err) {
                console.error('Error loading connections:', err);
            } finally {
                setLoading(false);
            }
        };

        if (userId) load();
    }, [userId]);

    if (loading) return null;

    const totalStars = (followCounts?.followers || 0);
    const hasAny = connections.closest.length > 0 || connections.frequent.length > 0 || connections.recent.length > 0;

    if (!hasAny) return null;

    return (
        <section className="space-y-12">
            <div className="text-center space-y-2">
                <h2 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center justify-center gap-3">
                    <span className="opacity-40">🌌</span> Conexiones
                </h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    Personas que orbitan este universo
                </p>
                {totalStars > 5 && (
                    <p className="text-[9px] font-black text-cyan-400/40 uppercase tracking-tighter pt-1">
                        "{totalStars} estrellas orbitan este universo"
                    </p>
                )}
            </div>

            <div className="space-y-10">
                {/* Categoría: En órbita cercana (Mutuals) */}
                {connections.closest.length > 0 && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 px-4">
                            <span className="text-xs">⭐</span>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">En órbita cercana</p>
                            <div className="h-px bg-white/[0.03] flex-1" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-2">
                            {connections.closest.map(user => (
                                <ConnectionChip key={user.id} user={user} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Categoría: Exploradores frecuentes (Following) */}
                {connections.frequent.length > 0 && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 px-4">
                            <span className="text-xs">🌠</span>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Exploradores frecuentes</p>
                            <div className="h-px bg-white/[0.03] flex-1" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-2">
                            {connections.frequent.map(user => (
                                <ConnectionChip key={user.id} user={user} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Categoría: Visitantes recientes (Followers) */}
                {connections.recent.length > 0 && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 px-4">
                            <span className="text-xs">✨</span>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Visitantes recientes</p>
                            <div className="h-px bg-white/[0.03] flex-1" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-2">
                            {connections.recent.map(user => (
                                <ConnectionChip key={user.id} user={user} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
