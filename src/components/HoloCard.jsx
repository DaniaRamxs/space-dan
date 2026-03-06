import { memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms';
import { profileSocialService } from '../services/profile_social';
import { useUserCoins } from '../hooks/useUserCoins';
import { supabase } from '../supabaseClient';
import { getUserDisplayName, getNicknameClass } from '../utils/user';
import '../styles/NicknameStyles.css';

import { Zap, Flame, Sparkles, ShieldCheck, Crown, Orbit } from 'lucide-react';
import { getFrameStyle } from '../utils/styles';

import SafeAvatar from './SafeAvatar';
import ChatBadge from './Social/ChatBadge';

const HoloCard = memo(function HoloCard({ profile, onClose }) {
    const navigate = useNavigate();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const [inviting, setInviting] = useState(false);
    const [socialStats, setSocialStats] = useState({ followers: 0, following: 0 });
    const [fullProfile, setFullProfile] = useState(null);

    const profileId = profile?.user_id || profile?.id;
    const { balance, season_balance } = useUserCoins(profileId, profile?.balance || profile?.coins || 0);

    // Transforming mouse position to rotation
    const rotateX = useTransform(y, [-100, 100], [15, -15]);
    const rotateY = useTransform(x, [-100, 100], [-15, 15]);

    useEffect(() => {
        if (profile) {
            const profileId = profile.user_id || profile.id;

            // Fetch social stats
            profileSocialService.getFollowCounts(profileId)
                .then(setSocialStats)
                .catch(console.error);

            // Fetch full profile for identity styles + pass/shield info
            supabase
                .from('profiles')
                .select(`
                    *,
                    nick_style_item:equipped_nickname_style(id, metadata),
                    theme_item:equipped_theme(id, metadata),
                    stellar_pass:stellar_pass_progression(level, xp, is_premium)
                `)
                .eq('id', profileId)
                .maybeSingle()
                .then(({ data }) => setFullProfile(data))
                .catch(console.error);
        }
    }, [profile]);

    function handleMouse(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(event.clientX - centerX);
        y.set(event.clientY - centerY);
    }

    function handleReset() {
        x.set(0);
        y.set(0);
    }

    async function handleInvite() {
        setInviting(true);
        try {
            const roomId = await roomsService.getOrCreateRoom(profile.user_id || profile.id);
            navigate(`/foco/${roomId}`);
        } catch (err) {
            alert('No se pudo crear la sala');
        } finally {
            setInviting(false);
        }
    }

    const frameObj = getFrameStyle(fullProfile?.frame_item_id || profile?.frame_item_id);
    const frameClass = frameObj?.className || '';

    return createPortal(
        <div
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.8)',
                zIndex: 10000,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
            onClick={onClose}
        >
            <motion.div
                layoutId={`profile-${profileId}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onMouseMove={handleMouse}
                onMouseLeave={handleReset}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '320px',
                    perspective: '1000px',
                    cursor: 'default'
                }}
            >
                <motion.div
                    style={{
                        rotateX,
                        rotateY,
                        transformStyle: 'preserve-3d',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '24px',
                        padding: '30px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 30px var(--accent-glow)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Inner Glow/Shine */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ transform: 'translateZ(50px)', marginBottom: '20px', width: '100px', height: '100px' }} className={`relative flex items-center justify-center ${frameClass}`}>
                        {/* Shield Indicator */}
                        {fullProfile?.anti_rob_until && new Date(fullProfile.anti_rob_until) > new Date() && (
                            <div className="absolute -top-2 -left-2 bg-cyan-500 rounded-full p-1.5 shadow-[0_0_10px_cyan] z-50 overflow-hidden">
                                <ShieldCheck size={14} className="text-white" />
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border border-white/30 rounded-full" />
                            </div>
                        )}

                        <SafeAvatar
                            src={profile.avatar_url}
                            provider={profile.provider}
                            fallback="/dan_profile.jpg"
                            className={frameClass ? 'rounded-full' : 'rounded-[30%]'}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                                ...frameObj
                            }}
                        />
                    </div>

                    <div style={{ transform: 'translateZ(30px)', textAlign: 'center' }}>
                        <h2
                            className={getNicknameClass(fullProfile || profile)}
                            style={{ margin: '0 0 5px 0', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                        >
                            {getUserDisplayName(profile)}
                            {(fullProfile?.badge_color || profile?.badge_color || fullProfile?.equipped_badge) && (
                                <ChatBadge
                                    badge={fullProfile?.equipped_badge || profile?.equipped_badge}
                                    color={fullProfile?.badge_color || profile?.badge_color}
                                    size={16}
                                />
                            )}
                        </h2>

                        <p style={{
                            opacity: 0.7, fontSize: '11px', marginBottom: '5px',
                            maxHeight: '40px', overflow: 'hidden', fontStyle: profile.bio ? 'normal' : 'italic'
                        }}>
                            {profile.bio || 'Explorador del Spacely'}
                        </p>

                        {/* Stellar Pass Indicator */}
                        {fullProfile?.stellar_pass && (
                            <div className="flex flex-col items-center gap-1 mb-3">
                                <div className="flex items-center gap-1.5 text-[9px] font-black tracking-widest text-cyan-400 uppercase">
                                    <Sparkles size={8} />
                                    Pase Estelar LV. {fullProfile.stellar_pass.level}
                                    {fullProfile.stellar_pass.is_premium && <span className="text-amber-400">[PREMIUM]</span>}
                                </div>
                                <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 shadow-[0_0_10px_cyan]" style={{ width: `${(fullProfile.stellar_pass.xp / 1000) * 100}%` }} />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent)' }}>◈ {(balance ?? 0).toLocaleString()}</div>
                                <div style={{ fontSize: '8px', opacity: 0.5, textTransform: 'uppercase' }}>Coins Totales</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--cyan)' }}>◈ {(season_balance ?? 0).toLocaleString()}</div>
                                <div style={{ fontSize: '8px', opacity: 0.5, textTransform: 'uppercase' }}>Balance Temp.</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fb923c' }}>🔥 {fullProfile?.streak || profile.streak || 0}</div>
                                <div style={{ fontSize: '8px', opacity: 0.5, textTransform: 'uppercase' }}>Racha</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{socialStats.followers}</div>
                                <div style={{ fontSize: '8px', opacity: 0.5, textTransform: 'uppercase' }}>Seguidores</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '220px' }}>
                            <button
                                className="btn-accent"
                                style={{ padding: '12px' }}
                                onClick={() => navigate(`/cartas?to=${profileId}`)}
                            >
                                Enviar Carta ✉️
                            </button>
                            <button
                                className="btn-glass"
                                style={{ padding: '12px' }}
                                onClick={handleInvite}
                                disabled={inviting}
                            >
                                {inviting ? 'Sintonizando...' : 'Sala de Enfoque 🧘'}
                            </button>
                            <button
                                className="btn-glass"
                                style={{ padding: '12px' }}
                                onClick={() => navigate(profile.username ? `/@${encodeURIComponent(profile.username)}` : `/@${profileId}`)}
                            >
                                Ver Perfil 👤
                            </button>
                        </div>
                    </div>

                    {/* Footer decoration */}
                    <div style={{
                        marginTop: '30px',
                        fontSize: '9px',
                        opacity: 0.3,
                        fontFamily: 'var(--font-mono)',
                        transform: 'translateZ(10px)'
                    }}>
                        ID: {String(profileId).slice(0, 8)}...
                    </div>
                </motion.div>
            </motion.div>
        </div>,
        document.body
    );
});

export default HoloCard;
