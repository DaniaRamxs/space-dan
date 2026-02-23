/**
 * PublicProfilePage — perfil público de cualquier usuario.
 * Ruta: /profile/:userId
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PetDisplay from '../components/PetDisplay';
import { supabase } from '../supabaseClient';
import { ACHIEVEMENTS } from '../hooks/useAchievements';
import { getUserGameRanks } from '../services/supabaseScores';
import { useAuthContext } from '../contexts/AuthContext';
import { profileSocialService } from '../services/profile_social';

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
  const [achIds, setAchIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Social state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId]);

  async function load() {
    setLoading(true);
    setNotFound(false);
    try {
      // Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, balance, banner_color, frame_item_id, created_at, bio')
        .eq('id', userId)
        .maybeSingle();

      if (!prof) { setNotFound(true); return; }
      setProfile(prof);

      // Social data in parallel
      const [ranks, achs, socialInfo, profileComments] = await Promise.all([
        getUserGameRanks(userId).catch(() => []),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
        profileSocialService.getFollowCounts(userId),
        profileSocialService.getProfileComments(userId)
      ]);

      setGameRanks(ranks || []);
      setAchIds((achs.data || []).map(a => a.achievement_id));
      setFollowCounts(socialInfo);
      setComments(profileComments);

      if (user && user.id !== userId) {
        const following = await profileSocialService.isFollowing(userId);
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
        followers: prev.followers + (following ? 1 : -1)
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

  return (
    <main className="card profileCard">
      {/* Header */}
      <div
        className="profileHeader"
        style={{
          padding: '35px 30px',
          display: 'flex',
          alignItems: 'center',
          background: profile.banner_color
            ? `linear-gradient(135deg, ${profile.banner_color}55 0%, ${profile.banner_color}22 100%)`
            : 'linear-gradient(135deg, rgba(255,110,180,0.08) 0%, rgba(0,229,255,0.04) 100%)',
          gap: 28,
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          position: 'relative',
        }}
      >
        <div style={{
          width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
          flexShrink: 0, ...getFrameStyle(profile.frame_item_id),
        }}>
          <img
            src={profile.avatar_url || '/dan_profile.jpg'}
            alt="avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <h1 style={{ margin: 0, color: 'var(--text)', fontSize: '2rem', textShadow: '0 0 10px var(--glow)' }}>
              {profile.username || 'Jugador'}
            </h1>
            {!isOwnProfile && (
              <button
                onClick={handleToggleFollow}
                className={isFollowing ? 'btn-glass' : 'btn-accent'}
                style={{ height: '32px', fontSize: '0.75rem', padding: '0 15px' }}
              >
                {isFollowing ? 'Siguiendo ✓' : 'Seguir +'}
              </button>
            )}
          </div>

          <p style={{
            color: 'var(--text)', opacity: 0.8, fontSize: '0.9rem', margin: '8px 0 12px 0',
            maxWidth: '500px', fontStyle: profile.bio ? 'normal' : 'italic'
          }}>
            {profile.bio || (isOwnProfile ? 'Aún no tienes biografía. Edítala en tu configuración.' : 'Sin biografía estelar.')}
          </p>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.95rem', fontWeight: 'bold' }}>
              ◈ {(profile.balance ?? 0).toLocaleString()}
            </span>
            <span style={{ color: 'var(--cyan)', fontSize: '0.85rem' }}>
              <strong style={{ color: '#fff' }}>{followCounts.followers}</strong> seguidores
            </span>
            <span style={{ color: 'var(--cyan)', fontSize: '0.85rem' }}>
              <strong style={{ color: '#fff' }}>{followCounts.following}</strong> siguiendo
            </span>
            {joinedYear && (
              <span style={{ color: 'var(--text)', fontSize: '0.8rem', opacity: 0.5 }}>
                Desde {joinedYear}
              </span>
            )}
          </div>
        </div>

        <PetDisplay userId={userId} size={80} showName />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          {isOwnProfile ? (
            <Link to="/profile" className="btn-accent" style={{ fontSize: '0.8rem', padding: '8px 16px', textDecoration: 'none' }}>
              Configuración de Perfil
            </Link>
          ) : (
            <Link to={`/cartas?to=${userId}`} className="btn-glass" style={{ fontSize: '0.8rem', padding: '8px 16px', textDecoration: 'none' }}>
              Enviar Carta ✉️
            </Link>
          )}
          <Link to="/leaderboard" style={{ color: 'var(--text)', opacity: 0.5, fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Leaderboard
          </Link>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40 }}>
          {/* Main Column */}
          <div>
            {/* Récords */}
            <section style={{ marginBottom: 40 }}>
              <h2 className="cardTitle" style={{ fontSize: '1.2rem', marginBottom: 20 }}>
                🎮 Récords Estelares
              </h2>
              {topGames.length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>El espacio de récords está vacío...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 15 }}>
                  {topGames.map(rank => (
                    <div key={rank.game_id} style={{
                      padding: 16, border: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                      transition: 'transform 0.2s',
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                        {GAME_NAMES[rank.game_id] || rank.game_id}
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text)' }}>
                        {(rank.max_score ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: 4 }}>
                        Rank #{rank.user_position}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Logros */}
            <section style={{ marginBottom: 40 }}>
              <h2 className="cardTitle" style={{ fontSize: '1.2rem', marginBottom: 20 }}>
                🏆 Logros ({unlockedAchs.length}/{ACHIEVEMENTS.length})
              </h2>
              <div className="achGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {unlockedAchs.map(ach => (
                  <div key={ach.id} className="achCard unlocked">
                    <div className="achCardIcon">{ach.icon}</div>
                    <div className="achCardBody">
                      <div className="achCardTitle">{ach.title}</div>
                      <div className="achCardDesc">{ach.desc}</div>
                    </div>
                  </div>
                ))}
                {unlockedAchs.length === 0 && (
                  <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Sin logros detectados en esta órbita.</p>
                )}
              </div>
            </section>

            {/* Muro de Comentarios */}
            <section>
              <h2 className="cardTitle" style={{ fontSize: '1.2rem', marginBottom: 20 }}>
                💬 Muro Espacial
              </h2>

              <form onSubmit={handleAddComment} style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un mensaje en el muro..."
                    maxLength={500}
                    style={{
                      flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: 15, color: '#fff', fontSize: '0.9rem',
                      resize: 'none', minHeight: '80px', fontFamily: 'inherit'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="btn-accent"
                    style={{ width: '100px', borderRadius: 12 }}
                  >
                    {submittingComment ? '...' : 'Publicar'}
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                {comments.map(c => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={c.id}
                    style={{
                      padding: 15, background: 'rgba(255,255,255,0.03)',
                      borderRadius: 12, border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <img
                        src={c.author?.avatar_url || '/dan_profile.jpg'}
                        style={{ width: 24, height: 24, borderRadius: '50%' }}
                      />
                      <Link
                        to={`/profile/${c.author_id}`}
                        style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 'bold', textDecoration: 'none' }}
                      >
                        {c.author?.username}
                      </Link>
                      <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', opacity: 0.9, lineHeight: 1.5, margin: 0 }}>{c.content}</p>
                  </motion.div>
                ))}
                {comments.length === 0 && (
                  <p style={{ textAlign: 'center', opacity: 0.3, padding: '20px', fontStyle: 'italic' }}>
                    El muro está en silencio... Sé el primero en saludar.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar / Stats Side */}
          <aside>
            <div className="glassCard" style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: '0.9rem', opacity: 0.6, margin: '0 0 15px 0', textTransform: 'uppercase' }}>Estadísticas de Explorador</h3>
              <div style={{ spaceY: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>Dancoins:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>◈ {(profile.balance ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>Logros:</span>
                  <span style={{ fontWeight: 'bold' }}>{unlockedAchs.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>Seguidores:</span>
                  <span style={{ fontWeight: 'bold' }}>{followCounts.followers}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
