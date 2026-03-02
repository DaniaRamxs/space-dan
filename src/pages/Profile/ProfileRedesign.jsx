import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { newProfileService } from '../../services/newProfileService';
import { profileSocialService } from '../../services/profile_social';

import { ProfileLayout } from '../../components/ProfileRedesign/ProfileLayout';
import { ProfileHeader } from '../../components/ProfileRedesign/ProfileHeader';
import { BlogSection } from '../../components/ProfileRedesign/BlogSection';
import { BlocksRenderer } from '../../components/ProfileRedesign/BlocksRenderer';
import { ThemeConfigModal } from '../../components/ProfileRedesign/ThemeConfigModal';
import BlogComposer from '../../components/ProfileRedesign/BlogComposer';
import PostComposer from '../../components/Social/PostComposer';
import ActivityFeed from '../../components/Social/ActivityFeed';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'activity' | 'blog' | 'guestbook'
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

            // Fetch real Level data
            try {
                const { level } = await newProfileService.getLevelData(prof.id);
                setProfile(prev => ({ ...prev, level: level }));
            } catch (e) { console.warn('Level sync error'); }

            try {
                const themeData = await newProfileService.getProfileTheme(prof.id).catch(() => newProfileService.getDefaultTheme(prof.id));
                setTheme(themeData);
            } catch (e) { setTheme(newProfileService.getDefaultTheme(prof.id)); }

            try {
                const blocksData = await newProfileService.getProfileBlocks(prof.id).catch(() => [
                    { block_type: 'stats', order_index: 0, is_active: true },
                    { block_type: 'thought', order_index: 1, is_active: true },
                    { block_type: 'spotify', order_index: 2, is_active: true }
                ]);
                setBlocks(blocksData);
            } catch (e) { setBlocks([]); }

            try {
                const postsData = await newProfileService.getBlogPosts(prof.id).catch(() => []);
                setPosts(postsData);
            } catch (e) { setPosts([]); }

            if (user && user.id !== prof.id) {
                try {
                    const following = await profileSocialService.isFollowing(prof.id);
                    setIsFollowing(following);
                } catch (e) { setIsFollowing(false); }
            }

        } catch (e) {
            console.error('Profile Redesign Load Error:', e);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 border-t-4 border-cyan-500 rounded-full animate-spin shadow-[0_0_50px_rgba(6,182,212,0.5)]" />
            <span className="text-[10px] uppercase font-black tracking-[0.5em] text-cyan-400 animate-pulse italic">
                Sincronizando Realidad... 🛰️
            </span>
        </div>
    );

    if (notFound) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center text-white space-y-8">
            <div className="text-8xl opacity-10 font-black italic select-none">404</div>
            <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Explorador fuera de alcance</h2>
                <p className="text-white/40 text-sm max-w-xs mx-auto italic">El sector "@{username}" no responde a nuestras señales estelares...</p>
            </div>
            <Link to="/" className="px-12 py-3 bg-white text-black text-[12px] font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400 transition-all hover:scale-105">
                Regresar a Base
            </Link>
        </div>
    );

    const isOwn = user?.id === profile.id;

    const tabs = [
        { id: 'identity', label: 'Identidad', icon: '👤' },
        { id: 'activity', label: 'Actividad', icon: '📡' },
        { id: 'blog', label: 'Bitácora', icon: '✍️' },
        { id: 'guestbook', label: 'Muro', icon: '💬' },
    ];

    return (
        <ProfileLayout theme={theme}>
            <ProfileHeader
                profile={profile}
                theme={theme}
                isOwn={isOwn}
                isFollowing={isFollowing}
                onFollow={async () => {
                    if (!user) return alert('Debes iniciar sesión para seguir.');
                    const { following } = await profileSocialService.toggleFollow(profile.id);
                    setIsFollowing(following);
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

            <div className="max-w-5xl mx-auto px-6 py-20 space-y-24">
                {/* Navigation Tabs */}
                <nav className="flex items-center justify-start md:justify-start gap-6 md:gap-12 border-b border-white/5 pb-6 overflow-x-auto no-scrollbar scroll-smooth px-4">
                    {tabs.map((tab, idx) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.15em] md:tracking-[0.3em] transition-all relative whitespace-nowrap flex items-center gap-2 py-2 ${idx === 0 ? 'ml-0' : ''} ${activeTab === tab.id ? 'text-cyan-400' : 'text-white/30 hover:text-white'
                                }`}
                        >
                            <span className="hidden md:inline">{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="tab" className="absolute -bottom-[25px] left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Dynamic Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-20 min-h-[500px]"
                    >
                        {activeTab === 'identity' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                                <div className="lg:col-span-8 flex flex-col gap-12">
                                    <BlocksRenderer
                                        blocks={blocks}
                                        userId={profile.id}
                                        isOwn={isOwn}
                                        onEdit={() => setShowConfig(true)}
                                        profileData={profile}
                                    />
                                </div>
                                <aside className="lg:col-span-4 space-y-12">
                                    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Métricas de Orbitador</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-white/40 uppercase">Nivel Estelar</span>
                                                <span className="text-2xl font-black text-white italic">{profile.level || 1}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-white/40 uppercase">Dancoins</span>
                                                <span className="text-2xl font-black text-cyan-400 italic">◈ {profile.balance?.toLocaleString() || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-white/40 uppercase">Racha</span>
                                                <span className="text-2xl font-black text-violet-500 italic">{profile.streak || 0}D</span>
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="max-w-2xl mx-auto space-y-12">
                                {isOwn && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-4">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Nueva Transmisión</span>
                                        </div>
                                        <PostComposer onPostCreated={load} />
                                    </div>
                                )}
                                <ActivityFeed userId={profile.id} />
                            </div>
                        )}

                        {activeTab === 'blog' && (
                            <div className="space-y-12 max-w-4xl mx-auto">
                                {isOwn && !showComposer && (
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => setShowComposer(true)}
                                            className="px-12 py-4 rounded-[1.5rem] bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-cyan-400 transition-all shadow-xl hover:scale-105 active:scale-95"
                                        >
                                            ✍️ Escribir Nueva Entrada de Bitácora
                                        </button>
                                    </div>
                                )}

                                {showComposer && isOwn && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-8"
                                    >
                                        <div className="flex justify-between items-center px-6">
                                            <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Editor de Bitácora</h3>
                                            <button onClick={() => setShowComposer(false)} className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest">Cerrar Editor</button>
                                        </div>
                                        <BlogComposer
                                            onPostCreated={() => { load(); setShowComposer(false); }}
                                            onCancel={() => setShowComposer(false)}
                                        />
                                    </motion.div>
                                )}

                                <BlogSection
                                    title={`${profile.username}'s Knowledge Base`}
                                    posts={posts}
                                    isOwn={isOwn}
                                    username={profile.username}
                                />
                            </div>
                        )}

                        {activeTab === 'guestbook' && (
                            <div className="py-20 text-center opacity-20 uppercase tracking-[0.5em] text-[10px] font-black flex flex-col items-center gap-4">
                                <span className="text-6xl">📡</span>
                                Muro de Comunicaciones en construcción Estelar...
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </ProfileLayout>
    );
}
