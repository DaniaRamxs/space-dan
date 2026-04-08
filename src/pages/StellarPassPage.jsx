
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import {
    Ticket, Sparkles, Zap, Gift, Lock,
    CheckCircle2, Crown, Star, ChevronRight,
    ChevronLeft, Info, Trophy, LayoutGrid, List
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNicknameClass, getUserDisplayName } from '../utils/user';
import { getFrameStyle } from '../utils/styles';
import MiniHoloCard from '../components/MiniHoloCard';

export default function StellarPassPage() {
    const { user, profile } = useAuthContext();
    const [progression, setProgression] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [previewReward, setPreviewReward] = useState(null);

    useEffect(() => {
        if (user) {
            fetchPassData();
        }
    }, [user]);

    const fetchPassData = async () => {
        setLoading(true);
        try {
            // 1. Obtener progresión
            const { data: progData } = await supabase
                .from('stellar_pass_progression')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            setProgression(progData || { level: 1, xp: 0, is_premium: false });

            // 2. Obtener recompensas
            const { data: rewData } = await supabase
                .from('stellar_pass_rewards')
                .select('*')
                .order('level', { ascending: true });

            setRewards(rewData || []);
        } catch (err) {
            console.error('[StellarPass] Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#050510] flex items-center justify-center">
            <div className="text-cyan-500/20 uppercase tracking-[0.5em] text-xs animate-pulse font-black">Sincronizando Horizonte Estelar...</div>
        </div>
    );

    const nextLevelXP = 1000;
    const progressPercent = progression ? (progression.xp / nextLevelXP) * 100 : 0;

    return (
        <div className="min-h-screen bg-[#050510] pt-24 pb-48 px-6 font-sans overflow-x-hidden">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative p-10 rounded-[3rem] bg-gradient-to-br from-cyan-950/40 via-black to-purple-950/20 shadow-2xl border border-white/5 overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full -mr-48 -mt-48 animate-pulse" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        {/* Level Orbit */}
                        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/5" />
                                <motion.circle
                                    cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="4"
                                    className="text-cyan-400"
                                    strokeDasharray="377"
                                    initial={{ strokeDashoffset: 377 }}
                                    animate={{ strokeDashoffset: 377 - (377 * progressPercent) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nivel</span>
                                <span className="text-4xl font-black text-white leading-none">{progression?.level}</span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-6 text-center md:text-left">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                                    <Ticket size={10} /> Temporada 1: Horizonte Estelar
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                                    TU PASE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400">ESTELAR</span>
                                </h1>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="space-y-1.5 flex-1 w-full max-w-sm">
                                    <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
                                        <span>Progreso de XP</span>
                                        <span>{progression?.xp} / {nextLevelXP}</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercent}%` }}
                                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                        />
                                    </div>
                                </div>

                                {!progression?.is_premium ? (
                                    <Link
                                        to="/tienda-galactica"
                                        className="group relative px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95"
                                    >
                                        <div className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                        </div>
                                        Desbloquear Premium
                                    </Link>
                                ) : (
                                    <div className="px-8 py-3 bg-white/5 border border-amber-500/30 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Crown size={14} fill="currentColor" /> Premium Activo
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Rewards View Controls */}
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Gift size={20} className="text-cyan-500" /> Línea de Tiempo
                    </h2>
                    <div className="flex bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Rewards Content */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {rewards.map((rew, idx) => (
                            <RewardCard
                                key={idx}
                                reward={rew}
                                currentLevel={progression?.level || 1}
                                isUserPremium={progression?.is_premium}
                                onPreview={() => rew.reward_type === 'item' ? setPreviewReward(rew) : null}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {rewards.map((rew, idx) => (
                            <RewardRow
                                key={idx}
                                reward={rew}
                                currentLevel={progression?.level || 1}
                                isUserPremium={progression?.is_premium}
                                onPreview={() => rew.reward_type === 'item' ? setPreviewReward(rew) : null}
                            />
                        ))}
                    </div>
                )}

                {/* Live Preview Overlay */}
                <AnimatePresence>
                    {previewReward && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-end p-4 md:p-8 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setPreviewReward(null)}
                                className="absolute inset-0"
                            />
                            <motion.div
                                initial={{ x: 500, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 500, opacity: 0 }}
                                className="relative w-full max-w-md h-full bg-[#070710] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden rounded-l-[3rem]"
                            >
                                <button
                                    onClick={() => setPreviewReward(null)}
                                    className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all z-20"
                                >
                                    ✕
                                </button>

                                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                                    <div className="space-y-2 mt-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                                            Previsualización en Vivo
                                        </div>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">
                                            {previewReward.reward_data?.item_title || 'Recompensa Estelar'}
                                        </h3>
                                    </div>

                                    {/* Real Preview Rendering */}
                                    <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-8 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

                                        {/* Frame Preview */}
                                        {previewReward.reward_data?.item_id?.includes('frame') && (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-40 h-40 relative flex items-center justify-center">
                                                    {(() => {
                                                        const frame = getFrameStyle(previewReward.reward_data.item_id);
                                                        return (
                                                            <div
                                                                className={`w-32 h-32 rounded-full relative flex items-center justify-center border border-white/5 ${frame.className || ''}`}
                                                                style={{ ...frame, width: '128px', height: '128px' }}
                                                            >
                                                                <div className="w-full h-full rounded-full overflow-hidden bg-black/40 border border-white/10">
                                                                    <img
                                                                        src={profile?.avatar_url || '/default-avatar.png'}
                                                                        className="w-full h-full object-cover"
                                                                        alt="Preview"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Tu Avatar con este Marco</p>
                                            </div>
                                        )}

                                        {/* Nickname Preview */}
                                        {previewReward.reward_data?.item_id?.includes('nick') && (
                                            <div className="flex flex-col items-center gap-6 py-10">
                                                <span
                                                    className={`text-2xl sm:text-3xl font-black ${getNicknameClass({ ...profile, equipped_nickname_style: previewReward.reward_data.item_id })}`}
                                                >
                                                    {getUserDisplayName(profile)}
                                                </span>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Tu Nombre en el Chat</p>
                                            </div>
                                        )}

                                        {/* Badge Preview */}
                                        {previewReward.reward_data?.item_id?.includes('badge') && (
                                            <div className="flex flex-col items-center gap-4 py-6">
                                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                                                    <span className={`text-lg font-black`}>{getUserDisplayName(profile)}</span>
                                                    <div className="bg-white/10 px-2 py-0.5 rounded text-[14px]">
                                                        {previewReward.reward_data?.icon || '⭐'}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Insignia junto a tu nombre</p>
                                            </div>
                                        )}

                                        {/* HoloCard Preview */}
                                        {previewReward.reward_data?.item_id?.includes('holo') && (
                                            <div className="flex flex-col items-center gap-4 w-full">
                                                <div className="w-full max-w-[240px] shadow-2xl rounded-3xl overflow-hidden scale-90">
                                                    <MiniHoloCard profile={{ ...profile, equipped_theme: previewReward.reward_data.item_id }} />
                                                </div>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Tu Tarjeta de Identidad</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Cómo obtener:</h4>
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-black">
                                                {previewReward.level}
                                            </div>
                                            <div>
                                                <p className="text-white text-xs font-bold">Desbloqueas al llegar al Nivel {previewReward.level}</p>
                                                <p className="text-white/40 text-[9px] uppercase font-black mt-1">
                                                    {previewReward.is_premium ? '🔒 Requiere Pase Premium' : '🔓 Disponible para todos'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 border-t border-white/5 bg-white/[0.02]">
                                    <button
                                        onClick={() => setPreviewReward(null)}
                                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                                    >
                                        Cerrar Vista Previa
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Footer Disclaimer */}
                <div className="text-center py-10 opacity-30 group hover:opacity-100 transition-opacity">
                    <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-white">
                        <Info size={12} /> Las recompensas se reclaman automáticamente al subir de nivel.
                    </div>
                </div>
            </div>
        </div>
    );
}

function RewardCard({ reward, currentLevel, isUserPremium, onPreview }) {
    const isUnlocked = currentLevel >= reward.level;
    const isClaimable = isUnlocked && (!reward.is_premium || isUserPremium);

    return (
        <motion.div
            whileHover={{ y: -5 }}
            onClick={onPreview}
            className={`relative p-6 rounded-[2rem] border overflow-hidden group transition-all duration-500 cursor-pointer ${isUnlocked ? 'bg-white/[0.03]' : 'bg-black/40 grayscale'} ${reward.is_premium ? 'border-amber-500/10' : 'border-white/5'}`}
        >
            {/* Lock Overlay */}
            {!isUnlocked && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Lock size={20} className="text-white/20" />
                </div>
            )}

            {/* Level Badge */}
            <div className={`absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-lg ${isUnlocked ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/20'}`}>
                NV. {reward.level}
            </div>

            <div className="space-y-4 mt-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative transition-transform group-hover:scale-110 ${reward.is_premium ? 'bg-amber-500/10 text-amber-500' : 'bg-cyan-500/10 text-cyan-400'}`}>
                    {reward.reward_type === 'starlys' ? <Zap size={24} /> : <Gift size={24} />}
                    {isClaimable && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-[#070710] shadow-lg animate-bounce">
                        <CheckCircle2 size={10} className="text-white" />
                    </div>}
                </div>

                <div className="space-y-1">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${reward.is_premium ? 'text-amber-500' : 'text-white/40'}`}>
                        {reward.is_premium ? 'Premium' : 'Gratis'}
                    </p>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">
                        {reward.reward_type === 'starlys' ? `${reward.reward_amount.toLocaleString()} ◈` : (reward.reward_data?.item_title || reward.reward_type)}
                    </h4>
                </div>
            </div>

            {/* Premium Glow */}
            {reward.is_premium && <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-transparent pointer-events-none" />}
        </motion.div>
    );
}

function RewardRow({ reward, currentLevel, isUserPremium, onPreview }) {
    const isUnlocked = currentLevel >= reward.level;
    const isClaimable = isUnlocked && (!reward.is_premium || isUserPremium);

    return (
        <div
            onClick={onPreview}
            className={`p-5 rounded-2xl border flex items-center gap-6 transition-all cursor-pointer ${isUnlocked ? 'bg-white/[0.02] border-white/10' : 'bg-black/40 border-white/5 opacity-50 hover:bg-white/5'}`}
        >
            <div className="w-12 text-center">
                <span className={`text-xs font-black ${isUnlocked ? 'text-cyan-400' : 'text-white/20'}`}>{reward.level}</span>
            </div>

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${reward.is_premium ? 'bg-amber-500/10 text-amber-500' : 'bg-cyan-500/10 text-cyan-400'}`}>
                {reward.reward_type === 'starlys' ? <Zap size={20} /> : <Gift size={20} />}
            </div>

            <div className="flex-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    {reward.reward_type === 'starlys' ? `${reward.reward_amount.toLocaleString()} Starlys` : (reward.reward_data?.item_title || reward.reward_type)}
                </h4>
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${reward.is_premium ? 'text-amber-500/60' : 'text-white/20'}`}>
                    {reward.is_premium ? 'Línea de Recompensas Premium' : 'Recompensa Gratuita'}
                </p>
            </div>

            <div className="flex items-center gap-3">
                {isClaimable ? (
                    <div className="flex items-center gap-1.5 text-green-500 text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={14} /> Reclamado
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-white/20 text-[10px] font-black uppercase tracking-widest">
                        <Lock size={14} /> Bloqueado
                    </div>
                )}
            </div>
        </div>
    );
}

