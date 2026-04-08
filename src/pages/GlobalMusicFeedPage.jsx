import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { openUrl } from '../utils/openUrl';
import { Music, Radio, User, Sparkles, TrendingUp, Play, Trophy, Crown, Medal, Users } from 'lucide-react';
import '../styles/global-music-feed.css';

const STALE_MS = 24 * 60 * 60 * 1000; // 24 horas

// ---- Source helpers ----
function isLastfm(trackId) {
  return typeof trackId === 'string' && trackId.startsWith('lastfm:');
}

function buildTrackUrl(item) {
  if (!item.track_id) return null;
  if (isLastfm(item.track_id)) {
    const artist = encodeURIComponent(item.artist_name || '');
    const track  = encodeURIComponent(item.track_name || '');
    return `https://www.last.fm/music/${artist}/_/${track}`;
  }
  return `https://open.spotify.com/track/${item.track_id}`;
}

// ---- Small source badge ----
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" style={{ color: '#1db954' }}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.36-.66.48-1.021.24-2.82-1.74-6.36-2.1-10.561-1.14-.418.12-.779-.18-.899-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.361.18.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.62.539.3.719 1.02.419 1.56-.299.42-1.02.6-1.559.3z"/>
  </svg>
);

const LastfmIcon = () => (
  <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" style={{ color: '#d51007' }}>
    <path d="M10.599 17.211l-.881-2.393s-1.433 1.596-3.579 1.596c-1.9 0-3.249-1.652-3.249-4.296 0-3.381 1.705-4.596 3.388-4.596 2.419 0 3.188 1.568 3.849 3.574l.871 2.736c.871 2.653 2.521 4.782 7.271 4.782 3.409 0 5.729-1.047 5.729-3.793 0-2.218-1.267-3.363-3.617-3.917l-1.749-.374c-1.212-.27-1.567-.748-1.567-1.551 0-.916.721-1.453 1.899-1.453 1.284 0 1.974.479 2.079 1.621l2.663-.319c-.225-2.399-1.873-3.381-4.622-3.381-2.415 0-4.727.909-4.727 3.836 0 1.824.883 2.979 3.098 3.533l1.854.464c1.378.344 1.959.852 1.959 1.74 0 1.037-.999 1.462-2.948 1.462-2.858 0-4.048-1.5-4.742-3.533l-.891-2.751c-1.152-3.558-2.994-4.872-6.572-4.872C1.945 5.527 0 8.057 0 12.193c0 3.969 2.034 6.28 5.959 6.28 3.084 0 4.64-1.262 4.64-1.262z"/>
  </svg>
);

function SourceBadge({ trackId }) {
  if (isLastfm(trackId)) return <span className="gf-source-badge gf-source-badge--lastfm"><LastfmIcon /> Last.fm</span>;
  return <span className="gf-source-badge gf-source-badge--spotify"><SpotifyIcon /> Spotify</span>;
}

// ---- Status badge ----
function StatusBadge({ isPlaying }) {
  if (isPlaying) return (
    <span className="gf-badge gf-badge--live">
      <span className="gf-badge__dot" />
      En vivo
    </span>
  );
  return <span className="gf-badge gf-badge--last">Última</span>;
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60)    return 'ahora';
  if (d < 3600)  return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

// ---- MusicCard ----
function MusicCard({ item }) {
  const username = item.profiles?.username || item.user_id?.slice(0, 8);
  const avatar   = item.profiles?.avatar_url;
  const trackUrl = buildTrackUrl(item);

  return (
    <motion.div className="gf-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} layout>
      <button
        className="gf-card__cover"
        onClick={() => trackUrl && openUrl(trackUrl)}
        title={isLastfm(item.track_id) ? 'Abrir en Last.fm' : 'Abrir en Spotify'}
      >
        {item.track_image_url
          ? <img src={item.track_image_url} alt={item.track_name} />
          : <div className="gf-card__cover-placeholder"><Music size={24} /></div>
        }
        {item.is_playing && (
          <div className="gf-card__eq">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="gf-card__eq-bar" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </button>

      <div className="gf-card__info">
        <p className="gf-card__track" title={item.track_name}>{item.track_name || '—'}</p>
        <p className="gf-card__artist">{item.artist_name || '—'}</p>
        {item.emotional_label && <p className="gf-card__mood">{item.emotional_label}</p>}
        <SourceBadge trackId={item.track_id} />
      </div>

      <div className="gf-card__user">
        {username && (
          <Link to={`/@${username}`} className="gf-card__avatar-link">
            {avatar
              ? <img src={avatar} alt={username} className="gf-card__avatar" />
              : <div className="gf-card__avatar gf-card__avatar--placeholder"><User size={14} /></div>
            }
            <span className="gf-card__username">@{username}</span>
          </Link>
        )}
        <StatusBadge isPlaying={item.is_playing} />
        <span className="gf-card__time">{timeAgo(item.updated_at)}</span>
      </div>
    </motion.div>
  );
}

// ---- DiscoverCard ----
function DiscoverCard({ track, count, listeners, onPlay }) {
  return (
    <motion.div
      className="gf-discover-card"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onPlay}
    >
      {track.image
        ? <img src={track.image} alt={track.name} className="gf-discover-card__img" />
        : <div className="gf-discover-card__img gf-discover-card__img--empty"><Music size={18} /></div>
      }
      <div className="gf-discover-card__info">
        <p className="gf-discover-card__name">{track.name}</p>
        <p className="gf-discover-card__artist">{track.artist}</p>
      </div>

      {/* Listener avatars */}
      <div className="gf-discover-card__listeners">
        {listeners.slice(0, 3).map(l => (
          l.avatar
            ? <img key={l.userId} src={l.avatar} alt={l.username} className="gf-discover-card__avatar" title={`@${l.username}`} />
            : <div key={l.userId} className="gf-discover-card__avatar gf-discover-card__avatar--empty"><User size={10} /></div>
        ))}
        {count > 3 && <span className="gf-discover-card__extra">+{count - 3}</span>}
      </div>

      <button
        className="gf-discover-card__play"
        onClick={e => { e.stopPropagation(); onPlay(); }}
        title={isLastfm(track.id) ? 'Abrir en Last.fm' : 'Escuchar en Spotify'}
      >
        <Play size={14} fill="currentColor" />
      </button>
    </motion.div>
  );
}

// ---- Leaderboard ----
const RANK_ICONS = [
  <Crown size={16} style={{ color: '#FFD700' }} />,
  <Medal size={16} style={{ color: '#C0C0C0' }} />,
  <Medal size={16} style={{ color: '#CD7F32' }} />,
];

function Leaderboard({ entries, loading }) {
  if (loading) return <div className="gf-leaderboard-empty">Cargando clasificación…</div>;
  if (!entries.length) return (
    <div className="gf-leaderboard-empty">
      Aún no hay datos. Las reproducciones se registran en tiempo real.
    </div>
  );
  return (
    <div className="gf-leaderboard">
      {entries.map((entry, i) => {
        const username = entry.username || entry.user_id?.slice(0, 8);
        return (
          <motion.div
            key={entry.user_id}
            className={`gf-lb-row ${i < 3 ? 'gf-lb-row--top' : ''}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="gf-lb-rank">
              {i < 3 ? RANK_ICONS[i] : <span className="gf-lb-rank-num">#{i + 1}</span>}
            </div>
            <Link to={`/@${username}`} className="gf-lb-user">
              {entry.avatar_url
                ? <img src={entry.avatar_url} alt={username} className="gf-lb-avatar" />
                : <div className="gf-lb-avatar gf-lb-avatar--empty"><User size={14} /></div>
              }
              <div className="gf-lb-info">
                <span className="gf-lb-username">@{username}</span>
                {entry.last_track_name && (
                  <span className="gf-lb-last">{entry.last_track_name} · {entry.last_artist_name}</span>
                )}
              </div>
            </Link>
            <div className="gf-lb-count">
              <Music size={11} />
              <strong>{entry.play_count}</strong>
              <span>canciones</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---- Main page ----
export default function GlobalMusicFeedPage() {
  const [feed, setFeed]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [followingIds, setFollowingIds]   = useState(null); // null = not loaded yet
  const [friendsOnly, setFriendsOnly]     = useState(false);
  const [leaderboard, setLeaderboard]     = useState([]);
  const [lbLoading, setLbLoading]         = useState(true);
  const channelRef = useRef(null);

  // ---- Load following IDs ----
  const loadFollowing = useCallback(async (userId) => {
    if (!userId) { setFollowingIds([]); return; }
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    setFollowingIds((data || []).map(r => r.following_id));
  }, []);

  // ---- Load leaderboard ----
  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_listening_leaderboard', { p_days: 30 });
    if (!rpcErr && rpcData) { setLeaderboard(rpcData); setLbLoading(false); return; }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await supabase
      .from('track_play_logs')
      .select('user_id, track_name, artist_name, played_at')
      .gte('played_at', since)
      .order('played_at', { ascending: false });

    if (!logs?.length) { setLbLoading(false); return; }

    const userIds = [...new Set(logs.map(l => l.user_id))];
    const { data: profiles } = await supabase
      .from('profiles').select('id, username, avatar_url').in('id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const counts = {};
    logs.forEach(l => {
      if (!counts[l.user_id]) counts[l.user_id] = { user_id: l.user_id, play_count: 0, last_track_name: l.track_name, last_artist_name: l.artist_name };
      counts[l.user_id].play_count++;
    });

    setLeaderboard(
      Object.values(counts)
        .map(e => ({ ...e, ...profileMap[e.user_id] }))
        .sort((a, b) => b.play_count - a.play_count)
        .slice(0, 20)
    );
    setLbLoading(false);
  }, []);

  // ---- Load feed (stale filter: 24h) ----
  const loadFeed = useCallback(async () => {
    const staleThreshold = new Date(Date.now() - STALE_MS).toISOString();
    const { data: states } = await supabase
      .from('user_sound_state')
      .select('user_id, track_id, track_name, artist_name, track_image_url, is_playing, emotional_label, updated_at')
      .gte('updated_at', staleThreshold)
      .like('track_id', 'lastfm:%')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (!states?.length) { setLoading(false); return; }

    const userIds = [...new Set(states.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles').select('id, username, avatar_url').in('id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const merged = states
      .map(s => ({ ...s, profiles: profileMap[s.user_id] || null }))
      .sort((a, b) => {
        if (a.is_playing !== b.is_playing) return a.is_playing ? -1 : 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      });

    setFeed(merged);
    setLoading(false);
  }, []);

  // ---- Init ----
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
      loadFollowing(user?.id || null);
    });
    loadFeed();
    loadLeaderboard();

    channelRef.current = supabase
      .channel('global-music-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sound_state' }, () => {
        loadFeed();
        setTimeout(loadLeaderboard, 3000);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'track_play_logs' }, loadLeaderboard)
      .subscribe();

    const feedPoll = setInterval(loadFeed, 30_000);
    const lbPoll   = setInterval(loadLeaderboard, 60_000);
    return () => {
      channelRef.current?.unsubscribe();
      clearInterval(feedPoll);
      clearInterval(lbPoll);
    };
  }, []);

  // ---- Sync en visibilitychange y focus ----
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadFeed();
    };
    const onFocus = () => loadFeed();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadFeed]);

  // ---- Derived data ----
  const visibleFeed = friendsOnly && followingIds
    ? feed.filter(f => followingIds.includes(f.user_id))
    : feed;

  const playing = visibleFeed.filter(f => f.is_playing);
  const recent  = visibleFeed.filter(f => !f.is_playing);

  // Discover: unique tracks from others with listener avatars
  const discoverTracks = (() => {
    const others = feed.filter(f => f.user_id !== currentUserId && f.track_id);
    const map = {};
    others.forEach(f => {
      if (!map[f.track_id]) {
        map[f.track_id] = {
          id: f.track_id,
          name: f.track_name,
          artist: f.artist_name,
          image: f.track_image_url,
          count: 0,
          listeners: [],
        };
      }
      map[f.track_id].count++;
      if (f.profiles) {
        map[f.track_id].listeners.push({
          userId: f.user_id,
          username: f.profiles.username,
          avatar: f.profiles.avatar_url,
        });
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 20);
  })();

  const hasFollowing = followingIds && followingIds.length > 0;

  return (
    <div className="gf-page">
      <div className="gf-header">
        <Radio size={28} className="gf-header__icon" />
        <div>
          <h1 className="gf-header__title">Ahora Suena</h1>
          <p className="gf-header__sub">Lo que la comunidad escucha en tiempo real</p>
        </div>
        <div className="gf-header__controls">
          {playing.length > 0 && (
            <span className="gf-header__count">{playing.length} en vivo</span>
          )}
          {hasFollowing && (
            <button
              className={`gf-friends-btn ${friendsOnly ? 'active' : ''}`}
              onClick={() => setFriendsOnly(v => !v)}
              title="Mostrar solo amigos"
            >
              <Users size={16} />
              {friendsOnly ? 'Amigos' : 'Todos'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="gf-loading">
          <div className="gf-loading__bars">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="gf-loading__bar" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      ) : visibleFeed.length === 0 ? (
        <>
          <div className="gf-empty">
            <Music size={48} />
            <p>
              {friendsOnly
                ? 'Ningún amigo está escuchando ahora.'
                : 'Nadie está escuchando aún.'}
              <br />
              <span>Conecta tu Last.fm para aparecer aquí.</span>
            </p>
          </div>
          <section className="gf-section">
            <h2 className="gf-section__title"><Trophy size={14} /> Clasificación — últimos 30 días</h2>
            <Leaderboard entries={leaderboard} loading={lbLoading} />
          </section>
        </>
      ) : (
        <>
          {/* Descubrir */}
          {discoverTracks.length > 0 && !friendsOnly && (
            <section className="gf-section">
              <h2 className="gf-section__title"><Sparkles size={14} /> Descubrir — lo que escucha la comunidad</h2>
              <div className="gf-discover-list">
                {discoverTracks.map(track => (
                  <DiscoverCard
                    key={track.id}
                    track={track}
                    count={track.count}
                    listeners={track.listeners}
                    onPlay={() => {
                      const url = isLastfm(track.id)
                        ? `https://www.last.fm/music/${encodeURIComponent(track.artist)}/_/${encodeURIComponent(track.name)}`
                        : `https://open.spotify.com/track/${track.id}`;
                      openUrl(url);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* En vivo */}
          {playing.length > 0 && (
            <section className="gf-section">
              <h2 className="gf-section__title"><span className="gf-section__dot" /> En vivo ahora</h2>
              <div className="gf-grid">
                <AnimatePresence>
                  {playing.map(item => <MusicCard key={item.user_id} item={item} />)}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Últimas escuchadas */}
          {recent.length > 0 && (
            <section className="gf-section">
              <h2 className="gf-section__title"><TrendingUp size={14} /> Últimas escuchadas</h2>
              <div className="gf-grid">
                <AnimatePresence>
                  {recent.map(item => <MusicCard key={item.user_id} item={item} />)}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Clasificación */}
          <section className="gf-section">
            <h2 className="gf-section__title"><Trophy size={14} /> Clasificación — últimos 30 días</h2>
            <Leaderboard entries={leaderboard} loading={lbLoading} />
          </section>
        </>
      )}
    </div>
  );
}
