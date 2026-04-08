import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Users, TrendingUp, RefreshCw, Link2, Unlink, Clock } from 'lucide-react';
import { useLastfm } from '../hooks/useLastfm';
import { openUrl } from '../utils/openUrl';
import '../styles/lastfm-panel.css';

const LastfmLogo = ({ size = 24, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.599 17.211l-.881-2.393s-1.433 1.596-3.579 1.596c-1.9 0-3.249-1.652-3.249-4.296 0-3.381 1.705-4.596 3.388-4.596 2.419 0 3.188 1.568 3.849 3.574l.871 2.736c.871 2.653 2.521 4.782 7.271 4.782 3.409 0 5.729-1.047 5.729-3.793 0-2.218-1.267-3.363-3.617-3.917l-1.749-.374c-1.212-.27-1.567-.748-1.567-1.551 0-.916.721-1.453 1.899-1.453 1.284 0 1.974.479 2.079 1.621l2.663-.319c-.225-2.399-1.873-3.381-4.622-3.381-2.415 0-4.727.909-4.727 3.836 0 1.824.883 2.979 3.098 3.533l1.854.464c1.378.344 1.959.852 1.959 1.74 0 1.037-.999 1.462-2.948 1.462-2.858 0-4.048-1.5-4.742-3.533l-.891-2.751c-1.152-3.558-2.994-4.872-6.572-4.872C1.945 5.527 0 8.057 0 12.193c0 3.969 2.034 6.28 5.959 6.28 3.084 0 4.64-1.262 4.64-1.262z"/>
  </svg>
);

export default function LastfmPanel({ userId = null, isOwn = true }) {
  const {
    isConnected,
    isLoading,
    username,
    userInfo,
    currentlyPlaying,
    recentTracks,
    topTracks,
    topArtists,
    connect,
    disconnect,
    refreshData,
  } = useLastfm({ userId, isOwn });

  const [activeTab, setActiveTab] = useState('nowplaying');

  if (!isConnected) {
    if (!isOwn) return null;
    return <ConnectForm onConnect={connect} isLoading={isLoading} />;
  }

  return (
    <div className="lastfm-panel">
      {/* Header */}
      <div className="lastfm-header">
        <div className="lastfm-brand">
          <LastfmLogo className="lastfm-logo" size={32} />
          <div>
            <h2>Historial Musical</h2>
            {username && (
              <p className="lastfm-account-label">
                <a href={`https://www.last.fm/user/${username}`} target="_blank" rel="noopener noreferrer">
                  {userInfo?.realname || username}
                </a>
                {userInfo?.playcount && (
                  <span className="lastfm-scrobbles"> · {formatNumber(userInfo.playcount)} scrobbles</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="lastfm-actions">
          <button onClick={refreshData} className="lastfm-refresh-btn" disabled={isLoading}>
            <RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} />
          </button>
          {isOwn && (
            <button onClick={disconnect} className="lastfm-disconnect-btn">
              <Unlink size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="lastfm-tabs">
        {[
          { id: 'nowplaying', label: 'Ahora', icon: Music },
          { id: 'recent',    label: 'Recientes', icon: Clock },
          { id: 'artists',   label: 'Artistas', icon: Users },
          { id: 'tracks',    label: 'Canciones', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`lastfm-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="lastfm-content">
        {activeTab === 'nowplaying' && <NowPlayingCard track={currentlyPlaying} />}
        {activeTab === 'recent'    && <RecentTracks tracks={recentTracks} />}
        {activeTab === 'artists'   && <TopArtists artists={topArtists} />}
        {activeTab === 'tracks'    && <TopTracks tracks={topTracks} />}
      </div>
    </div>
  );
}

// --- Connect Form ---
function ConnectForm({ onConnect, isLoading }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!input.trim()) return;
    try {
      await onConnect(input.trim());
    } catch (err) {
      setError(err.message || 'Usuario no encontrado en Last.fm');
    }
  };

  return (
    <div className="lastfm-connect-panel">
      <motion.div
        className="lastfm-connect-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <LastfmLogo className="lastfm-connect-icon" size={48} />
        <h3>Conectar Last.fm</h3>
        <p>Muestra tu historial musical en tu perfil. Disponible para todos los usuarios, sin restricciones.</p>

        <form onSubmit={handleSubmit} className="lastfm-connect-form">
          <input
            type="text"
            placeholder="Tu usuario de Last.fm"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="lastfm-username-input"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="lastfm-connect-btn" disabled={isLoading || !input.trim()}>
            {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Link2 size={18} />}
            Conectar
          </button>
        </form>

        {error && <p className="lastfm-error">{error}</p>}

        <p className="lastfm-hint">
          ¿No tienes cuenta? <a href="https://www.last.fm/join" target="_blank" rel="noopener noreferrer">Regístrate gratis</a> y activa el scrobbling desde Spotify en ajustes.
        </p>
      </motion.div>
    </div>
  );
}

// --- Now Playing ---
function NowPlayingCard({ track }) {
  if (!track) {
    return (
      <div className="lastfm-empty">
        <Music size={48} className="lastfm-empty-icon" />
        <p>No hay nada reproduciéndose ahora</p>
        <span>Los scrobbles aparecen aquí en tiempo real</span>
      </div>
    );
  }

  return (
    <motion.div
      className="lastfm-now-playing"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => track.url && openUrl(track.url)}
      style={{ cursor: 'pointer' }}
    >
      {track.image ? (
        <img src={track.image} alt={track.name} className="lastfm-album-cover" />
      ) : (
        <div className="lastfm-album-placeholder"><Music size={32} /></div>
      )}
      <div className="lastfm-now-info">
        <div className="lastfm-now-badge">
          <span className="lastfm-now-dot" />
          Escuchando ahora
        </div>
        <h4>{track.name}</h4>
        <p className="lastfm-artist">{track.artist}</p>
        {track.album && <p className="lastfm-album">{track.album}</p>}
      </div>
    </motion.div>
  );
}

// --- Recent Tracks ---
function RecentTracks({ tracks }) {
  if (!tracks?.length) {
    return (
      <div className="lastfm-empty">
        <Clock size={48} className="lastfm-empty-icon" />
        <p>Sin reproducciones recientes</p>
      </div>
    );
  }

  return (
    <div className="lastfm-track-list">
      {tracks.map((track, i) => (
        <motion.div
          key={`${track.name}-${i}`}
          className="lastfm-track-row"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => track.url && openUrl(track.url)}
          style={{ cursor: 'pointer' }}
        >
          {track.image ? (
            <img src={track.image} alt={track.name} className="lastfm-track-thumb" />
          ) : (
            <div className="lastfm-track-thumb-placeholder"><Music size={16} /></div>
          )}
          <div className="lastfm-track-info">
            <span className="lastfm-track-name">{track.name}</span>
            <span className="lastfm-track-artist">{track.artist}</span>
          </div>
          {track.date && (
            <span className="lastfm-track-time">{formatRelativeTime(track.date)}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// --- Top Artists ---
function TopArtists({ artists }) {
  if (!artists?.length) {
    return (
      <div className="lastfm-empty">
        <Users size={48} className="lastfm-empty-icon" />
        <p>Sin datos de artistas esta semana</p>
      </div>
    );
  }

  return (
    <div className="lastfm-artists-grid">
      {artists.map((artist, i) => (
        <motion.div
          key={artist.name}
          className="lastfm-artist-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          onClick={() => artist.url && openUrl(artist.url)}
          style={{ cursor: 'pointer' }}
        >
          <div className="lastfm-artist-rank">#{i + 1}</div>
          {artist.image ? (
            <img src={artist.image} alt={artist.name} className="lastfm-artist-avatar" />
          ) : (
            <div className="lastfm-artist-avatar-placeholder"><Users size={24} /></div>
          )}
          <div className="lastfm-artist-info">
            <span className="lastfm-artist-name">{artist.name}</span>
            <span className="lastfm-artist-plays">{formatNumber(artist.playcount)} reproducciones</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// --- Top Tracks ---
function TopTracks({ tracks }) {
  if (!tracks?.length) {
    return (
      <div className="lastfm-empty">
        <TrendingUp size={48} className="lastfm-empty-icon" />
        <p>Sin datos de canciones esta semana</p>
      </div>
    );
  }

  const maxPlays = tracks[0]?.playcount || 1;

  return (
    <div className="lastfm-track-list">
      {tracks.map((track, i) => (
        <motion.div
          key={`${track.name}-${i}`}
          className="lastfm-track-row"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => track.url && openUrl(track.url)}
          style={{ cursor: 'pointer' }}
        >
          <div className="lastfm-track-rank">{i + 1}</div>
          {track.image ? (
            <img src={track.image} alt={track.name} className="lastfm-track-thumb" />
          ) : (
            <div className="lastfm-track-thumb-placeholder"><Music size={16} /></div>
          )}
          <div className="lastfm-track-info">
            <span className="lastfm-track-name">{track.name}</span>
            <span className="lastfm-track-artist">{track.artist}</span>
          </div>
          <div className="lastfm-track-bar-wrap">
            <div className="lastfm-track-bar">
              <div
                className="lastfm-track-bar-fill"
                style={{ width: `${(track.playcount / maxPlays) * 100}%` }}
              />
            </div>
            <span className="lastfm-track-plays">{track.playcount}x</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// --- Utils ---
function formatNumber(n) {
  const num = parseInt(n) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
