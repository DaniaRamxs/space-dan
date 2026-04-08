import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cosmicEventsService } from '../../services/cosmicEventsService';
import { Link } from 'react-router-dom';

export function ConstellationsBlock({ userId }) {
    const [constellations, setConstellations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState(new Set());

    useEffect(() => {
        if (!userId) return;
        load();
    }, [userId]);

    async function load() {
        setLoading(true);
        const data = await cosmicEventsService.getUserConstellations(userId);
        setConstellations(data || []);
        setLoading(false);
    }

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    if (loading) return null;
    if (constellations.length === 0) return null;

    return (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 p-5 space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Constelaciones</p>
            </div>

            <div className="space-y-3">
                {constellations.map(c => {
                    const isExpanded = expandedIds.has(c.id);
                    return (
                        <div key={c.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all">
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => toggleExpand(c.id)}
                            >
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black text-white">{c.name}</h4>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest">
                                        {c.members.length} exploradores conectados
                                    </p>
                                </div>
                                <span className="text-white/20 text-xs transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    ▼
                                </span>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-4 mt-3 border-t border-white/5">
                                            {c.description && <p className="text-xs text-white/50 italic mb-4">"{c.description}"</p>}
                                            <div className="flex flex-wrap gap-2">
                                                {c.members.map(m => (
                                                    <Link
                                                        key={m.id}
                                                        to={`/@${m.username}`}
                                                        className="group flex flex-col items-center gap-1"
                                                    >
                                                        <div className="relative">
                                                            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <img
                                                                src={m.avatar_url || '/default_user_blank.png'}
                                                                alt={m.username}
                                                                className="w-8 h-8 rounded-full border border-white/10 relative z-10"
                                                            />
                                                        </div>
                                                        <span className="text-[8px] font-bold text-white/50 group-hover:text-indigo-300">@{m.username}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
