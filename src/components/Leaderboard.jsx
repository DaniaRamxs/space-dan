import { useState, useEffect } from 'react';
import { getLeaderboard, getUserRankInGame } from '../services/supabaseScores';
import { useAuthContext } from '../contexts/AuthContext';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ gameId, refreshKey = 0 }) {
  const { user } = useAuthContext();
  const [scores, setScores] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);

    const loadBoard = async () => {
      const data = await getLeaderboard(gameId, 10);
      setScores(data);

      if (user) {
        const rankData = await getUserRankInGame(user.id, gameId);
        setUserRank(rankData);
      }
      setLoading(false);
    };

    loadBoard();
  }, [gameId, refreshKey, user]);

  const userInTop10 = user && scores.some(s => s.username === (user.email || '').split('@')[0] || s.username === user.user_metadata?.full_name);

  return (
    <div className="leaderboard">
      <div className="leaderboardTitle">◈ leaderboard</div>

      {loading ? (
        <div className="leaderboardEmpty blinkText">cargando...</div>
      ) : scores.length === 0 ? (
        <div className="leaderboardEmpty">
          sin scores aún — sé el primero ✨
        </div>
      ) : (
        <div className="leaderboardList">
          {scores.map((entry, i) => {
            const isCurrentUser = user && (entry.username === (user.email || '').split('@')[0] || entry.username === user.user_metadata?.full_name);
            return (
              <div key={i} className={`leaderboardRow ${isCurrentUser ? 'highlight-me' : ''}`} style={isCurrentUser ? { background: 'rgba(255,110,180,0.15)', borderLeft: '3px solid var(--accent)' } : {}}>
                <span className="leaderboardRank">
                  {MEDALS[i] ?? `#${i + 1}`}
                </span>
                {entry.avatar_url && (
                  <img src={entry.avatar_url} alt="" className="leaderboardAvatar" />
                )}
                <span className="leaderboardName">{entry.username || 'usuario'}</span>
                <span className="leaderboardScore">{entry.best_score?.toLocaleString() || '0'}</span>
              </div>

            );
          })}

          {user && userRank && !userInTop10 && (
            <>
              <div style={{ textAlign: 'center', opacity: 0.5, margin: '5px 0' }}>⋮</div>
              <div className="leaderboardRow highlight-me" style={{ background: 'rgba(255,110,180,0.15)', borderLeft: '3px solid var(--accent)' }}>
                <span className="leaderboardRank">#{userRank.user_position}</span>
                <span className="leaderboardName">Tu Récord</span>
                <span className="leaderboardScore">{userRank.best_score?.toLocaleString() || '0'}</span>
              </div>

            </>
          )}
        </div>
      )}
    </div>
  );
}
