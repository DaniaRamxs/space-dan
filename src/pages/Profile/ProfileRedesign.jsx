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
    const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'blog' | 'guestbook'
    const [showConfig, setShowConfig] = useState(false);

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

            // Carga resiliente de datos adicionales
            // Si fallan (ej. SQL no ejecutado), usamos valores por defecto
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
                <nav className="flex items-center justify-center md:justify-start gap-12 border-b border-white/5 pb-6">
                    <button
                        onClick={() => setActiveTab('identity')}
                        className={`text-[12px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'identity' ? 'text-cyan-400' : 'text-white/30 hover:text-white'
                            }`}
                    >
                        Identidad
                        {activeTab === 'identity' && <motion.div layoutId="tab" className="absolute -bottom-6 left-0 right-0 h-1 bg-cyan-400" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('blog')}
                        className={`text-[12px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'blog' ? 'text-cyan-400' : 'text-white/30 hover:text-white'
                            }`}
                    >
                        Bitácora
                        {activeTab === 'blog' && <motion.div layoutId="tab" className="absolute -bottom-6 left-0 right-0 h-1 bg-cyan-400" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('guestbook')}
                        className={`text-[12px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'guestbook' ? 'text-cyan-400' : 'text-white/30 hover:text-white'
                            }`}
                    >
                        Muro
                        {activeTab === 'guestbook' && <motion.div layoutId="tab" className="absolute -bottom-6 left-0 right-0 h-1 bg-cyan-400" />}
                    </button>
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

                        {activeTab === 'blog' && (
                            <BlogSection
                                title={`${profile.username}'s Knowledge Base`}
                                posts={posts}
                                isOwn={isOwn}
                            />
                        )}

                        {activeTab === 'guestbook' && (
                            <div className="py-20 text-center opacity-20 uppercase tracking-[0.5em] text-[10px] font-black">
                                Sección en construcción estelar... 📡
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </ProfileLayout>
    );
}
