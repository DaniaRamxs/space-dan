/**
 * PublicProfilePage — perfil público de cualquier usuario.
 * Ruta: /profile/:userId
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PetDisplay from '../components/PetDisplay';
import { supabase } from '../supabaseClient';
import { ACHIEVEMENTS } from '../hooks/useAchievements';
import { getUserGameRanks } from '../services/supabaseScores';
import { useAuthContext } from '../contexts/AuthContext';
import { profileSocialService } from '../services/profile_social';
import { socialService } from '../services/social';
import { getProductivityStats } from '../services/productivity';

function getFrameStyle(frameItemId) {
  if (!frameItemId) return { border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' };
  const id = frameItemId.toLowerCase();
  if (id === 'frame_stars') return { border: '3px solid #ffd700', boxShadow: '0 0 20px rgba(255,215,0,0.8)' };
  if (id === 'frame_neon') return { border: '3px solid #00e5ff', boxShadow: '0 0 20px rgba(0,229,255,0.8)' };
  if (id === 'frame_pixel') return { border: '4px solid #ff6b35', boxShadow: '0 0 15px rgba(255,107,53,0.7)', imageRendering: 'pixelated' };
  if (id === 'frame_holo') return { border: '3px solid #b464ff', boxShadow: '0 0 20px rgba(180,100,255,0.8), 0 0 40px rgba(0,229,255,0.4)' };
  if (id === 'frame_crown') return { border: '4px solid #ffd700', boxShadow: '0 0 25px rgba(255,215,0,1), 0 0 50px rgba(255,215,0,0.4)' };
  return { border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' };
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

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId]);

  async function load() {
    setLoading(true);
    setNotFound(false);
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, balance, banner_color, frame_item_id, created_at, bio')
        .eq('id', userId)
        .maybeSingle();

      if (!prof) { setNotFound(true); return; }
      setProfile(prof);

      const [ranks, achs, socialInfo, profileComments, cStats] = await Promise.all([
        getUserGameRanks(userId).catch(() => []),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
        profileSocialService.getFollowCounts(userId).catch(() => ({ followers: 0, following: 0 })),
        profileSocialService.getProfileComments(userId).catch(() => []),
        getProductivityStats(userId).catch(() => null),
      ]);

      setGameRanks(ranks || []);
      setCabinStats(cStats);
      setAchIds((achs.data || []).map(a => a.achievement_id));
      setFollowCounts(socialInfo);
      setComments(profileComments);

      // Activity status (non-blocking)
      socialService.getUserActivity(userId)
        .then(setActivityLabel)
        .catch(() => { });

      if (user && user.id !== userId) {
        const following = await profileSocialService.isFollowing(userId).catch(() => false);
        setIsFollowing(following);
      }
    } catch (err) {
      console.error('[PublicProfilePage]', err);
    } finally {
      setLoading(false);
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
      console.error(err);
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
      alert('No se pudo publicar el comentario.');
    } finally {
      setSubmittingComment(false);
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
    <div className="w-full max-w-4xl mx-auto min-h-[100dvh] pb-24 text-white font-sans flex flex-col gap-6" style={{ background: 'transparent' }}>

      {/* 1️⃣ HERO SECTION */}
      <section className="relative w-full rounded-b-3xl md:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.15)] bg-[#0d0d14] border border-white/5 pb-6">

        {/* Banner */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: profile.banner_color
              ? `linear-gradient(135deg, ${profile.banner_color}55 0%, ${profile.banner_color}22 100%)`
              : 'linear-gradient(135deg, rgba(255,110,180,0.15) 0%, rgba(0,229,255,0.08) 100%)'
          }}
        />

        <div className="relative z-10 p-6 md:p-8 flex flex-col items-center text-center">

          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            {!isOwnProfile && (
              <button
                onClick={handleToggleFollow}
                className={isFollowing ? 'btn-glass text-[10px] uppercase tracking-wider px-3 py-1' : 'btn-accent text-[10px] uppercase tracking-wider px-3 py-1 bg-cyan-600 hover:bg-cyan-500'}
              >
                {isFollowing ? '✓ Siguiendo' : '+ Seguir'}
              </button>
            )}
            {!isOwnProfile && (
              <Link to={`/cartas?to=${userId}`} className="btn-glass text-[10px] uppercase tracking-wider px-3 py-1 text-white decoration-transparent">
                ✉️ Mensaje
              </Link>
            )}
            {activityLabel && <span className="activityBadge inline-block mt-2">{activityLabel}</span>}
          </div>
          <div className="absolute top-4 left-4">
            <Link to="/leaderboard" className="text-[10px] text-gray-500 hover:text-white uppercase tracking-wider transition-colors">
              ← Leaderboard
            </Link>
          </div>

          <div className="relative group cursor-pointer mb-6 mt-6 md:mt-0">
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-[35%] blur-xl opacity-40 group-hover:opacity-80 transition duration-700"></div>
            <div className="relative w-28 h-28 rounded-[30%] overflow-hidden border border-white/20 shadow-2xl bg-black" style={getFrameStyle(profile.frame_item_id)}>
              <img src={profile?.avatar_url || '/dan_profile.jpg'} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            {/* Pet Overlay */}
            <div className="absolute -left-6 -bottom-2 pointer-events-none drop-shadow-2xl z-30 scale-x-[-1]">
              <PetDisplay userId={userId} size={45} showName={false} />
            </div>

            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#09090b] border border-cyan-500 text-cyan-400 text-xs font-black px-4 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] z-20 whitespace-nowrap">
              LVL {level}
            </div>
          </div>

          <h1 className="text-3xl font-black uppercase tracking-[0.1em] bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 drop-shadow-md">
            {profile?.username || 'Jugador'}
          </h1>
          <p className="text-[11px] font-bold text-purple-400 uppercase tracking-[0.3em] mb-4 mt-1 opacity-90">
            {rankName}
          </p>

          <div className="flex flex-col items-center gap-2 mb-6 max-w-md mx-auto">
            <p className={`text-sm tracking-wide flex-1 text-center ${profile.bio ? 'text-gray-300' : 'text-gray-500 italic'}`}>"{profile.bio || 'Sin biografía estelar.'}"</p>
            {joinedYear && <span className="text-[10px] text-gray-600 uppercase tracking-widest mt-1 font-bold">Desde {joinedYear}</span>}
          </div>

          {/* XP Bar */}
          <div className="w-full max-w-xs mt-2">
            <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1.5 uppercase tracking-widest">
              <span>{Math.floor(totalXp).toLocaleString()} XP</span>
              <span className="text-cyan-500">{Math.floor(nextLevelXp).toLocaleString()} XP</span>
            </div>
            <div className="h-1.5 w-full bg-[#050508] rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 w-full rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/40 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ STATS CORE GRID */}
      <section className="px-4 md:px-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold mb-3 pl-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> Profile Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Seguidores" value={followCounts.followers} icon="👥" highlight="text-purple-400" />
          <StatCard title="Siguiendo" value={followCounts.following} icon="✨" highlight="text-gray-400" />
          <StatCard title="Rank Global" value={topGlobalRank !== 'N/A' ? `#${topGlobalRank}` : '-'} icon="🌍" highlight="text-green-400" />
          <StatCard title="Economía" value={`◈ ${profile.balance || 0}`} icon="💎" highlight="text-cyan-400" />
        </div>
      </section>

      {/* 3️⃣ TABS */}
      <section className="px-4 md:px-0 flex-1 flex flex-col min-h-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex bg-[#0a0a0f] rounded-xl p-1 shadow-lg border border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
          <TabButton active={activeTab === 'records'} onClick={() => setActiveTab('records')}>🏆 Récords</TabButton>
          <TabButton active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')}>🎖️ Logros</TabButton>
          <TabButton active={activeTab === 'wall'} onClick={() => setActiveTab('wall')}>💬 Muro</TabButton>
        </div>

        <div className="mt-5 flex-1 mb-8">

          {/* TAB: RECORDS */}
          {activeTab === 'records' && (
            <div className="animate-fade-in-up">
              {gameRanks.length === 0 ? (
                <div className="text-center p-12 border border-white/5 rounded-2xl bg-[#0a0a0f] text-gray-500 text-sm">Sin récords registrados.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gameRanks.map(rank => (
                    <div key={rank.game_id} className="flex bg-[#13131c] border border-white/5 rounded-xl p-3 items-center gap-4 hover:bg-[#1a1a26] transition hover:border-white/10 group cursor-default">
                      <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition shadow-inner">
                        🎮
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[13px] text-gray-200 uppercase tracking-widest">{GAME_NAMES[rank.game_id] || rank.game_id}</h3>
                        <p className="text-xs text-cyan-400 font-mono mt-0.5">Score: {(rank.max_score ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-center justify-center px-4 py-2 bg-[#0a0a0f] rounded-lg border border-purple-500/20 shadow-md">
                        <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-0.5">Rank</span>
                        <span className="font-black text-purple-400 text-sm">#{rank.user_position}</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {unlockedAchs.map(ach => (
                    <div key={ach.id} className="flex flex-col bg-gradient-to-br from-[#171724] to-[#0a0a0f] border border-purple-500/10 rounded-xl p-4 relative overflow-hidden group">
                      <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition duration-700"></div>
                      <div className="flex items-center justify-between mb-3 z-10">
                        <div className="text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{ach.icon}</div>
                        <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/50 flex items-center justify-center text-green-400 text-[10px]">✓</div>
                      </div>
                      <div className="z-10">
                        <div className="font-bold text-[13px] text-white tracking-wide">{ach.title}</div>
                        <div className="text-[11px] text-gray-400 leading-snug mt-1 opacity-80 group-hover:opacity-100 transition whitespace-pre-wrap">{ach.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: WALL */}
          {activeTab === 'wall' && (
            <div className="animate-fade-in-up">
              <div className="bg-[#13131c] rounded-2xl border border-white/5 p-4 md:p-6 mb-6">
                <form onSubmit={handleAddComment}>
                  <div className="flex flex-col gap-3">
                    <textarea
                      autoFocus
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribe un mensaje de apoyo..."
                      maxLength={500}
                      className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl p-4 text-sm text-white resize-none min-h-[100px] outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="btn-accent self-end px-6 py-2 rounded-lg font-bold text-xs tracking-wider"
                    >
                      {submittingComment ? 'Enviando...' : 'Publicar'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="flex flex-col gap-4">
                {comments.map(c => (
                  <div
                    key={c.id}
                    className="bg-[#13131c]/60 backdrop-blur-md p-4 rounded-xl border border-white/5 transition-colors hover:bg-[#13131c]"
                  >
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <img className="w-6 h-6 rounded-full border border-white/10" src={c.author?.avatar_url || '/dan_profile.jpg'} alt="Avatar" />
                      <Link to={`/profile/${c.author_id}`} className="text-cyan-400 hover:text-cyan-300 font-bold text-xs tracking-wide">
                        {c.author?.username}
                      </Link>
                      <span className="text-[10px] text-gray-500 font-mono tracking-widest">{new Date(c.created_at).toLocaleDateString()}</span>
                      <div className="ml-auto">
                        {(user?.id === c.author_id || user?.id === userId) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-red-400/50 hover:text-red-400 text-sm px-2 cursor-pointer transition-colors"
                            title="Eliminar mensaje"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed overflow-wrap break-words">{c.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center p-8 bg-[#0a0a0f] rounded-2xl border border-white/5">
                    <p className="text-gray-500 italic text-sm">El muro está vacío... Sé el primero en saludar.</p>
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
    <div className="bg-[#13131c] p-3 md:p-4 rounded-xl border border-white/5 flex flex-col justify-center items-center text-center hover:bg-[#1a1a26] transition shadow-md relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:scale-[1.8] group-hover:rotate-45 transition duration-500">{icon}</div>
      <div className="text-xl mb-1 relative z-10">{icon}</div>
      <div className={`text-xl md:text-2xl font-black leading-none ${highlight} relative z-10 drop-shadow-md`}>{value}</div>
      <div className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-2 relative z-10">{title}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 px-4 text-[11px] md:text-sm font-bold rounded-lg transition-all whitespace-nowrap tracking-wide ${active
        ? 'bg-[#1a1a26] text-white shadow-md border border-white/10'
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
        }`}
    >
      {children}
    </button>
  );
}
