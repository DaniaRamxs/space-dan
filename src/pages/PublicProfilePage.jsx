/**
 * PublicProfilePage — perfil público de cualquier usuario.
 * Ruta: /profile/:userId
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PetDisplay from '../components/PetDisplay';

function getFrameStyle(frameItemId) {
  if (!frameItemId) return { border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' };
  const id = frameItemId.toLowerCase();
  // IDs concretos de la DB
  if (id === 'frame_stars') return { border: '3px solid #ffd700', boxShadow: '0 0 20px rgba(255,215,0,0.8)' };
  if (id === 'frame_neon') return { border: '3px solid #00e5ff', boxShadow: '0 0 20px rgba(0,229,255,0.8)' };
  if (id === 'frame_pixel') return { border: '4px solid #ff6b35', boxShadow: '0 0 15px rgba(255,107,53,0.7)', imageRendering: 'pixelated' };
  if (id === 'frame_holo') return { border: '3px solid #b464ff', boxShadow: '0 0 20px rgba(180,100,255,0.8), 0 0 40px rgba(0,229,255,0.4)' };
  if (id === 'frame_crown') return { border: '4px solid #ffd700', boxShadow: '0 0 25px rgba(255,215,0,1), 0 0 50px rgba(255,215,0,0.4)' };
  // Fallbacks por keyword
  if (id.includes('gold')) return { border: '3px solid #ffd700', boxShadow: '0 0 15px rgba(255,215,0,0.6)' };
  if (id.includes('cyan') || id.includes('cyber')) return { border: '3px solid #00e5ff', boxShadow: '0 0 15px rgba(0,229,255,0.6)' };
  if (id.includes('pink') || id.includes('rose')) return { border: '3px solid #ff69b4', boxShadow: '0 0 15px rgba(255,105,180,0.6)' };
  if (id.includes('purple') || id.includes('galaxy')) return { border: '3px solid #b464ff', boxShadow: '0 0 15px rgba(180,100,255,0.6)' };
  if (id.includes('green') || id.includes('matrix')) return { border: '3px solid #39ff14', boxShadow: '0 0 15px rgba(57,255,20,0.6)' };
  if (id.includes('red') || id.includes('fire')) return { border: '3px solid #ff3300', boxShadow: '0 0 15px rgba(255,51,0,0.6)' };
  return { border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' };
}
import { supabase } from '../supabaseClient';
import { ACHIEVEMENTS } from '../hooks/useAchievements';
import { getUserGameRanks } from '../services/supabaseScores';
import { useAuthContext } from '../contexts/AuthContext';

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

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setNotFound(false);

    async function load() {
      try {
        // Profile (public columns only)
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, balance, banner_color, frame_item_id, created_at')
          .eq('id', userId)
          .maybeSingle();

        if (!prof) { setNotFound(true); return; }
        setProfile(prof);

        // Game ranks
        const ranks = await getUserGameRanks(userId).catch(() => []);
        setGameRanks(ranks || []);

        // Achievements
        const { data: achs } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', userId);
        setAchIds((achs || []).map(a => a.achievement_id));

      } catch (err) {
        console.error('[PublicProfilePage]', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  if (loading) {
    return (
      <main className="card" style={{ padding: 40, textAlign: 'center' }}>
        <span className="blinkText" style={{ color: 'var(--accent)' }}>cargando_perfil...</span>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="card" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text)', opacity: 0.7 }}>Usuario no encontrado.</p>
        <Link to="/leaderboard" style={{ color: 'var(--accent)', marginTop: 12, display: 'inline-block' }}>
          ← Volver al leaderboard
        </Link>
      </main>
    );
  }

  const unlockedAchs = ACHIEVEMENTS.filter(a => achIds.includes(a.id));
  const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;
  const topGames = [...gameRanks].sort((a, b) => (b.max_score ?? 0) - (a.max_score ?? 0)).slice(0, 6);

  return (
    <main className="card profileCard">
      {/* Header */}
      <div
        className="profileHeader"
        style={{
          padding: '28px 30px',
          display: 'flex',
          alignItems: 'center',
          background: profile.banner_color
            ? `linear-gradient(135deg, ${profile.banner_color}55 0%, ${profile.banner_color}22 100%)`
            : 'linear-gradient(135deg, rgba(255,110,180,0.08) 0%, rgba(0,229,255,0.04) 100%)',
          gap: 24,
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{
          width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
          flexShrink: 0, ...getFrameStyle(profile.frame_item_id),
        }}>
          <img
            src={profile.avatar_url || '/dan_profile.jpg'}
            alt="avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ margin: 0, color: 'var(--text)', fontSize: '1.8rem', textShadow: '0 0 10px var(--glow)' }}>
            {profile.username || 'Jugador'}
          </h1>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.95rem', fontWeight: 'bold' }}>
              ◈ {(profile.balance ?? 0).toLocaleString()} Dancoins
            </span>
            <span style={{ color: 'var(--cyan)', fontSize: '0.8rem', opacity: 0.7 }}>
              🏆 {unlockedAchs.length} logros
            </span>
            {joinedYear && (
              <span style={{ color: 'var(--text)', fontSize: '0.8rem', opacity: 0.5 }}>
                Desde {joinedYear}
              </span>
            )}
          </div>
        </div>

        {/* Mascota con accesorios equipados */}
        <PetDisplay userId={userId} size={70} showName />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {isOwnProfile && (
            <Link
              to="/profile"
              style={{
                background: 'var(--accent)', color: '#000', border: 'none', padding: '6px 14px',
                fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: 4,
                fontFamily: 'inherit', textDecoration: 'none', letterSpacing: '0.03em',
              }}
            >
              Ver mi perfil completo
            </Link>
          )}
          <Link
            to="/leaderboard"
            style={{ color: 'var(--text)', opacity: 0.5, fontSize: '0.8rem', textDecoration: 'none' }}
          >
            ← Leaderboard
          </Link>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* Récords */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cardTitle" style={{ fontSize: '1.1rem', marginBottom: 14 }}>
            🎮 Récords Personales
          </h2>
          {topGames.length === 0 ? (
            <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Sin récords registrados aún.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {topGames.map(rank => (
                <div key={rank.game_id} style={{
                  padding: 14, border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    {GAME_NAMES[rank.game_id] || rank.game_id}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)' }}>
                    {(rank.max_score ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: 4 }}>
                    Puesto #{rank.user_position}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Logros */}
        <section>
          <h2 className="cardTitle" style={{ fontSize: '1.1rem', marginBottom: 14 }}>
            🏆 Logros ({unlockedAchs.length}/{ACHIEVEMENTS.length})
          </h2>
          {unlockedAchs.length === 0 ? (
            <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Sin logros desbloqueados.</p>
          ) : (
            <div className="achGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {unlockedAchs.map(ach => (
                <div key={ach.id} className="achCard unlocked">
                  <div className="achCardIcon">{ach.icon}</div>
                  <div className="achCardBody">
                    <div className="achCardTitle">{ach.title}</div>
                    <div className="achCardDesc">{ach.desc}</div>
                  </div>
                  <div className="achCardCheck">✓</div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
