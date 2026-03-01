import React from 'react';
import { motion } from 'framer-motion';

export const ProfileHeader = ({ profile, theme, isOwn, isFollowing, onFollow, onEdit }) => {
    const bannerStyle = {
        backgroundColor: theme.primary_color,
        backgroundImage: theme.background_url ? `url(${theme.background_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    return (
        <header className="relative w-full">
            {/* Banner */}
            <div
                className="h-48 md:h-64 w-full rounded-b-[2rem] md:rounded-b-[3rem] overflow-hidden shadow-2xl transition-all duration-700"
                style={bannerStyle}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
            </div>

            {/* Identity Info */}
            <div className="max-w-5xl mx-auto px-6 -mt-16 md:-mt-20 flex flex-col items-center md:items-start md:flex-row gap-6">
                {/* Avatar */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative group cursor-pointer"
                >
                    <div
                        className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] p-1.5 bg-gradient-to-tr from-cyan-400 to-violet-500 shadow-2xl"
                    >
                        <img
                            src={profile.avatar_url || '/default_user_blank.png'}
                            className="w-full h-full object-cover rounded-[2.2rem] border-4 border-[#0a0a10]"
                            alt={profile.username}
                        />
                    </div>
                    {profile.is_voice_active && (
                        <div className="absolute -bottom-2 -right-2 bg-green-500 border-4 border-[#0a0a10] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter text-white animate-pulse shadow-lg">
                            Voice Active 🎙️
                        </div>
                    )}
                </motion.div>

                {/* Textual Identity */}
                <div className="flex-1 text-center md:text-left pt-2 md:pt-10 space-y-2">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
                            {profile.username}
                        </h1>
                        {isOwn ? (
                            <button
                                onClick={onEdit}
                                className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/20 transition-all"
                            >
                                Configurar Perfil
                            </button>
                        ) : (
                            <button
                                onClick={onFollow}
                                className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isFollowing
                                        ? 'bg-white/5 text-white/40 border border-white/10'
                                        : 'bg-white text-black hover:scale-105 shadow-xl'
                                    }`}
                            >
                                {isFollowing ? '✓ Siguiendo' : '+ Seguir'}
                            </button>
                        )}
                    </div>
                    <p className="text-white/60 text-sm md:text-lg max-w-lg font-medium tracking-tight">
                        {profile.bio || "Explorador del Cosmos Dan... ✨"}
                    </p>
                </div>
            </div>
        </header>
    );
};
