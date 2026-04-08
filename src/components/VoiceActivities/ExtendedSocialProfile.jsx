/**
 * ExtendedSocialProfile.jsx
 * Sistema de perfiles sociales extendidos con estadísticas públicas
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Trophy, Star, Music, Gamepad2, MessageCircle,
    Calendar, MapPin, Link, Shield, Crown, Zap,
    Heart, Users, TrendingUp, Award, Target, Clock
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';

export default function ExtendedSocialProfile({ userId, isMinimized = false }) {
    const { user: currentUser, profile: currentProfile } = useAuthContext();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [friends, setFriends] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview, games, achievements, activity

    useEffect(() => {
        if (!userId) return;
        loadUserProfile();
    }, [userId]);

    const loadUserProfile = async () => {
        try {
            // Cargar perfil básico
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileData) {
                setProfile(profileData);
                
                // Cargar estadísticas
                await Promise.all([
                    loadUserStats(userId),
                    loadAchievements(userId),
                    loadRecentActivity(userId),
                    loadFriends(userId)
                ]);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const loadUserStats = async (uid) => {
        try {
            const { data } = await supabase
                .from('user_statistics')
                .select('*')
                .eq('user_id', uid)
                .single();

            if (data) {
                setStats({
                    totalPlayTime: data.total_play_time || 0,
                    gamesPlayed: data.games_played || 0,
                    winRate: data.win_rate || 0,
                    favoriteGame: data.favorite_game || 'Unknown',
                    level: data.level || 1,
                    experience: data.experience || 0,
                    coinsEarned: data.coins_earned || 0,
                    achievementsUnlocked: data.achievements_unlocked || 0,
                    socialScore: data.social_score || 0,
                    reputation: data.reputation || 0
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const loadAchievements = async (uid) => {
        try {
            const { data } = await supabase
                .from('user_achievements')
                .select('*')
                .eq('user_id', uid)
                .order('unlocked_at', { ascending: false })
                .limit(10);

            setAchievements(data || []);
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    };

    const loadRecentActivity = async (uid) => {
        try {
            const { data } = await supabase
                .from('user_activity')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false })
                .limit(10);

            setRecentActivity(data || []);
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    };

    const loadFriends = async (uid) => {
        try {
            const { data } = await supabase
                .from('friendships')
                .select('profiles!friend_id(*)')
                .eq('user_id', uid)
                .limit(6);

            setFriends(data?.map(f => f.profiles) || []);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    };

    const followUser = async () => {
        if (!currentUser || isFollowing) return;
        
        try {
            await supabase
                .from('follows')
                .insert({
                    follower_id: currentUser.id,
                    following_id: userId
                });
            
            setIsFollowing(true);
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    const unfollowUser = async () => {
        if (!currentUser || !isFollowing) return;
        
        try {
            await supabase
                .from('follows')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('following_id', userId);
            
            setIsFollowing(false);
        } catch (error) {
            console.error('Error unfollowing user:', error);
        }
    };

    const formatPlayTime = (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getLevelColor = (level) => {
        const colors = [
            'from-gray-600 to-gray-700',
            'from-green-600 to-emerald-700',
            'from-blue-600 to-indigo-700',
            'from-purple-600 to-pink-700',
            'from-amber-600 to-orange-700',
            'from-red-600 to-rose-700'
        ];
        return colors[Math.min(Math.floor(level / 10), colors.length - 1)];
    };

    const getActivityIcon = (type) => {
        const icons = {
            'game_played': Gamepad2,
            'achievement': Trophy,
            'social': Users,
            'music': Music,
            'message': MessageCircle
        };
        return icons[type] || Star;
    };

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10004] bg-black/80 backdrop-blur-xl rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-white">
                    <User size={16} className="text-purple-400" />
                    <span className="text-xs font-bold">Perfil</span>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/80 backdrop-blur-xl">
                <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p>Cargando perfil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/80 backdrop-blur-xl">
            <div className="w-full max-w-4xl h-[90vh] max-h-[800px] bg-gradient-to-br from-purple-900/40 via-black/60 to-pink-900/40 backdrop-blur-3xl rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden">
                <div className="flex h-full">
                    {/* Sidebar de navegación */}
                    <div className="w-64 bg-black/40 border-r border-purple-500/20 p-6">
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative">
                                <img 
                                    src={profile.avatar_url || '/default-avatar.png'} 
                                    className="w-24 h-24 rounded-full border-4 border-purple-500/30 shadow-xl"
                                    alt={profile.username}
                                />
                                {profile.is_premium && (
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-1">
                                        <Crown size={16} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl font-black text-white mt-4">{profile.username}</h2>
                            <p className="text-sm text-white/60">{profile.bio || 'Sin biografía'}</p>
                        </div>

                        {/* Tabs de navegación */}
                        <div className="space-y-2">
                            {[
                                { id: 'overview', label: 'Resumen', icon: User },
                                { id: 'games', label: 'Juegos', icon: Gamepad2 },
                                { id: 'achievements', label: 'Logros', icon: Trophy },
                                { id: 'activity', label: 'Actividad', icon: Clock }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                                    }`}
                                >
                                    <tab.icon size={18} />
                                    <span className="text-sm font-bold">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contenido principal */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <AnimatePresence mode="wait">
                            {activeTab === 'overview' && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    {/* Estadísticas principales */}
                                    {stats && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-6 rounded-2xl border border-purple-500/30">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Clock className="text-purple-400" size={20} />
                                                    <span className="text-xs text-purple-400 font-bold uppercase">Tiempo</span>
                                                </div>
                                                <div className="text-2xl font-black text-white">{formatPlayTime(stats.totalPlayTime)}</div>
                                            </div>
                                            
                                            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 p-6 rounded-2xl border border-green-500/30">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Gamepad2 className="text-green-400" size={20} />
                                                    <span className="text-xs text-green-400 font-bold uppercase">Partidas</span>
                                                </div>
                                                <div className="text-2xl font-black text-white">{stats.gamesPlayed}</div>
                                            </div>
                                            
                                            <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 p-6 rounded-2xl border border-amber-500/30">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Target className="text-amber-400" size={20} />
                                                    <span className="text-xs text-amber-400 font-bold uppercase">Win Rate</span>
                                                </div>
                                                <div className="text-2xl font-black text-white">{stats.winRate}%</div>
                                            </div>
                                            
                                            <div className={`bg-gradient-to-br ${getLevelColor(stats.level)} p-6 rounded-2xl border border-purple-500/30`}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Star className="text-white" size={20} />
                                                    <span className="text-xs text-white font-bold uppercase">Nivel</span>
                                                </div>
                                                <div className="text-2xl font-black text-white">{stats.level}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Información adicional */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                                                <MapPin size={18} className="text-purple-400" />
                                                Ubicación
                                            </h3>
                                            <p className="text-white/60">{profile.location || 'No especificada'}</p>
                                        </div>
                                        
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                                                <Calendar size={18} className="text-purple-400" />
                                                Miembro desde
                                            </h3>
                                            <p className="text-white/60">
                                                {new Date(profile.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    {currentUser?.id !== userId && (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={isFollowing ? unfollowUser : followUser}
                                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                                    isFollowing
                                                        ? 'bg-white/10 text-white/60 hover:bg-white/20'
                                                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500'
                                                }`}
                                            >
                                                {isFollowing ? 'Siguiendo' : 'Seguir'}
                                            </button>
                                            <button className="flex-1 py-3 bg-white/10 text-white/60 rounded-xl font-bold hover:bg-white/20 transition-all">
                                                <MessageCircle size={18} className="inline mr-2" />
                                                Mensaje
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'games' && (
                                <motion.div
                                    key="games"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <h3 className="text-2xl font-black text-white mb-6">Estadísticas de Juegos</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Aquí irían las estadísticas específicas de cada juego */}
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                            <h4 className="text-lg font-bold text-white mb-4">Connect4</h4>
                                            <div className="space-y-2 text-white/60">
                                                <p>Partidas: 245</p>
                                                <p>Victorias: 156</p>
                                                <p>Win Rate: 63.7%</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                            <h4 className="text-lg font-bold text-white mb-4">Ludo</h4>
                                            <div className="space-y-2 text-white/60">
                                                <p>Partidas: 189</p>
                                                <p>Victorias: 98</p>
                                                <p>Win Rate: 51.9%</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'achievements' && (
                                <motion.div
                                    key="achievements"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <h3 className="text-2xl font-black text-white mb-6">Logros Desbloqueados</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {achievements.map((achievement, index) => (
                                            <motion.div
                                                key={achievement.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 p-6 rounded-2xl border border-amber-500/30 text-center"
                                            >
                                                <div className="text-4xl mb-3">{achievement.icon}</div>
                                                <h4 className="text-lg font-black text-white mb-2">{achievement.name}</h4>
                                                <p className="text-sm text-white/60 mb-3">{achievement.description}</p>
                                                <div className="text-xs text-amber-400">
                                                    {new Date(achievement.unlocked_at).toLocaleDateString()}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'activity' && (
                                <motion.div
                                    key="activity"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <h3 className="text-2xl font-black text-white mb-6">Actividad Reciente</h3>
                                    <div className="space-y-4">
                                        {recentActivity.map((activity, index) => (
                                            <motion.div
                                                key={activity.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10"
                                            >
                                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                                    <getActivityIcon(activity.type) className="text-purple-400" size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-medium">{activity.description}</p>
                                                    <p className="text-xs text-white/40">
                                                        {new Date(activity.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
