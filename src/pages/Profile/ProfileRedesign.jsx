import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import { newProfileService } from '../../services/newProfileService';
import { profileSocialService } from '../../services/profile_social';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { supportService } from '../../services/supportService';

import { ProfileLayout } from '../../components/ProfileRedesign/ProfileLayout';
import { ProfileHeader } from '../../components/ProfileRedesign/ProfileHeader';
import { BlocksRenderer } from '../../components/ProfileRedesign/BlocksRenderer';
import { ThemeConfigModal } from '../../components/ProfileRedesign/ThemeConfigModal';
import { SpotifyBlock } from '../../components/ProfileRedesign/SpotifyBlock';
import { AffinityMapBlock } from '../../components/ProfileRedesign/AffinityMapBlock';
import { ResonanciaBlock } from '../../components/ProfileRedesign/ResonanciaBlock';
import { MysterySignals } from '../../components/ProfileRedesign/MysterySignals';
import { UniverseAttractionBlock } from '../../components/ProfileRedesign/UniverseAttractionBlock';
import { AuraBlock } from '../../components/ProfileRedesign/AuraBlock';
import BlogComposer from '../../components/ProfileRedesign/BlogComposer';
import { BlogSection } from '../../components/ProfileRedesign/BlogSection';
import StarlysCounter from '../../components/StarlysCounter';
import { signalsService } from '../../services/signalsService';
import PostComposer from '../../components/Social/PostComposer';
import ActivityFeed from '../../components/Social/ActivityFeed';
import EchoesSection from '../../components/Social/EchoesSection';
import ActivityCard from '../../components/Social/ActivityCard';
import { motion, AnimatePresence } from 'framer-motion';
import { StellarSupport } from '../../components/ProfileRedesign/StellarSupport';
import StarlyOrb from '../../components/StarlyOrb';
import { ConnectionsSection } from '../../components/ProfileRedesign/ConnectionsSection';
import { CollectionSection } from '../../components/ProfileRedesign/CollectionSection';
import { FeaturedCharacters } from '../../components/ProfileRedesign/FeaturedCharacters';

// ─── Modal de Regalo Estelar (independiente del tab activo) ──────────────────
const GIFT_TYPES = [
    { id: 'gift', label: 'Regalo', icon: '🎁' },
    { id: 'tip', label: 'Propina', icon: '⚡' },
    { id: 'financial_aid', label: 'Apoyo', icon: '🏦' },
    { id: 'bet', label: 'Apuesta', icon: '🤝' },
];

function StarGiftModal({ open, onClose, toUserId, toUsername, fromUserId }) {
    const { balance, refreshBalance } = useEconomy();
    const [amount, setAmount] = useState(1000);
    const [message, setMessage] = useState('');
    const [giftType, setGiftType] = useState('gift');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => { if (open) { setDone(false); setAmount(1000); setMessage(''); setGiftType('gift'); } }, [open]);

    async function handleSend() {
        if (!fromUserId) return alert('Debes iniciar sesión.');
        if (amount <= 0 || amount > balance) return alert('Monto inválido o balance insuficiente.');
        setLoading(true);
        try {
            await supportService.sendGift(fromUserId, toUserId, amount, message, giftType);
            await refreshBalance();
            setDone(true);
        } catch (e) {
            alert(e.message || 'Error al enviar la estrella.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative w-full max-w-sm bg-[#09090f] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
                        {done ? (
                            <div className="text-center space-y-4 py-4">
                                <div className="text-5xl">⭐</div>
                                <h3 className="text-xl font-black text-white uppercase italic">¡Estrella enviada!</h3>
                                <p className="text-sm text-white/40">Tu apoyo llegó a @{toUsername}</p>
                                <button onClick={onClose} className="px-8 py-3 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-cyan-400 transition-all">Cerrar</button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center space-y-1">
                                    <div className="text-4xl mb-2">⭐</div>
                                    <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Dejar Estrella</h3>
                                    <p className="text-xs text-white/30">Enviando a @{toUsername}</p>
                                </div>

                                {/* Tipo */}
                                <div className="grid grid-cols-2 gap-2">
                                    {GIFT_TYPES.map(t => (
                                        <button key={t.id} onClick={() => setGiftType(t.id)}
                                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${giftType === t.id ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/[0.04]'
                                                }`}>
                                            <span>{t.icon}</span>
                                            <span className="text-[9px] font-black uppercase">{t.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Monto */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-white/20 px-1">Monto (◈ Starlys)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-black italic text-lg">◈</span>
                                        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-black italic text-xl focus:outline-none focus:border-amber-500/50 transition-colors" />
                                    </div>
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-white/20">Saldo: ◈ {(balance || 0).toLocaleString()}</span>
                                        <button onClick={() => setAmount(balance)} className="text-[9px] font-bold text-amber-500/50 hover:text-amber-400 uppercase">Máximo</button>
                                    </div>
                                </div>

                                {/* Mensaje */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-white/20 px-1">Mensaje (opcional)</label>
                                    <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 120))}
                                        placeholder="Escribe algo especial..."
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-sm text-white/70 placeholder:text-white/10 focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-16" />
                                    <span className="block text-right text-[9px] text-white/15">{message.length}/120</span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button disabled={loading || amount <= 0 || amount > balance}
                                        onClick={handleSend}
                                        className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:pointer-events-none">
                                        {loading ? 'Enviando...' : '⭐ Confirmar Estrella'}
                                    </button>
                                    <button onClick={onClose} className="text-[10px] font-bold text-white/20 hover:text-white/40 uppercase tracking-widest py-2">Cancelar</button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// ─── Mini activity feed (3 posts, no infinite scroll) ──────────────────────
function RecentActivityBlock({ userId, onViewAll }) {
    const { feed, loading } = useActivityFeed('all', 3, null, userId);
    const preview = feed.slice(0, 3);

    if (loading) {
        return (
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-3">
                <div className="flex items-center justify-between mb-1">
                    <div className="h-2 w-28 bg-white/[0.04] rounded-full animate-pulse" />
                    <div className="h-2 w-14 bg-white/[0.04] rounded-full animate-pulse" />
                </div>
                {[0, 1, 2].map(i => (
                    <div key={i} className="h-16 bg-white/[0.02] rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (preview.length === 0) return null;

    return (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.04]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">
                    Actividad reciente
                </p>
                <button
                    onClick={onViewAll}
                    className="text-[10px] font-bold text-white/25 hover:text-white/50 uppercase tracking-widest transition-colors"
                >
                    Ver todo →
                </button>
            </div>
            <div className="divide-y divide-white/[0.03]">
                {preview.map(post => (
                    <ActivityCard key={post.id} post={post} />
                ))}
            </div>
        </div>
    );
}


// ─── Bio fallback card (when no "about" block is configured) ───────────────
function BioCard({ bio }) {
    const [expanded, setExpanded] = useState(false);
    const lines = (bio || '').split('\n').filter(Boolean);
    const isLong = lines.length > 4 || bio.length > 280;
    const preview = isLong && !expanded
        ? bio.slice(0, 280).trimEnd() + '…'
        : bio;

    return (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Manifiesto</p>
            <p className="text-sm text-white/55 leading-relaxed">{preview}</p>
            {isLong && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-[10px] font-bold text-white/25 hover:text-white/50 uppercase tracking-widest transition-colors"
                >
                    {expanded ? 'Ver menos ▴' : 'Ver más ▾'}
                </button>
            )}
        </div>
    );
}

// ─── Skeleton loader ────────────────────────────────────────────────────────
function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-[#04040a]">
            <div className="h-44 md:h-64 bg-white/[0.03] animate-pulse" />
            <div className="max-w-5xl mx-auto px-4 md:px-6 pt-4 space-y-4">
                <div className="flex gap-4 items-end">
                    <div className="w-24 h-24 rounded-full bg-white/[0.05] animate-pulse -mt-12 shrink-0" />
                    <div className="space-y-2 pb-2">
                        <div className="h-6 w-40 bg-white/[0.05] rounded-lg animate-pulse" />
                        <div className="h-3 w-24 bg-white/[0.03] rounded-lg animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4 mt-6">
                    <div className="space-y-4">
                        {[80, 60, 40].map(h => (
                            <div key={h} className={`h-${h > 70 ? '28' : h > 50 ? '20' : '16'} bg-white/[0.02] rounded-2xl animate-pulse`} />
                        ))}
                    </div>
                    <div className="space-y-4">
                        {[120, 80, 60].map(h => (
                            <div key={h} className="h-24 bg-white/[0.02] rounded-2xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function ProfileRedesignPage() {
    const { username } = useParams();
    const { user } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [profile, setProfile] = useState(null);
    const [theme, setTheme] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [posts, setPosts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followCounts, setFollowCounts] = useState(null);
    const [activeTab, setActiveTab] = useState('identity');
    const [showConfig, setShowConfig] = useState(false);
    const [showComposer, setShowComposer] = useState(false);
    const [stats, setStats] = useState({ stars: 0, echoes: 0, age: 0 });
    const [showStellarModal, setShowStellarModal] = useState(false);

    useEffect(() => {
        load();
    }, [username]);

    async function load() {
        setLoading(true);
        setNotFound(false);
        try {
            const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

            const { data: prof, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .ilike('username', cleanUsername)
                .maybeSingle();

            if (profError || !prof) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            setProfile(prof);

            const [levelData, themeData, blocksData, postsData, countsData] = await Promise.allSettled([
                newProfileService.getLevelData(prof.id),
                newProfileService.getProfileTheme(prof.id).catch(() => newProfileService.getDefaultTheme(prof.id)),
                newProfileService.getProfileBlocks(prof.id).catch(() => [
                    { block_type: 'stats', order_index: 0, is_active: true },
                    { block_type: 'thought', order_index: 1, is_active: true },
                    { block_type: 'spotify', order_index: 2, is_active: true },
                ]),
                newProfileService.getBlogPosts(prof.id).catch(() => []),
                profileSocialService.getFollowCounts(prof.id).catch(() => null),
            ]);

            if (levelData.status === 'fulfilled') {
                setProfile(prev => ({ ...prev, level: levelData.value.level }));
            }
            setTheme(themeData.status === 'fulfilled' ? themeData.value : newProfileService.getDefaultTheme(prof.id));
            setBlocks(blocksData.status === 'fulfilled' ? blocksData.value : []);
            setPosts(postsData.status === 'fulfilled' ? postsData.value : []);
            if (countsData.status === 'fulfilled') setFollowCounts(countsData.value);

            if (user && user.id !== prof.id) {
                const following = await profileSocialService.isFollowing(prof.id).catch(() => false);
                setIsFollowing(following);
                signalsService.trackVisit(user.id, prof.id);
            }

            // Fetch extra stats for the header
            Promise.all([
                supabase.from('space_echoes').select('stars_count').eq('user_id', prof.id),
                supabase.from('space_echoes').select('id', { count: 'exact', head: true }).eq('user_id', prof.id)
            ]).then(([starsRes, echoesRes]) => {
                const totalStars = starsRes.data?.reduce((acc, curr) => acc + (curr.stars_count || 0), 0) || 0;
                const totalEchoes = echoesRes.count || 0;

                // Edad del universo: Días desde la creación (mínimo 1 día para el día 0)
                const createdAt = prof.created_at ? new Date(prof.created_at) : new Date();
                const diffTime = Math.abs(new Date() - createdAt);
                const ageDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

                setStats({ stars: totalStars, echoes: totalEchoes, age: ageDays });
            });
        } catch (e) {
            console.error('Profile load error:', e);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <ProfileSkeleton />;

    if (notFound) return (
        <div className="min-h-screen bg-[#04040a] flex flex-col items-center justify-center p-10 text-center space-y-6">
            <div className="text-7xl font-black opacity-[0.06] select-none">404</div>
            <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                    Perfil fuera de alcance
                </h2>
                <p className="text-white/30 text-sm max-w-xs mx-auto">
                    "@{username}" no responde a nuestras señales.
                </p>
            </div>
            <Link
                to="/"
                className="px-8 py-2.5 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
            >
                Volver al inicio
            </Link>
        </div>
    );

    const isOwn = user?.id === profile.id;

    // Derived block lists
    const activeBlocks = blocks.filter(b => b.is_active);
    const hasSpotifyBlock = activeBlocks.some(b => b.block_type === 'spotify');
    const contentBlocks = activeBlocks.filter(b => b.block_type !== 'spotify');
    const hasBioBlock = contentBlocks.some(b => b.block_type === 'about');
    const showBioFallback = !hasBioBlock && profile.bio;

    const tabs = [
        { id: 'identity', label: 'Identidad' },
        { id: 'activity', label: 'Actividad' },
        { id: 'blog', label: 'Bitácora' },
        { id: 'guestbook', label: 'Ecos' },
    ];

    return (
        <ProfileLayout theme={theme}>
            {/* Header */}
            <ProfileHeader
                profile={profile}
                theme={theme}
                isOwn={isOwn}
                stats={stats}
                isFollowing={isFollowing}
                onFollow={async () => {
                    if (!user) return alert('Debes iniciar sesión.');
                    const { following } = await profileSocialService.toggleFollow(profile.id);
                    setIsFollowing(following);
                    // Refresh counts
                    profileSocialService.getFollowCounts(profile.id)
                        .then(setFollowCounts)
                        .catch(() => { });
                }}
                onEdit={() => setShowConfig(true)}
                onStar={() => {
                    if (!user) return alert('Debes iniciar sesión para dejar una estrella.');
                    setShowStellarModal(true);
                }}
                onEcho={() => setActiveTab('guestbook')}
            />

            <ThemeConfigModal
                isOpen={showConfig}
                onClose={() => setShowConfig(false)}
                userId={profile.id}
                currentTheme={theme}
                currentBlocks={blocks}
                currentProfile={profile}
                onSave={load}
            />

            {/* Modal Dejar Estrella — siempre montado, independiente del tab */}
            <StarGiftModal
                open={showStellarModal}
                onClose={() => setShowStellarModal(false)}
                toUserId={profile.id}
                toUsername={profile.username}
                fromUserId={user?.id}
            />

            {/* Main content */}
            <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-20">

                {/* Sticky tab nav */}
                <nav className="sticky top-0 z-20 bg-[#04040a]/90 backdrop-blur-sm -mx-4 md:-mx-6 px-4 md:px-6 mb-8">
                    <div className="flex items-end gap-6 overflow-x-auto no-scrollbar border-b border-white/[0.06]">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative text-[11px] font-bold uppercase tracking-widest whitespace-nowrap pb-3 pt-3 transition-colors shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-white/25 hover:text-white/50'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="tab-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        {/* ── IDENTIDAD (SECUENCIA ESPACIAL) ────────────────── */}
                        {activeTab === 'identity' && (
                            <div className="flex flex-col gap-24 py-12">

                                {/* 1. AURA DEL UNIVERSO */}
                                <section className="space-y-6">
                                    <AuraBlock userId={profile.id} />
                                </section>

                                {/* 2. UNIVERSO QUE ATRAES & APOYO */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <section className="space-y-4">
                                        <div className="px-1 py-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">Interferencias de Campo</p>
                                            <UniverseAttractionBlock userId={profile.id} isOwn={isOwn} profileUsername={profile.username} />
                                        </div>
                                    </section>
                                    <section className="space-y-4">
                                        <div className="px-1 py-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">Soporte Vital</p>
                                            <StellarSupport
                                                profileUserId={profile.id}
                                                isOwn={isOwn}
                                                profileUsername={profile.username}
                                                autoOpen={showStellarModal}
                                                onModalClose={() => setShowStellarModal(false)}
                                            />
                                        </div>
                                    </section>
                                </div>

                                {/* 3. MAPA DE AFINIDAD */}
                                <section className="space-y-4">
                                    <p className="text-center text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Cartografía de Vínculos</p>
                                    <AffinityMapBlock userId={profile.id} ownerAvatar={profile.avatar_url} />
                                </section>

                                {/* 4. MÉTRICAS VITALES y ARCHIVO DE IDENTIDAD */}
                                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12">
                                    <div className="space-y-12">
                                        {/* Métricas Vitales */}
                                        <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-8 space-y-6 transition-all hover:bg-white/[0.03]">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">Núcleo de Datos</p>
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-[11px] font-black text-white/40 uppercase">Rango Estelar</span>
                                                    <span className="text-2xl font-black text-white italic">NIVEL {profile.level || 1}</span>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-[11px] font-black text-white/40 uppercase">Resonancia</span>
                                                    <span className="text-2xl font-black text-violet-400 italic">{profile.streak || 0}D</span>
                                                </div>
                                                <div className="pt-4 border-t border-white/5">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-[11px] font-black text-white/40 uppercase">Energía Starlys</span>
                                                        <StarlyOrb balance={profile.balance || 0} className="scale-75" />
                                                    </div>
                                                    <StarlysCounter value={profile.balance || 0} className="text-3xl font-black text-white italic block text-right" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Personajes Destacados */}
                                        <FeaturedCharacters userId={profile.id} />
                                    </div>

                                    <div className="space-y-12">
                                        {/* Bio / Manifiesto */}
                                        {showBioFallback && (
                                            <BioCard bio={profile.bio} />
                                        )}

                                        {/* Galería Estelar (Blocks) */}
                                        {contentBlocks.length > 0 && (
                                            <BlocksRenderer
                                                blocks={contentBlocks}
                                                userId={profile.id}
                                                isOwn={isOwn}
                                                onEdit={() => setShowConfig(true)}
                                                profileData={profile}
                                            />
                                        )}

                                        {/* Señales misteriosas (Solo dueño) */}
                                        {isOwn && (
                                            <MysterySignals userId={profile.id} isOwn={isOwn} />
                                        )}
                                    </div>
                                </div>

                                {/* 5. COLECCIÓN DE PERSONAJES */}
                                <section className="w-full">
                                    <CollectionSection userId={profile.id} />
                                </section>

                                {/* 6. ACTIVIDAD RECIENTE */}
                                <section className="space-y-8 max-w-2xl mx-auto w-full">
                                    <div className="text-center">
                                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] opacity-40">Últimas transmisiones</h3>
                                    </div>
                                    <RecentActivityBlock
                                        userId={profile.id}
                                        onViewAll={() => setActiveTab('activity')}
                                    />
                                </section>

                                <section className="w-full">
                                    <ConnectionsSection userId={profile.id} followCounts={followCounts} />
                                </section>

                                {/* 8. BOTÓN: AÑADIR BLOQUE (Solo dueño) */}
                                {isOwn && (
                                    <section className="max-w-md mx-auto w-full pt-12">
                                        <button
                                            onClick={() => setShowConfig(true)}
                                            className="w-full h-32 rounded-[2.5rem] border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-all group flex flex-col items-center justify-center gap-3"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="text-white/40 text-xl font-light">＋</span>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Ampliar Universo</p>
                                                <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest mt-1">Añadir nuevo bloque de contenido</p>
                                            </div>
                                        </button>
                                    </section>
                                )}

                                {/* 8. RESONANCIA (Solo ajeno) */}
                                {!isOwn && user && (
                                    <section className="max-w-xl mx-auto w-full">
                                        <ResonanciaBlock
                                            viewerId={user.id}
                                            profileUserId={profile.id}
                                            viewerUsername={user.username}
                                            profileUsername={profile.username}
                                        />
                                    </section>
                                )}

                            </div>
                        )}

                        {/* ── ACTIVIDAD ────────────────────────────────── */}
                        {activeTab === 'activity' && (
                            <div className="max-w-2xl mx-auto space-y-4">
                                {isOwn && <PostComposer onPostCreated={load} />}
                                <ActivityFeed userId={profile.id} />
                            </div>
                        )}

                        {/* ── BITÁCORA ─────────────────────────────────── */}
                        {activeTab === 'blog' && (
                            <div className="space-y-6 max-w-3xl mx-auto">
                                {isOwn && !showComposer && (
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => setShowComposer(true)}
                                            className="px-8 py-3 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-lg active:scale-95"
                                        >
                                            ✍️ Nueva entrada
                                        </button>
                                    </div>
                                )}
                                {showComposer && isOwn && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-base font-black text-white uppercase italic tracking-tight">
                                                Editor de Bitácora
                                            </h3>
                                            <button
                                                onClick={() => setShowComposer(false)}
                                                className="text-[10px] font-bold text-white/25 hover:text-white/50 uppercase tracking-widest transition-colors"
                                            >
                                                Cerrar
                                            </button>
                                        </div>
                                        <BlogComposer
                                            onPostCreated={() => { load(); setShowComposer(false); }}
                                            onCancel={() => setShowComposer(false)}
                                        />
                                    </motion.div>
                                )}
                                <BlogSection
                                    title={`${profile.username}'s Bitácora`}
                                    posts={posts}
                                    isOwn={isOwn}
                                    username={profile.username}
                                />
                            </div>
                        )}

                        {/* ── ECOS ─────────────────────────────────────── */}
                        {activeTab === 'guestbook' && (
                            <div className="py-8">
                                <EchoesSection profileId={profile.id} isOwnProfile={isOwn} />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </ProfileLayout>
    );
}
