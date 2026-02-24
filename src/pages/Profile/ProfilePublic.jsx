/**
 * PublicProfilePage — perfil público de cualquier usuario.
 * Ruta: /profile/:userId
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PetDisplay from '../../components/PetDisplay';
import { supabase } from '../../supabaseClient';
import { ACHIEVEMENTS } from '../../hooks/useAchievements';
import { getUserGameRanks } from '../../services/supabaseScores';
import { useAuthContext } from '../../contexts/AuthContext';
import ActivityFeed from '../../components/Social/ActivityFeed';
import BlogPostCard from '../../components/Social/BlogPostCard';
import { profileSocialService } from '../../services/profile_social';
import { socialService } from '../../services/social';
import { getProductivityStats } from '../../services/productivity';
import { blogService } from '../../services/blogService';
import { PrivateUniverse } from '../../components/PrivateUniverse';
import { universeService } from '../../services/universe';
import * as storeService from '../../services/store';
import { useNavigate } from 'react-router-dom';
import '../../banner-effects.css';

function getFrameStyle(frameItemId) {
  if (!frameItemId) return { border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' };
  const id = frameItemId.toLowerCase();

  // Marcos de Vínculo Especiales (Usando Clases CSS de styles.css)
  if (id === 'frame_link_lv1') return { className: 'marco-evolutivo-base marco-evolutivo-lv1' };
  if (id === 'frame_link_lv2') return { className: 'marco-evolutivo-base marco-evolutivo-lv2' };
  if (id === 'frame_link_lv3') return { className: 'marco-evolutivo-base marco-evolutivo-lv3' };
  if (id === 'frame_link_lv4') return { className: 'marco-evolutivo-base marco-evolutivo-lv4' };
  if (id === 'frame_link_lv5') return { className: 'marco-evolutivo-base marco-evolutivo-lv5' };

  if (id === 'frame_stars') return { border: '3px solid #ffd700', boxShadow: '0 0 20px rgba(255,215,0,0.8)' };
  if (id === 'frame_neon') return { border: '3px solid #00e5ff', boxShadow: '0 0 20px rgba(0,229,255,0.8)' };
  if (id === 'frame_pixel') return { border: '4px solid #ff6b35', boxShadow: '0 0 15px rgba(255,107,53,0.7)', imageRendering: 'pixelated' };
  if (id === 'frame_holo') return { border: '3px solid #b464ff', boxShadow: '0 0 20px rgba(180,100,255,0.8), 0 0 40px rgba(0,229,255,0.4)' };
  if (id === 'frame_crown') return { border: '4px solid #ffd700', boxShadow: '0 0 25px rgba(255,215,0,1), 0 0 50px rgba(255,215,0,0.4)' };
  return { border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' };
}

// Evolving frame for linked users — evolves based on evolution_level
function getLinkedFrameStyle(evolutionLevel) {
  const lvl = evolutionLevel || 1;
  if (lvl >= 5) return {
    border: 'none', padding: '4px', background: 'conic-gradient(from 0deg, #ff007f, #06b6d4, #8b5cf6, #ff007f)', borderRadius: '50%', boxShadow: '0 0 40px rgba(6,182,212,0.5)', animation: 'spinStriking 2s linear infinite'
  };
  if (lvl >= 4) return {
    border: '3px solid transparent', backgroundImage: 'linear-gradient(#000,#000), linear-gradient(45deg, #06b6d4, #f43f5e, #8b5cf6, #10b981)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 0 30px rgba(244,63,94,0.6)', animation: 'gradientFlowStriking 3s infinite'
  };
  if (lvl >= 3) return {
    border: '3px solid transparent', backgroundImage: 'linear-gradient(#000,#000), linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 0 25px rgba(139,92,246,0.7)', animation: 'rotationGradientStriking 4s linear infinite'
  };
  if (lvl >= 2) return {
    border: '2px solid #8b5cf6', boxShadow: '0 0 20px rgba(139,92,246,0.8)', animation: 'pulseAuraStriking 2s infinite alternate ease-in-out'
  };
  return {
    border: '2px solid #06b6d4', boxShadow: '0 0 15px rgba(6,182,212,0.6)'
  };
}

function getLinkedGlowClass(evolutionLevel) {
  if (evolutionLevel >= 5) return 'from-pink-500 via-purple-500 to-cyan-500';
  if (evolutionLevel >= 4) return 'from-purple-500 to-cyan-500';
  if (evolutionLevel >= 3) return 'from-purple-600 to-violet-500';
  return 'from-purple-600 to-cyan-500';
}

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
  const { userId } = useParams();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const isOwnProfile = user?.id === userId;

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

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId]);

  async function load() {
    let isMounted = true;
    setLoading(true);
    setNotFound(false);
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, balance, banner_color, frame_item_id, created_at, bio')
        .eq('id', userId)
        .maybeSingle();

      if (!isMounted) return;
      if (!prof) { setNotFound(true); setLoading(false); return; }
      setProfile(prof);

      const [ranks, achs, socialInfo, profileComments, cStats, userPosts, pData] = await Promise.all([
        getUserGameRanks(userId).catch(() => []),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
        profileSocialService.getFollowCounts(userId).catch(() => ({ followers: 0, following: 0 })),
        profileSocialService.getProfileComments(userId).catch(() => []),
        getProductivityStats(userId).catch(() => null),
        blogService.getUserPosts(userId).catch(() => []),
        universeService.getProfilePartnership(userId).catch(() => null)
      ]);

      if (!isMounted) return;

      setGameRanks(ranks || []);
      setCabinStats(cStats);
      setAchIds((achs.data || []).map(a => a.achievement_id));
      setFollowCounts(socialInfo);
      setComments(profileComments);
      setPosts(userPosts);
      setPartnership(pData);

      if (prof.banner_item_id) {
        storeService.getStoreItem(prof.banner_item_id)
          .then(setBannerItem)
          .catch(() => { });
      } else {
        setBannerItem(null);
      }

      // Activity status (non-blocking)
      socialService.getUserActivity(userId)
        .then(label => { if (isMounted) setActivityLabel(label); })
        .catch(() => { });

      if (user && user.id !== userId) {
        profileSocialService.isFollowing(userId)
          .then(following => { if (isMounted) setIsFollowing(following); })
          .catch(() => { if (isMounted) setIsFollowing(false); });
      }
      if (user && user.id !== userId && !pData) {
        supabase
          .from('partnership_requests')
          .select('id')
          .eq('sender_id', user.id)
          .eq('receiver_id', userId)
          .eq('status', 'pending')
          .maybeSingle()
          .then(({ data }) => { if (isMounted) setHasPendingRequest(!!data); });
      }
    } catch (err) {
      console.error('[PublicProfilePage]', err);
    } finally {
      if (isMounted) setLoading(false);
    }
  }

  const handleToggleFollow = async () => {
    if (!user) return alert('Debes iniciar sesión para seguir usuarios.');
    try {
      const { following } = await profileSocialService.toggleFollow(userId);
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
    if (!newComment.trim()) return;
    if (!user) return alert('Debes iniciar sesión para comentar.');
    setSubmittingComment(true);
    try {
      const added = await profileSocialService.addProfileComment(userId, newComment);
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
    if (!user) return alert('Debes iniciar sesión.');
    setRequestLoading(true);
    try {
      await universeService.sendRequest(userId);
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
    <main className="card" style={{ padding: 40, textAlign: 'center' }}>
      <span className="blinkText" style={{ color: 'var(--accent)' }}>cargando_perfil...</span>
    </main>
  );

  if (notFound) return (
    <main className="card" style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--text)', opacity: 0.7 }}>Usuario no encontrado.</p>
      <Link to="/leaderboard" style={{ color: 'var(--accent)', marginTop: 12, display: 'inline-block' }}>
        ← Volver al leaderboard
      </Link>
    </main>
  );

  const unlockedAchs = ACHIEVEMENTS.filter(a => achIds.includes(a.id));
  const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;
  const topGames = [...gameRanks].sort((a, b) => (b.max_score ?? 0) - (a.max_score ?? 0)).slice(0, 6);

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

  return (
    <div className="w-full max-w-7xl mx-auto min-h-[100dvh] pb-24 text-white font-sans flex flex-col gap-12 pt-8" style={{ background: 'transparent' }}>

      {/* 1️⃣ HERO SECTION (v2.5) */}
      <section className="profile-v2-hero relative w-full rounded-[3rem] overflow-hidden border border-white/10 group/hero shadow-[0_40px_100px_rgba(0,0,0,0.4)]">

        {/* Animated Mesh Background */}
        <div className="profile-v2-mesh opacity-30 group-hover/hero:opacity-50 transition-opacity duration-1000"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-10 pointer-events-none"></div>

        {/* Dynamic Banner Overlay / Shop Banner */}
        <div
          className={`profile-v2-banner-overlay transition-all duration-1000 ${bannerItem ? 'animate-pulse-slow' : ''} ${bannerItem?.metadata?.animated ? 'animate-aurora' : ''}`}
          style={{
            background: bannerItem?.metadata?.gradient
              ? `linear-gradient(to right, ${bannerItem.metadata.gradient.join(', ')})`
              : bannerItem?.metadata?.hex
                ? `radial-gradient(circle at top right, ${bannerItem.metadata.hex}66 0%, transparent 70%)`
                : profile.banner_color
                  ? `radial-gradient(circle at top right, ${profile.banner_color}66 0%, transparent 60%)`
                  : 'radial-gradient(circle at top right, rgba(139,92,246,0.2) 0%, transparent 60%)',
            backgroundImage: bannerItem?.preview_url ? `url(${bannerItem.preview_url})` : undefined,
            backgroundSize: bannerItem?.preview_url ? 'cover' : undefined,
            backgroundPosition: bannerItem?.preview_url ? 'center' : undefined,
            opacity: bannerItem?.preview_url ? 0.4 : 1
          }}
        >
          {bannerItem?.metadata?.fx === 'matrix' && <div className="absolute inset-0 banner-fx-matrix opacity-20"></div>}
          {bannerItem?.metadata?.fx === 'scanlines' && <div className="absolute inset-0 banner-fx-scanlines opacity-30"></div>}
          {bannerItem?.metadata?.fx === 'stars' && <div className="absolute inset-0 banner-fx-stars"></div>}
        </div>

        <div className="relative z-10 p-8 md:p-16 flex flex-col items-center text-center">

          {/* Top Actions */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 flex flex-col items-end gap-2 md:gap-3 z-[60]">
            {!isOwnProfile && (
              <div className="flex items-center gap-1.5 md:gap-2">
                <button
                  onClick={handleToggleFollow}
                  className={`px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${isFollowing ? 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10' : 'bg-cyan-600 text-white shadow-[0_10px_20px_rgba(6,182,212,0.3)] hover:scale-105'}`}
                >
                  {isFollowing ? '✓ Siguiendo' : '+ Seguir'}
                </button>
                <Link to={`/cartas?to=${userId}`} className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all decoration-transparent">
                  ✉️ <span className="hidden md:inline">Mensaje</span>
                </Link>
              </div>
            )}
            {activityLabel && <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-cyan-400/10 text-cyan-400 px-2 md:px-3 py-1 rounded-full border border-cyan-400/20">{activityLabel}</span>}
          </div>

          <div className="absolute top-4 left-4 md:top-8 md:left-8">
            <Link to="/leaderboard" className="px-3 py-1.5 md:px-4 md:py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/10 transition-all decoration-transparent">
              ← <span className="hidden md:inline">REGRESAR</span><span className="md:hidden">VOLVER</span>
            </Link>
          </div>

          <div className="relative mb-8 mt-24 md:mt-0">
            <div className="relative w-40 h-40 group/avatar">
              <div className={`absolute -inset-4 bg-gradient-to-r ${partnership ? getLinkedGlowClass(partnership.evolution_level) : 'from-purple-600 to-cyan-500'} rounded-full blur-2xl opacity-20 group-hover/avatar:opacity-50 transition duration-1000`}></div>
              <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl bg-black" style={partnership ? getLinkedFrameStyle(partnership.evolution_level) : getFrameStyle(profile.frame_item_id)}>
                <img src={profile?.avatar_url || '/default_user_blank.png'} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              {/* Pet Overlay */}
              <div className="absolute -left-8 -bottom-4 pointer-events-none drop-shadow-[0_0_20px_rgba( cyan , 0.5 )] z-30 scale-x-[-1] animate-float">
                <PetDisplay userId={userId} size={60} showName={false} />
              </div>
            </div>

            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 px-8 py-2.5 rounded-2xl border font-black text-sm tracking-tighter z-40 whitespace-nowrap transition-all duration-500 shadow-2xl ${level >= 10 ? 'bg-gradient-to-r from-yellow-400 via-white to-yellow-400 text-black border-yellow-200 animate-shimmer bg-[length:200%_100%]' : 'bg-[#09090b] border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'}`}>
              NIVEL {level}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <h1 className="text-4xl font-black uppercase tracking-[0.1em] bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 drop-shadow-2xl">
              {profile?.username || 'Jugador'}
            </h1>
          </div>
          <p className="text-[12px] font-black text-purple-400 uppercase tracking-[0.4em] mb-4 mt-2 opacity-80">
            {rankName}
          </p>

          {/* XP Bar Premium */}
          <div className="w-full max-w-sm mt-6 px-6">
            <div className="flex justify-between items-end mb-2">
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">Progreso de Nivel</span>
                <span className="text-xs font-black italic text-cyan-400 tracking-tighter">{Math.floor(totalXp).toLocaleString()} <span className="text-[9px] opacity-40 not-italic uppercase font-sans">XP Total</span></span>
              </div>
              <span className="text-[10px] font-black text-purple-400 font-mono">META: {Math.floor(nextLevelXp).toLocaleString()}</span>
            </div>
            <div className="profile-v2-xp-bar">
              <div
                className="profile-v2-xp-fill transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="mt-1.5 text-right">
              <span className="text-[9px] font-black text-white/10 tracking-[0.4em] uppercase">{progressPercent}% completado</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-6">
            <div className="p-6 rounded-[2.5rem] bg-black/40 border border-white/5 min-w-[300px] max-w-lg shadow-inner group/bio relative overflow-hidden">
              <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover/bio:opacity-100 transition-opacity"></div>
              <p className={`text-sm leading-relaxed relative z-10 transition-colors ${profile.bio ? 'text-gray-300 group-hover:text-white' : 'text-gray-500 italic'}`}>"{profile.bio || 'Sin biografía estelar.'}"</p>
            </div>

            {partnership ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative group/univ">
                  <div className="absolute -inset-8 bg-purple-500/20 blur-3xl rounded-full opacity-0 md:group-hover/univ:opacity-100 transition-opacity duration-1000"></div>
                  <PrivateUniverse partnership={partnership} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-black tracking-[0.4em] text-purple-400 uppercase animate-pulse">Universo Vinculado</div>
                  <Link to={`/profile/${partnership.partner_id}`} className="text-[10px] font-black text-white/20 hover:text-purple-400 transition-colors uppercase tracking-widest">
                    Ver perfil de @{partnership.partner_username} →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center">
                <div className="px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.3em] text-white/10">Este perfil flota solo en el vacío</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2️⃣ STATS CORE GRID */}
      <section className="px-6 md:px-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_purple]"></span>
            Métricas del Servidor
          </h2>
          <div className="h-px flex-1 bg-white/5 mx-6"></div>
          <span className="text-[9px] font-mono text-purple-500/40">v2.5.0-PUBLIC</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Seguidores" value={followCounts.followers} icon="👥" highlight="text-purple-400" />
          <StatCard title="Siguiendo" value={followCounts.following} icon="✨" highlight="text-purple-200" />
          <StatCard title="Rank Global" value={topGlobalRank !== 'N/A' ? `#${topGlobalRank}` : '-'} icon="🌍" highlight="text-green-400" />
          <StatCard title="Economía" value={`◈ ${profile.balance || 0}`} icon="💎" highlight="text-cyan-400" />
        </div>
      </section>

      {/* 3️⃣ TABS */}
      <section className="px-6 md:px-0 flex-1 flex flex-col min-h-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex flex-nowrap bg-black/40 backdrop-blur-2xl rounded-3xl p-2 shadow-2xl border border-white/5 overflow-x-auto no-scrollbar gap-1 mb-8">
          <TabButton active={activeTab === 'records'} onClick={() => setActiveTab('records')}>🏆 Archivos</TabButton>
          <TabButton active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')}>🎖️ Medallas</TabButton>
          <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')}>🛰️ Actividad</TabButton>
          <TabButton active={activeTab === 'wall'} onClick={() => setActiveTab('wall')}>💬 Muro</TabButton>
        </div>

        <div className="mt-5 flex-1 mb-8">

          {/* TAB: RECORDS */}
          {activeTab === 'records' && (
            <div className="animate-fade-in-up">
              {gameRanks.length === 0 ? (
                <div className="text-center p-12 border border-white/5 rounded-2xl bg-[#0a0a0f] text-gray-500 text-sm">Sin récords registrados.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gameRanks.map(rank => (
                    <div key={rank.game_id} className="group relative bg-black/40 border border-white/5 rounded-[2rem] p-6 hover:border-cyan-500/30 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-cyan-500/10 transition-colors"></div>

                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                          🎮
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-black text-white/90 uppercase tracking-[0.2em]">{GAME_NAMES[rank.game_id] || rank.game_id}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] font-black text-cyan-500 font-mono tracking-tighter">SCORE: {(rank.max_score ?? 0).toLocaleString()}</span>
                            <div className="h-2 w-px bg-white/10"></div>
                            <span className="text-[10px] font-black text-purple-400 font-mono">RANK #{rank.user_position}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex gap-1 h-1">
                        <div className="flex-1 bg-cyan-500/40 rounded-full"></div>
                        <div className="flex-1 bg-white/5 rounded-full"></div>
                        <div className="flex-1 bg-white/5 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="animate-fade-in-up">
              <div className="mb-4 flex justify-between items-end px-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Insignias Desbloqueadas</span>
                <span className="text-[11px] text-cyan-500 font-mono bg-cyan-900/20 px-2.5 py-1 rounded border border-cyan-800/40">{unlockedAchs.length}/{ACHIEVEMENTS.length}</span>
              </div>
              {unlockedAchs.length === 0 ? (
                <div className="text-center p-12 border border-white/5 rounded-2xl bg-[#0a0a0f] text-gray-500 text-sm">El usuario no tiene logros visibles.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {unlockedAchs.map(ach => (
                    <div key={ach.id} className="group relative p-6 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-purple-500/30 transition-all overflow-hidden flex flex-col items-center text-center">
                      <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-125 group-hover:rotate-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{ach.icon}</div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">{ach.title}</h4>
                      <p className="text-[10px] text-white/40 leading-relaxed font-medium">{ach.desc}</p>
                      <div className="mt-4 pt-4 border-t border-white/5 w-full">
                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-[0.2em]">Sincronizado ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ACTIVITY (SOCIAL FEED + BLOG POSTS) */}
          {activeTab === 'activity' && (
            <div className="animate-fade-in-up flex flex-col items-center gap-8">

              {/* Blog posts del piloto */}
              {posts.length > 0 && (
                <div className="w-full max-w-2xl flex flex-col gap-4">
                  <div className="flex items-center px-2">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">📖 Entradas de Bitácora</h3>
                  </div>
                  {posts.map(post => (
                    <BlogPostCard
                      key={post.id}
                      post={post}
                      authorProfile={profile}
                      onActionComplete={() => { }}
                    />
                  ))}
                </div>
              )}

              {/* Feed de transmisiones sociales */}
              <div className="w-full max-w-2xl border-t border-white/10 pt-6">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] px-2 mb-6">🛰️ Transmisiones Sociales</h3>
                <ActivityFeed userId={userId} />
              </div>
            </div>
          )}

          {/* TAB: WALL */}
          {activeTab === 'wall' && (
            <div className="animate-fade-in-up">
              <div className="profile-v2-section glass-blue space-y-6 mb-8">
                <form onSubmit={handleAddComment}>
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.4em]">Dejar un mensaje</h3>
                    <div className="relative">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Transmite tus pensamientos..."
                        maxLength={500}
                        className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm text-white resize-none min-h-[120px] outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="self-end px-8 py-3 bg-cyan-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {submittingComment ? 'Procesando...' : 'Publicar en Muro'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                {comments.map(c => (
                  <div
                    key={c.id}
                    className="group relative bg-black/20 border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.03] transition-all flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                          <img className="w-full h-full object-cover" src={c.author?.avatar_url || '/default_user_blank.png'} alt="Avatar" />
                        </div>
                        <div>
                          <Link to={`/profile/${c.author_id}`} className="text-xs font-black text-cyan-400 hover:text-white transition-colors uppercase tracking-widest">
                            {c.author?.username}
                          </Link>
                          <span className="block text-[8px] font-black text-white/20 uppercase mt-0.5">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {(user?.id === c.author_id || user?.id === userId) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="pl-1.5">
                      <p className="text-xs text-white/70 leading-relaxed break-words font-medium">{c.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center p-24 bg-black/20 rounded-[3rem] border border-white/5">
                    <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">El muro de transmisiones está vacío</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// --- SUBCOMPONENTES REUTILIZABLES ---
function StatCard({ title, value, icon, highlight = 'text-white' }) {
  return (
    <div className="profile-v2-stat-card flex flex-col items-center justify-center text-center group">
      <div className="text-2xl mb-2 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">{icon}</div>
      <div className={`text-xl md:text-2xl font-black italic tracking-tighter ${highlight} leading-none`}>{value}</div>
      <div className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-black mt-2">{title}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`profile-v2-tab-btn ${active ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}
