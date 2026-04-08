import { useState, useEffect } from 'react';
import { getLeaderboard, getUserRankInGame } from '../services/supabaseScores';
import { useAuthContext } from '../contexts/AuthContext';
import { getUserDisplayName, getNicknameClass } from '../utils/user';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ gameId, refreshKey = 0, prefetchedData, prefetchedRank, loading: parentLoading }) {
  const { user, profile } = useAuthContext();
  const [localScores, setLocalScores] = useState([]);
  const [localUserRank, setLocalUserRank] = useState(null);
  const [localLoading, setLocalLoading] = useState(true);

  const isManagedExternally = prefetchedData !== undefined;
  const scores = isManagedExternally ? prefetchedData : localScores;
  const userRank = isManagedExternally ? prefetchedRank : localUserRank;
  const loading = isManagedExternally ? parentLoading : localLoading;

  useEffect(() => {
    if (isManagedExternally) return;
    if (!gameId) return;
    let isMounted = true;

    const loadBoard = async () => {
      setLocalLoading(true);
      try {
        const data = await getLeaderboard(gameId, 10);
        if (!isMounted) return;
        setLocalScores(data || []);

        if (user) {
          const rankData = await getUserRankInGame(user.id, gameId);
          if (isMounted) setLocalUserRank(rankData);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        if (isMounted) setLocalLoading(false);
      }
    };

    loadBoard();
    return () => { isMounted = false; };
  }, [gameId, refreshKey, user?.id, isManagedExternally]);

  const isMe = (entry) => {
    if (!user) return false;
    if (entry.user_id && entry.user_id === user.id) return true;
    if (profile?.username && entry.username === profile.username) return true;
    const fallbackName = (user.email || '').split('@')[0] || user.user_metadata?.full_name;
    return entry.username && entry.username === fallbackName;
  };

  const userInTop10 = scores.some(isMe);

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
            const isCurrentUser = isMe(entry);
            return (
              <div key={i} className={`leaderboardRow ${isCurrentUser ? 'highlight-me' : ''}`} style={isCurrentUser ? { background: 'rgba(255,110,180,0.15)', borderLeft: '3px solid var(--accent)' } : {}}>
                <span className="leaderboardRank">
                  {MEDALS[i] ?? `#${i + 1}`}
                </span>
                {entry.avatar_url && (
                  <img src={entry.avatar_url} alt="" className="leaderboardAvatar" />
                )}
                <span className={`leaderboardName ${getNicknameClass(entry)}`}>
                  {getUserDisplayName(entry)}
                  {entry.game_level && (
                    <span className="gameLevelBadge" title="Nivel en este juego">
                      Lv.{entry.game_level}
                    </span>
                  )}
                </span>
                <span className="leaderboardScore">{entry.best_score?.toLocaleString() || '0'}</span>
              </div>
            );
          })}

          {user && userRank && !userInTop10 && (
            <>
              <div style={{ textAlign: 'center', opacity: 0.5, margin: '5px 0' }}>⋮</div>
              <div className="leaderboardRow highlight-me" style={{ background: 'rgba(255,110,180,0.15)', borderLeft: '3px solid var(--accent)' }}>
                <span className="leaderboardRank">#{userRank.user_position}</span>
                <span className={`leaderboardName ${getNicknameClass(profile)}`}>
                  {getUserDisplayName(profile)} (Tú)
                  {userRank.game_level && (
                    <span className="gameLevelBadge">Lv.{userRank.game_level}</span>
                  )}
                </span>
                <span className="leaderboardScore">{userRank.max_score?.toLocaleString() || '0'}</span>
              </div>

            </>
          )}
        </div>
      )}
    </div>
  );
}
