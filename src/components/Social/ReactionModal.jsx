import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REACTION_CONFIG = {
    connection: { icon: '💖', label: 'Conexión' },
    impact: { icon: '🔥', label: 'Impacto' },
    represent: { icon: '🌙', label: 'Representa' },
    think: { icon: '🧠', label: 'Interesante' },
    underrated: { icon: '🪐', label: 'Infravalorado' }
};

const ReactionModal = memo(({ isOpen, onClose, postId, title = "Reacciones" }) => {
    const [reactions, setReactions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (isOpen && postId) {
            import('../../services/activityService').then(({ activityService }) => {
                setLoading(true);
                activityService.getPostReactions(postId)
                    .then(data => setReactions(data))
                    .catch(err => console.error(err))
                    .finally(() => setLoading(false));
            });
        }
    }, [isOpen, postId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-sm bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 hover:text-rose-400 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                            </div>
                        ) : reactions.length === 0 ? (
                            <div className="p-8 text-center text-[10px] text-white/40 uppercase tracking-widest">
                                Sin interacciones
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {reactions.map((react, idx) => (
                                    <div key={`${react.user?.id}-${idx}`} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={react.user?.avatar_url || '/default_user_blank.png'}
                                                alt="Avatar"
                                                className="w-10 h-10 rounded-xl object-cover border border-white/10"
                                            />
                                            <span className="text-sm font-bold text-white/80">{react.user?.username}</span>
                                        </div>
                                        <div className="text-2xl" title={REACTION_CONFIG[react.reaction_type]?.label}>
                                            {REACTION_CONFIG[react.reaction_type]?.icon}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
});

export default ReactionModal;
