import { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/supabaseScores';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ gameId, refreshKey = 0 }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    getLeaderboard(gameId, 10).then(data => {
      setScores(data);
      setLoading(false);
    });
  }, [gameId, refreshKey]);

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
          {scores.map((entry, i) => (
            <div key={i} className="leaderboardRow">
              <span className="leaderboardRank">
                {MEDALS[i] ?? `#${i + 1}`}
              </span>
              {entry.avatar_url && (
                <img src={entry.avatar_url} alt="" className="leaderboardAvatar" />
              )}
              <span className="leaderboardName">{entry.username || 'usuario'}</span>
              <span className="leaderboardScore">{entry.best_score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
