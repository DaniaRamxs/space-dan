import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { newProfileService } from '../../services/newProfileService';
import { profileSocialService } from '../../services/profile_social';
import { useActivityFeed } from '../../hooks/useActivityFeed';

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

// ─── Connections block ──────────────────────────────────────────────────────
function ConnectionsBlock({ userId, followCounts }) {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        profileSocialService.getFollowing(userId)
            .then(data => setConnections(data.slice(0, 8)))
            .catch(() => setConnections([]))
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) return <div className="rounded-2xl bg-white/[0.02] border border-white/5 h-20 animate-pulse" />;
    if (connections.length === 0) return null;

    return (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Conexiones</p>
                {followCounts && (
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] text-white/20 font-bold">
                            <span className="text-white/40">{followCounts.followers}</span> seguidores
                        </span>
                        <span className="text-[9px] text-white/20 font-bold">
                            <span className="text-white/40">{followCounts.following}</span> siguiendo
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {connections.map(c => (
                    <Link
                        key={c.id}
                        to={`/@${c.username}`}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors group"
                    >
                        <img
                            src={c.avatar_url || '/default_user_blank.png'}
                            alt={c.username}
                            className="w-5 h-5 rounded-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                        <span className="text-[11px] text-white/35 group-hover:text-white/65 transition-colors font-medium">
                            {c.username}
                        </span>
                    </Link>
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
                        {/* ── IDENTIDAD ────────────────────────────────── */}
                        {activeTab === 'identity' && (
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4">

                                {/* LEFT: Radar + Resonancia + Stats + Connections (desktop) */}
                                <div className="flex flex-col gap-4">

                                    <StellarSupport
                                        profileUserId={profile.id}
                                        isOwn={isOwn}
                                        profileUsername={profile.username}
                                    />

                                    {/* Radar Sonoro */}
                                    {(hasSpotifyBlock || isOwn) && (
                                        <SpotifyBlock userId={profile.id} isOwn={isOwn} />
                                    )}

                                    {/* Aura */}
                                    <AuraBlock userId={profile.id} />

                                    {/* Señales misteriosas de visitas */}
                                    {isOwn && (
                                        <MysterySignals userId={profile.id} isOwn={isOwn} />
                                    )}

                                    {/* El Universo que Atraes */}
                                    <UniverseAttractionBlock userId={profile.id} isOwn={isOwn} profileUsername={profile.username} />

                                    {/* Constelaciones */}
                                    <AffinityMapBlock userId={profile.id} ownerAvatar={profile.avatar_url} />

                                    {/* Resonancia — solo cuando se visita un perfil ajeno */}
                                    {!isOwn && user && (
                                        <ResonanciaBlock
                                            viewerId={user.id}
                                            profileUserId={profile.id}
                                            viewerUsername={user.username}
                                            profileUsername={profile.username}
                                        />
                                    )}

                                    {/* Stats + follow counts */}
                                    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-4">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Métricas</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold uppercase text-white/20">Nivel</p>
                                                <p className="text-lg font-black text-white italic">{profile.level || 1}</p>
                                            </div>
                                            <div className="space-y-0.5 relative group">
                                                <p className="text-[9px] font-bold uppercase text-white/20">Starlys</p>
                                                <div className="flex items-center gap-3">
                                                    <StarlysCounter value={profile.balance || 0} className="text-lg font-black text-cyan-400 italic" />
                                                    <StarlyOrb balance={profile.balance || 0} className="scale-50 -ml-10 -mr-10" />
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold uppercase text-white/20">Racha</p>
                                                <p className="text-lg font-black text-violet-400 italic">{profile.streak || 0}D</p>
                                            </div>
                                        </div>

                                        {/* Follow counts */}
                                        {followCounts && (followCounts.followers > 0 || followCounts.following > 0) && (
                                            <div className="flex items-center gap-5 pt-1 border-t border-white/[0.04]">
                                                <div className="space-y-0">
                                                    <span className="text-[13px] font-black text-white/70">{followCounts.followers}</span>
                                                    <p className="text-[9px] font-bold uppercase text-white/20">Seguidores</p>
                                                </div>
                                                <div className="space-y-0">
                                                    <span className="text-[13px] font-black text-white/70">{followCounts.following}</span>
                                                    <p className="text-[9px] font-bold uppercase text-white/20">Siguiendo</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Connections — desktop only, left col */}
                                    <div className="hidden lg:block">
                                        <ConnectionsBlock userId={profile.id} followCounts={null} />
                                    </div>
                                </div>

                                {/* RIGHT: Bio + Blocks + Activity + Connections (mobile) */}
                                <div className="flex flex-col gap-4">

                                    {/* Bio fallback — shown when no "about" block exists */}
                                    {showBioFallback && (
                                        <BioCard bio={profile.bio} />
                                    )}

                                    {/* Content blocks (bio, thought, gallery, interests…) */}
                                    {contentBlocks.length > 0 && (
                                        <BlocksRenderer
                                            blocks={contentBlocks}
                                            userId={profile.id}
                                            isOwn={isOwn}
                                            onEdit={() => setShowConfig(true)}
                                            profileData={profile}
                                        />
                                    )}

                                    {/* Empty state when nothing is configured */}
                                    {contentBlocks.length === 0 && !showBioFallback && isOwn && (
                                        <div className="rounded-2xl border border-dashed border-white/[0.06] p-8 text-center space-y-3">
                                            <p className="text-white/20 text-sm italic">Tu espacio está vacío por ahora.</p>
                                            <button
                                                onClick={() => setShowConfig(true)}
                                                className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/50 hover:text-cyan-400 transition-colors"
                                            >
                                                + Añadir bloques
                                            </button>
                                        </div>
                                    )}

                                    {/* Actividad reciente */}
                                    <RecentActivityBlock
                                        userId={profile.id}
                                        onViewAll={() => setActiveTab('activity')}
                                    />

                                    {/* Connections — mobile only */}
                                    <div className="lg:hidden">
                                        <ConnectionsBlock userId={profile.id} followCounts={null} />
                                    </div>

                                    {/* Owner add blocks CTA */}
                                    {isOwn && (
                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            onClick={() => setShowConfig(true)}
                                            className="w-full py-5 border border-dashed border-white/[0.06] rounded-2xl flex items-center justify-center gap-3 text-white/20 hover:text-white/40 hover:border-white/[0.12] transition-all"
                                        >
                                            <span className="text-xl leading-none">+</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Añadir bloque</span>
                                        </motion.button>
                                    )}
                                </div>
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
