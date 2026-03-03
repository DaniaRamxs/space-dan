import { motion } from 'framer-motion';
import { getFrameStyle } from '../../utils/styles';
import { getUserDisplayName, getNicknameClass } from '../../utils/user';

export const ProfileHeader = ({ profile, theme, isOwn, isFollowing, onFollow, onEdit }) => {
    const bannerStyle = {
        backgroundColor: theme?.primary_color || '#0c0c16',
        backgroundImage: theme?.background_url ? `url(${theme.background_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    const frame = getFrameStyle(profile.equipped_frame || profile.frame_item_id);
    const isOnline = profile.last_seen_at
        ? (new Date() - new Date(profile.last_seen_at)) < 6 * 60 * 1000
        : false;

    return (
        <header className="relative w-full">
            {/* Banner */}
            <div
                className="h-44 md:h-64 w-full overflow-hidden relative"
                style={bannerStyle}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#04040a]" />

                {/* Mood bubble */}
                {(profile.mood_emoji || profile.mood_text) && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="absolute top-4 right-4 md:top-6 md:right-6 z-20"
                    >
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
                            <div className="w-7 h-7 flex items-center justify-center shrink-0">
                                {profile.mood_emoji?.startsWith('http') ? (
                                    <img
                                        src={profile.mood_emoji}
                                        className="w-full h-full object-contain rounded"
                                        alt="Mood"
                                    />
                                ) : (
                                    <span className="text-xl">{profile.mood_emoji || '🪐'}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 leading-none mb-0.5">
                                    Mood
                                </p>
                                <p className="text-[11px] font-bold text-white leading-none">
                                    {profile.mood_text || 'En órbita'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Avatar + Identity */}
            <div className="max-w-5xl mx-auto px-4 md:px-6">
                <div className="flex flex-col md:flex-row md:items-end gap-0 md:gap-8 -mt-8 md:-mt-10">

                    {/* Avatar */}
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 14, stiffness: 120 }}
                        className="relative shrink-0 self-center md:self-auto"
                    >
                        {isOnline && (
                            <div className="absolute -inset-2 rounded-full blur-xl opacity-25 bg-cyan-400 animate-pulse" />
                        )}

                        <div className="w-32 h-32 md:w-40 md:h-40 relative flex items-center justify-center">
                            <div
                                className={`w-full h-full flex items-center justify-center p-1 md:p-1.5 ${frame.className || ''}`}
                                style={{ ...frame, borderRadius: frame.borderRadius || '50%' }}
                            >
                                <div className="w-full h-full rounded-full overflow-hidden border-[4px] border-[#04040a] bg-[#04040a] shadow-inner">
                                    <img
                                        src={profile.avatar_url || '/default_user_blank.png'}
                                        className="w-full h-full object-cover"
                                        alt={profile.username}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Online indicator */}
                        <div className={`absolute bottom-0 right-0 md:bottom-0.5 md:right-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-[#04040a] z-10 transition-all ${isOnline ? 'bg-green-500 shadow-green-500/40 shadow-md' : 'bg-zinc-700'
                            }`} />

                        {/* Voice active badge */}
                        {profile.is_voice_active && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-cyan-500 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide text-white shadow-lg shadow-cyan-500/40 whitespace-nowrap">
                                🎙️ En cabina
                            </div>
                        )}
                    </motion.div>

                    {/* Name + status + actions */}
                    <div className="flex-1 pt-4 md:pt-0 md:pb-1.5 text-center md:text-left space-y-4 md:space-y-3">
                        <div className="space-y-1.5 md:space-y-1">
                            {/* Name row */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                                <h1 className={`text-2xl md:text-4.5xl font-black tracking-tighter uppercase italic leading-tight drop-shadow-2xl ${getNicknameClass(profile)}`}>
                                    {getUserDisplayName(profile)}
                                </h1>
                                {profile.is_vip && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-md mb-1">
                                        VIP
                                    </span>
                                )}
                            </div>

                            {/* Status text (if exists) */}
                            {profile.profile_status && (
                                <div className="flex justify-center md:justify-start">
                                    <span className="text-[11px] font-medium text-white/25 italic truncate max-w-[280px]">
                                        "{profile.profile_status}"
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Status pill + Action buttons */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
                            {/* Status indicator pill moved here */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.04] border border-white/10 rounded-full shadow-inner h-[34px]">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-white/20'
                                    }`} />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">
                                    {isOnline ? 'En línea' : 'Desconectado'}
                                </span>
                            </div>

                            {isOwn ? (
                                <button
                                    onClick={onEdit}
                                    className="px-8 py-2.5 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-lg active:scale-95"
                                >
                                    Editar perfil
                                </button>
                            ) : (
                                <button
                                    onClick={onFollow}
                                    className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl ${isFollowing
                                            ? 'bg-white/[0.05] text-white/40 border border-white/10'
                                            : 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-cyan-500/25 hover:scale-105'
                                        }`}
                                >
                                    {isFollowing ? '✓ Siguiendo' : '+ Seguir'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
