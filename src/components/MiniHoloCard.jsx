import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame, Star, ShieldCheck } from 'lucide-react';
import { getUserDisplayName, getNicknameClass } from '../utils/user';
import { getFrameStyle } from '../utils/styles';
import { supabase } from '../supabaseClient';
import ChatBadge from './Social/ChatBadge';
import '../styles/NicknameStyles.css';

const MiniHoloCard = memo(({ profile }) => {
    const [fullProfile, setFullProfile] = useState(profile);
    const profileId = profile?.user_id || profile?.id;

    useEffect(() => {
        if (profileId) {
            supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .maybeSingle()
                .then(({ data }) => { if (data) setFullProfile(data); });
        }
    }, [profileId]);

    const frameObj = getFrameStyle(fullProfile?.frame_item_id || profile?.frame_item_id);
    const frameClass = frameObj?.className || '';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-64 bg-[#0a0a1a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl overflow-hidden relative"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

            <div className="flex flex-col items-center gap-3 relative z-10">
                <div className={`w-16 h-16 flex items-center justify-center relative ${frameClass}`}>
                    <div className="w-full h-full rounded-full overflow-hidden border border-white/10 bg-black/40">
                        <img
                            src={fullProfile?.avatar_url || '/default-avatar.png'}
                            className="w-full h-full object-cover"
                            alt={fullProfile?.username}
                        />
                    </div>
                </div>

                <div className="text-center w-full">
                    <h3 className={`text-sm font-black truncate flex items-center justify-center gap-1.5 ${getNicknameClass(fullProfile)}`}>
                        {getUserDisplayName(fullProfile)}
                        {(fullProfile?.badge_color || fullProfile?.equipped_badge) && (
                            <ChatBadge
                                badge={fullProfile.equipped_badge}
                                color={fullProfile.badge_color}
                                size={12}
                            />
                        )}
                    </h3>
                    <p className="text-[10px] text-white/40 mt-1 line-clamp-1 italic">
                        {fullProfile?.mood || fullProfile?.bio || 'Explorador del Cosmos'}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full mt-2">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] font-black text-cyan-400">
                            <Zap size={10} /> {fullProfile?.level || 1}
                        </div>
                        <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-0.5">Nivel Estelar</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] font-black text-violet-400">
                            <Flame size={10} /> {fullProfile?.activity_level || 1}
                        </div>
                        <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-0.5">Actividad</p>
                    </div>
                </div>

                {fullProfile?.is_stellar_citizen && (
                    <div className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-1">
                        <ShieldCheck size={12} className="text-amber-500" />
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Ciudadano Estelar</span>
                    </div>
                )}
            </div>

            <div className="absolute top-0 right-0 p-3 opacity-20">
                <Star size={40} className="text-white fill-white rotate-12" />
            </div>
        </motion.div>
    );
});

MiniHoloCard.displayName = 'MiniHoloCard';

export default MiniHoloCard;
