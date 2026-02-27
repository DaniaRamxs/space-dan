/**
 * PublicProfilePage — perfil público de cualquier usuario.
 * Ruta: /profile/:userId
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../../supabaseClient';
import { ACHIEVEMENTS } from '../../hooks/useAchievements';
import { getUserGameRanks } from '../../services/supabaseScores';
import { useAuthContext } from '../../contexts/AuthContext';
import ActivityFeed from '../../components/Social/ActivityFeed';
import { activityService } from '../../services/activityService';
import { PostSkeleton } from '../../components/Skeletons/Skeleton';
import BlogPostCard from '../../components/Social/BlogPostCard';
import { profileSocialService } from '../../services/profile_social';
import { socialService } from '../../services/social';
import { getProductivityStats } from '../../services/productivity';
import { blogService } from '../../services/blogService';
import { PrivateUniverse } from '../../components/PrivateUniverse';
import { universeService } from '../../services/universe';
import * as storeService from '../../services/store';
import { useNavigate } from 'react-router-dom';
import { getUserDisplayName, getNicknameClass } from '../../utils/user';
import { UniverseProvider, useUniverse } from '../../contexts/UniverseContext.jsx';
import '../../banner-effects.css';
import '../../styles/NicknameStyles.css';

import { getFrameStyle, getLinkedFrameStyle, getLinkedGlowClass } from '../../utils/styles';

const GAME_NAMES = {
  asteroids: 'Asteroids', tetris: 'Tetris', snake: 'Snake', pong: 'Pong',
  memory: 'Memory', ttt: 'Tic Tac Toe', whack: 'Whack-a-Mole', color: 'Color Match',
  reaction: 'Reaction Time', '2048': '2048', blackjack: 'Blackjack',
  puzzle: 'Sliding Puzzle', invaders: 'Space Invaders', breakout: 'Breakout',
  flappy: 'Flappy Bird', mines: 'Buscaminas', dino: 'Dino Runner',
  connect4: 'Connect Four', simon: 'Simon Says', cookie: 'Cookie Clicker',
  maze: 'Maze', catch: 'Catch Game', dodge: 'Dodge Game',
};

export default function PublicProfilePage() {
  const { username } = useParams();
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [gameRanks, setGameRanks] = useState([]);
  const [cabinStats, setCabinStats] = useState(null);
  const [achIds, setAchIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Social state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activityLabel, setActivityLabel] = useState(null);
  const [activeTab, setActiveTab] = useState('records');
  const [posts, setPosts] = useState([]);
  const [partnership, setPartnership] = useState(null);
  const [bannerItem, setBannerItem] = useState(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // Determine if it's the current user's profile based on username
  const isOwnProfile = user && profile && user.id === profile.id;

  useEffect(() => {
    if (!username) return;

    // If it doesn't start with @, it's not a profile route (likely a 404)
    if (!username.startsWith('@')) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    load();
  }, [username]);

  // Dynamic Metadata
  useEffect(() => {
    if (profile?.username) {
      document.title = `${profile.username} (@${profile.username}) | Space Dan`;
    } else if (notFound) {
      document.title = `Usuario no encontrado | Space Dan`;
    }
  }, [profile, notFound]);

  async function load() {
    let isMountedLocal = true;
    setLoading(true);
    setNotFound(false);
    try {
      // Clean username from @ (at this point we know it has it)
      const cleanUsername = username.slice(1);

      const { data: prof, error } = await supabase
        .from('profiles')
        .select(`
          *,
          theme_item:equipped_theme(id, metadata),
          nick_style_item:equipped_nickname_style(id, metadata),
          primary_role_item:equipped_primary_role(id, title, metadata),
          secondary_role_item:equipped_secondary_role(id, title, metadata),
          ambient_sound_item:equipped_ambient_sound(id, title, metadata),
          banner_item:banner_item_id(id, title, metadata, preview_url),
          frame_item:frame_item_id(id, title, metadata, preview_url)
        `)
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (!isMountedLocal) return;
      if (error || !prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(prof);
      const targetUserId = prof.id;

      const [ranks, socialInfo, profileComments, cStats, userPosts, pData, achData] = await Promise.all([
        getUserGameRanks(targetUserId).catch(() => []),
        profileSocialService.getFollowCounts(targetUserId).catch(() => ({ followers: 0, following: 0 })),
        profileSocialService.getProfileComments(targetUserId).catch(() => []),
        getProductivityStats(targetUserId).catch(() => null),
        blogService.getUserPosts(targetUserId).catch(() => []),
        universeService.getProfilePartnership(targetUserId).catch(() => null),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', targetUserId).then(({ data }) => data || []).catch(() => [])
      ]);

      if (!isMountedLocal) return;

      setGameRanks(ranks || []);
      setCabinStats(cStats);
      setAchIds(achData.map(a => a.achievement_id));
      setFollowCounts(socialInfo);
      setComments(profileComments);
      setPosts(userPosts);
      setPartnership(pData);

      if (prof.banner_item) {
        setBannerItem(prof.banner_item);
      } else if (prof.banner_item_id) {
        storeService.getStoreItem(prof.banner_item_id)
          .then(item => { if (isMountedLocal) setBannerItem(item); })
          .catch(() => { });
      } else {
        setBannerItem(null);
      }

      // Activity status (non-blocking)
      socialService.getUserActivity(targetUserId)
        .then(label => { if (isMountedLocal) setActivityLabel(label); })
        .catch(() => { });

      if (user && user.id !== targetUserId) {
        profileSocialService.isFollowing(targetUserId)
          .then(following => { if (isMountedLocal) setIsFollowing(following); })
          .catch(() => { if (isMountedLocal) setIsFollowing(false); });
      }

      if (user && user.id !== targetUserId && !pData) {
        supabase
          .from('partnership_requests')
          .select('id')
          .eq('sender_id', user.id)
          .eq('receiver_id', targetUserId)
          .eq('status', 'pending')
          .maybeSingle()
          .then(({ data }) => { if (isMountedLocal) setHasPendingRequest(!!data); });
      }
    } catch (err) {
      console.error('[PublicProfilePage] load error:', err);
      setNotFound(true);
    } finally {
      if (isMountedLocal) setLoading(false);
    }
  }

  // Need to use profile.id for handleToggleFollow, handleAddComment, etc.
  const targetUserId = profile?.id;

  const handleToggleFollow = async () => {
    if (!user || !profile?.id) return alert('Debes iniciar sesión para seguir usuarios.');
    try {
      const { following } = await profileSocialService.toggleFollow(profile.id);
      setIsFollowing(following);
      setFollowCounts(prev => ({
        ...prev,
        followers: prev.followers + (following ? 1 : -1),
      }));
    } catch (err) {
      console.error('[handleToggleFollow]', err);
      alert('Error en el protocolo de seguimiento: ' + (err.message || 'Desconocido'));
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !profile?.id) return;
    if (!user) return alert('Debes iniciar sesión para comentar.');
    setSubmittingComment(true);
    try {
      const added = await profileSocialService.addProfileComment(profile.id, newComment);
      setComments(prev => [added, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('[handleAddComment]', err);
      alert('Error al publicar: ' + (err.message || 'Desconocido'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user || !profile?.id) return alert('Debes iniciar sesión.');
    setRequestLoading(true);
    try {
      await universeService.sendRequest(profile.id);
      setHasPendingRequest(true);
      alert('¡Solicitud de vínculo enviada! 🌌');
    } catch (err) {
      console.error('[handleSendRequest] Error:', err);
      const msg = err?.message || err?.error_description || JSON.stringify(err);
      // Detectar tabla inexistente
      if (msg.includes('relation') && msg.includes('does not exist')) {
        alert('❌ La tabla partnership_requests no existe en la base de datos.\n\nEjecuta el archivo supabase/partnership_requests.sql en el SQL Editor de Supabase.');
      } else if (msg.includes('row-level security') || msg.includes('violates row-level')) {
        alert('❌ Política RLS bloquea la inserción.\n\nAsegúrate de haber ejecutado las políticas en partnership_requests.sql.');
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        alert('Ya enviaste una solicitud a este usuario.');
        setHasPendingRequest(true);
      } else {
        alert(`❌ No se pudo enviar la solicitud:\n${msg}`);
      }
    } finally {
      setRequestLoading(false);
    }
  };


  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('¿Eliminar este mensaje del muro?')) return;
    try {
      await profileSocialService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      alert('Error al eliminar el comentario.');
    }
  };

  if (loading) return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <span className="text-cyan-500 font-black tracking-[0.3em] uppercase text-xs animate-pulse">sincronizando_perfil...</span>
    </main>
  );

  if (notFound) return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      <div className="mb-8 relative">
        <span className="text-9xl opacity-10 font-black">404</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl">📡</span>
        </div>
      </div>
      <h2 className="text-2xl font-black italic text-white mb-2 uppercase tracking-tighter">Usuario fuera de órbita</h2>
      <p className="text-white/40 max-w-xs mb-8 text-sm">El explorador {username.startsWith('@') ? username : `@${username}`} no ha sido encontrado en nuestro sector de la galaxia.</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/leaderboard" className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all">
          ← Ver Leaderboard
        </Link>
        <Link to="/" className="px-8 py-3 bg-cyan-500 text-black rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all hover:bg-cyan-400">
          Volver al Inicio
        </Link>
      </div>
    </main>
  );

  const unlockedAchs = ACHIEVEMENTS.filter(a => achIds.includes(a.id));
  const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;
  const topGames = Array.isArray(gameRanks)
    ? [...gameRanks].sort((a, b) => (b.max_score ?? 0) - (a.max_score ?? 0)).slice(0, 6)
    : [];

  // GAMER STATS CALCULATION
  const totalXp = Math.floor(Math.max(0, (profile?.balance || 0) + (unlockedAchs.length * 150) + (gameRanks.length * 200) + ((cabinStats?.total_focus_minutes || 0) * 2)));
  const baseLevel = Math.max(1, Math.floor(0.1 * Math.sqrt(totalXp)));
  const level = baseLevel;
  const nextLevelXp = Math.floor(Math.pow((level + 1) / 0.1, 2));
  const prevLevelXp = Math.floor(Math.pow(level / 0.1, 2));
  const currentXpProgress = totalXp - prevLevelXp;
  const levelXpRequirement = nextLevelXp - prevLevelXp;
  const progressPercent = Math.min(100, Math.max(0, (currentXpProgress / levelXpRequirement) * 100));

  const rankNames = ['Recluta Espacial', 'Explorador Novato', 'Cazador Cósmico', 'Piloto Estelar', 'Vanguardia', 'Comandante', 'Arquitecto Estelar', 'Leyenda Cósmica', 'Deidad Astral'];
  const rankName = rankNames[Math.min(Math.floor(level / 3), rankNames.length - 1)];

  const topGlobalRank = gameRanks.length > 0 ? Math.min(...gameRanks.map(r => Number(r.user_position))) : 'N/A';
  const bestRecord = gameRanks.length > 0 ? Math.max(...gameRanks.map(g => g.max_score || 0)) : 0;

  // Transformar datos para el UniverseProvider
  const universeProfile = profile ? {
    ...profile,
    equipped_theme_id: profile.theme_item?.id,
    equipped_theme_metadata: profile.theme_item?.metadata,
    equipped_nickname_style_id: profile.nick_style_item?.id,
    equipped_nickname_style_metadata: profile.nick_style_item?.metadata,
    equipped_primary_role: profile.primary_role_item,
    equipped_secondary_role: profile.secondary_role_item,
    nick_style_item: profile.nick_style_item,
    ambient_sound_item: profile.ambient_sound_item,
    primary_role_item: profile.primary_role_item,
    secondary_role_item: profile.secondary_role_item
  } : null;

  try {
    return (
      <UniverseProvider overrideProfile={universeProfile}>
        <ProfileContent
          profile={profile}
          gameRanks={gameRanks}
          cabinStats={cabinStats}
          unlockedAchs={unlockedAchs}
          followCounts={followCounts}
          comments={comments}
          posts={posts}
          partnership={partnership}
          bannerItem={bannerItem}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          activityLabel={activityLabel}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleToggleFollow={handleToggleFollow}
          handleAddComment={handleAddComment}
          handleDeleteComment={handleDeleteComment}
          handleSendRequest={handleSendRequest}
          newComment={newComment}
          setNewComment={setNewComment}
          submittingComment={submittingComment}
          progressPercent={progressPercent}
          totalXp={totalXp}
          nextLevelXp={nextLevelXp}
          level={level}
          rankName={rankName}
          topGlobalRank={topGlobalRank}
          bestRecord={bestRecord}
          userId={profile?.id}
        />
      </UniverseProvider>
    );
  } catch (err) {
    console.error('[PublicProfilePage] Rendering Error:', err);
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white">
        <h2 className="text-xl font-bold mb-2">Error de Sintonización 🛰️</h2>
        <p className="text-white/40 text-sm">{err.message}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-cyan-600 rounded-xl">Reintentar</button>
      </div>
    );
  }
}

function ProfileContent({
  profile, gameRanks, cabinStats, unlockedAchs, followCounts, comments, posts,
  partnership, bannerItem, isOwnProfile, isFollowing, activityLabel, activeTab,
  setActiveTab, handleToggleFollow, handleAddComment, handleDeleteComment,
  handleSendRequest, newComment, setNewComment, submittingComment,
  progressPercent, totalXp, nextLevelXp, level, rankName, topGlobalRank, bestRecord, userId
}) {
  const { nicknameStyle, primaryRole, secondaryRole, mood, ambientSound, isAmbientMuted, toggleAmbientMute } = useUniverse();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsSharing(true);
    setTimeout(() => setIsSharing(false), 2000);
  };

  const getSocialIcon = (id) => {
    const icons = {
      twitter: '🐦',
      instagram: '📸',
      github: '💻',
      discord: '👾',
      youtube: '📺',
      spotify: '🎵',
      custom: '🔗'
    };
    return icons[id] || '🔗';
  };

  return (
    <div className="min-h-screen bg-[#040408] text-white font-sans relative">
      <div className="fixed inset-0 bg-[url('/grid-pattern.png')] opacity-[0.02] pointer-events-none" />

      {/* Banner Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className={`h-64 md:h-80 w-full relative overflow-hidden bg-[#06060c] border-b border-white/5 transition-all duration-1000 ${bannerItem?.metadata?.animated ? 'animate-aurora' : ''}`}
        style={{
          backgroundImage: [
            bannerItem?.preview_url ? `url(${bannerItem.preview_url})` : null,
            bannerItem?.metadata?.gradient
              ? `linear-gradient(to right, ${bannerItem.metadata.gradient.join(', ')})`
              : (bannerItem?.metadata?.hex
                ? `radial-gradient(circle at top right, ${bannerItem.metadata.hex}66 0%, transparent 70%)`
                : (profile?.banner_color
                  ? `radial-gradient(circle at top right, ${profile.banner_color}66 0%, transparent 60%)`
                  : 'radial-gradient(circle at top right, rgba(139,92,246,0.1) 0%, transparent 60%)'
                )
              )
          ].filter(Boolean).join(', '),
          backgroundSize: bannerItem?.preview_url ? 'cover, auto' : 'auto',
          backgroundPosition: bannerItem?.preview_url ? 'center, center' : 'center',
        }}
      >
        {/* Effects Layers */}
        {bannerItem?.metadata?.fx === 'matrix' && <div className="absolute inset-0 banner-fx-matrix opacity-60 z-10"></div>}
        {bannerItem?.metadata?.fx === 'scanlines' && <div className="absolute inset-0 banner-fx-scanlines opacity-20"></div>}
        {bannerItem?.metadata?.fx === 'stars' && <div className="absolute inset-0 banner-fx-stars opacity-40"></div>}
        {bannerItem?.metadata?.fx === 'void' && <div className="absolute inset-0 banner-fx-void opacity-50"></div>}

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#040408]/20 to-[#040408]" />

        {/* Navigation Return */}
        <div className="absolute top-8 left-8 z-50">
          <Link to="/leaderboard" className="px-5 py-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all decoration-transparent">
            ← REGRESAR
          </Link>
        </div>
      </motion.div>

      {/* Profile Container */}
      <div className="max-w-7xl mx-auto px-6 -mt-16 md:-mt-20 relative z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

          {/* ASIDE: Identity Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-12 space-y-12">
            <div className="space-y-8">
              <div className="relative w-40 h-40">
                {/* Frame Handling */}
                {(() => {
                  const frameObj = getFrameStyle(profile?.frame_item_id);
                  const frameClass = frameObj?.className || '';
                  const isLv5 = profile?.frame_item_id === 'frame_link_lv5';

                  return (
                    <div
                      className={`relative w-full h-full flex items-center justify-center ${frameClass} ${!(frameClass || (frameObj && (frameObj.border || frameObj.backgroundImage || frameObj.className || frameObj.boxShadow))) ? 'rounded-[30%] overflow-hidden bg-black border border-white/20' : ''}`}
                      style={frameObj}
                    >
                      <div className={isLv5 ? 'marco-evolutivo-lv5-img-wrapper' : `w-full h-full rounded-[inherit] overflow-hidden`}>
                        <img src={profile?.avatar_url || '/default_user_blank.png'} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  );
                })()}

                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-xl z-50">
                  LVL {level}
                </div>
              </div>

              <div className="space-y-4">
                <h1 className={`text-display font-black tracking-tight leading-none ${getNicknameClass(profile)} text-white uppercase`}>
                  {getUserDisplayName(profile)}
                </h1>
                {profile?.pronouns && (
                  <span className="text-micro opacity-40 block uppercase tracking-widest">{profile.pronouns}</span>
                )}

                {/* Role Badges */}
                {(profile?.primary_role_item || profile?.secondary_role_item) && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {profile?.primary_role_item && (
                      <div className="relative group/role">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/50 to-cyan-500/50 rounded-full blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <span className="relative px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[9px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5 shadow-lg">
                          <span>🛡️</span> {profile.primary_role_item.title}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-sm text-white/50 leading-relaxed italic">
                  "{profile?.bio || 'Sin biografía estelar.'}"
                </p>
              </div>

              {/* Server Metrics Sidebar */}
              <div className="space-y-6 pt-12 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <span className="text-micro opacity-40 uppercase tracking-widest">Dancoins</span>
                  <span className="text-xl font-bold font-mono tracking-tighter">◈ {profile?.balance?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-micro opacity-40 uppercase tracking-widest">Racha Social</span>
                  <span className="text-xl font-bold font-mono text-white tracking-tighter">{profile?.streak || 0}D</span>
                </div>
                {topGlobalRank !== 'N/A' && (
                  <div className="flex justify-between items-end">
                    <span className="text-micro opacity-40 uppercase tracking-widest">Posición Global</span>
                    <span className="text-xl font-bold font-mono text-cyan-400 tracking-tighter">#{topGlobalRank}</span>
                  </div>
                )}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[9px] font-mono opacity-20 uppercase tracking-widest">
                    <span>Progreso Galáctico</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className="h-full bg-white/80"
                    />
                  </div>
                </div>
              </div>

              {/* Social Interactions */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleToggleFollow}
                    className={`flex-1 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isFollowing ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-white text-black hover:bg-white/90 shadow-[0_10px_20px_rgba(255,255,255,0.1)]'}`}
                  >
                    {isFollowing ? '✓ Siguiendo' : '+ Seguir'}
                  </button>
                  <Link to={`/cartas?to=${profile?.id}`} className="flex-1 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-center text-white/60 hover:text-white hover:bg-white/10 transition-all decoration-transparent">
                    MENSAJE
                  </Link>
                </div>
                {/* Partnership Logic */}
                {partnership ? (
                  <div className="pt-8 border-t border-white/5 w-full">
                    <PrivateUniverse partnership={partnership} />
                    <div className="mt-2 text-[9px] font-black tracking-[0.3em] text-purple-400/40 uppercase text-center">Universo Vinculado</div>
                  </div>
                ) : (
                  !isOwnProfile && user && (
                    <div className="pt-8 border-t border-white/5 w-full">
                      <button
                        onClick={handleSendRequest}
                        disabled={hasPendingRequest || requestLoading}
                        className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.4em] transition-all border ${hasPendingRequest
                          ? 'bg-white/5 border-white/10 text-white/20 cursor-default'
                          : 'bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-white/10 text-white/60 hover:text-white hover:border-purple-500/50 hover:from-purple-500/20 hover:to-cyan-500/20'
                          }`}
                      >
                        {requestLoading ? 'Sincronizando...' : (hasPendingRequest ? 'Solicitud Pendiente ⏳' : 'Solicitar Vínculo Estelar 🌌')}
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </aside>

          {/* MAIN: Navigation & Views */}
          <main className="lg:col-span-8 space-y-12">
            <nav className="flex gap-8 border-b border-white/5 overflow-x-auto no-scrollbar">
              <TabButton
                active={activeTab === 'activity'}
                onClick={() => setActiveTab('activity')}
                onMouseEnter={() => profile?.id && activityService.prefetchFeed(profile.id, 'user')}
              >
                Actividad
              </TabButton>
              <TabButton active={activeTab === 'records'} onClick={() => setActiveTab('records')}>Registros</TabButton>
              <TabButton active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')}>Logros</TabButton>
              <TabButton active={activeTab === 'wall'} onClick={() => setActiveTab('wall')}>Muro</TabButton>
            </nav>

            <div className="w-full max-w-2xl mx-auto min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-12"
                >
                  {activeTab === 'activity' && (
                    <div className="space-y-12">
                      <ActivityFeed userId={profile?.id} filter="user" />
                    </div>
                  )}

                  {activeTab === 'records' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gameRanks.length === 0 ? (
                        <div className="col-span-2 py-20 text-center text-micro opacity-20 uppercase tracking-widest">Sin registros detectados</div>
                      ) : (
                        gameRanks.map(rank => (
                          <div key={rank.game_id} className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 space-y-4 hover:bg-white/[0.02] transition-all">
                            <div className="flex justify-between items-start">
                              <h3 className="text-micro opacity-40 uppercase tracking-widest">{GAME_NAMES[rank.game_id] || rank.game_id}</h3>
                              <span className="text-[9px] font-mono opacity-20">RANK #{rank.user_position}</span>
                            </div>
                            <div className="text-3xl font-bold font-mono tracking-tighter">{(rank.max_score ?? 0).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'achievements' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {unlockedAchs.length === 0 ? (
                        <div className="col-span-4 py-20 text-center text-micro opacity-20 uppercase tracking-widest">Sin medallas sincronizadas</div>
                      ) : (
                        unlockedAchs.map(ach => (
                          <div key={ach.id} className="aspect-square flex flex-col items-center justify-center p-6 rounded-3xl bg-white/[0.01] border border-white/5 text-center group transition-all hover:bg-white/[0.02]">
                            <span className="text-4xl mb-3 grayscale group-hover:grayscale-0 transition-all duration-500 opacity-40 group-hover:opacity-100">{ach.icon}</span>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">{ach.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'wall' && (
                    <div className="space-y-12">
                      <div className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 space-y-6">
                        <textarea
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          placeholder={`Escribe algo en el muro de ${profile?.username}...`}
                          className="w-full bg-transparent border-none text-sm outline-none h-24 text-white opacity-80 resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddComment}
                            disabled={submittingComment}
                            className="text-micro font-black px-6 py-2 bg-white text-black rounded-xl hover:bg-white/90 transition-all uppercase tracking-widest disabled:opacity-50"
                          >
                            {submittingComment ? 'Emitiendo...' : 'Publicar Mensaje'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {comments.map(c => (
                          <div key={c.id} className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 flex gap-6 hover:bg-white/[0.02] transition-colors relative group">
                            <img src={c.author?.avatar_url || '/default_user_blank.png'} className="w-12 h-12 rounded-2xl object-cover opacity-60" />
                            <div className="space-y-1 flex-1">
                              <div className="flex justify-between items-center">
                                <Link to={`/@${c.author?.username}`} className="text-micro font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                                  {c.author?.username}
                                </Link>
                                {(user?.id === c.author_id || user?.id === profile?.id) && (
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="text-[10px] text-rose-500/40 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all font-black uppercase tracking-widest"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-white/50 leading-relaxed">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        {comments.length === 0 && (
                          <div className="py-20 text-center text-micro opacity-20 uppercase tracking-widest">El muro está vacío</div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTES REUTILIZABLES CON MICROINTERACCIONES ---

function StatCard({ title, value, icon, highlight = 'text-white' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.03)" }}
      className="flex flex-col items-start p-8 rounded-3xl bg-white/[0.01] border border-white/5 transition-all group/stat"
    >
      <span className="text-micro opacity-40 uppercase tracking-widest font-mono mb-4 group-hover/stat:opacity-60 transition-opacity">{title}</span>
      <div className={`text-display font-bold font-mono tracking-tighter ${highlight} tabular-nums`}>
        {value}
      </div>
      {icon && <div className="text-xl mt-6 opacity-20 group-hover/stat:opacity-40 transition-opacity">{icon}</div>}
    </motion.div>
  );
}

function TabButton({ active, onClick, onMouseEnter, children }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`relative py-4 text-heading font-black uppercase tracking-widest transition-all duration-300 ${active ? 'text-white' : 'text-white/20 hover:text-white/60'}`}
    >
      <span className="relative z-10">{children}</span>
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
        />
      )}
    </button>
  );
}
