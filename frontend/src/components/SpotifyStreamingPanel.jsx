import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, Volume2,
  TrendingUp, Clock, Music, Users, Headphones,
  RefreshCw, Link2, Unlink
} from 'lucide-react';

const Spotify = ({ size = 24, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);
import { useSpotify } from '../hooks/useSpotify';
import '../styles/spotify-stats.css';

// Detección de plataforma
const isTauri = typeof window !== 'undefined' && (
  window.__TAURI_INTERNALS__ !== undefined ||
  window.__TAURI__ !== undefined ||
  window.location.hostname === 'tauri.localhost' ||
  window.location.protocol === 'tauri:'
);

export default function SpotifyStreamingPanel() {
  const { 
    isConnected, 
    connectSpotify, 
    disconnectSpotify, 
    currentlyPlaying, 
    topArtists, 
    topTracks, 
    streamingStats,
    refreshData,
    isLoading 
  } = useSpotify();

  const [activeTab, setActiveTab] = useState('nowplaying');

  // En Tauri, mostrar mensaje especial si no hay conexión a internet
  useEffect(() => {
    if (isTauri && !navigator.onLine) {
      console.log('[Spotify] Tauri detectado sin conexión a internet');
    }
  }, []);

  if (!isConnected) {
    return (
      <div className="spotify-connect-panel">
        <motion.div 
          className="connect-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Spotify className="spotify-icon" size={48} />
          <h3>Conectar Spotify</h3>
          <p>
            {isTauri 
              ? "Conecta tu cuenta para mostrar estadísticas de streaming en tu perfil de escritorio"
              : "Muestra tus estadísticas de streaming en tu perfil"
            }
          </p>
          <button 
            onClick={connectSpotify}
            className="spotify-connect-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <Link2 size={20} />
            )}
            Conectar Spotify
          </button>
          {isTauri && (
            <p className="tauri-note">
              💡 Se abrirá una ventana del navegador para conectar con Spotify
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="spotify-streaming-panel">
      {/* Header */}
      <div className="spotify-header">
        <div className="spotify-brand">
          <Spotify className="spotify-logo" size={32} />
          <h2>Streaming Musical</h2>
        </div>
        <div className="spotify-actions">
          <button 
            onClick={refreshData}
            className="refresh-btn"
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? 'animate-spin' : ''} size={20} />
          </button>
          <button 
            onClick={disconnectSpotify}
            className="disconnect-btn"
          >
            <Unlink size={20} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="spotify-tabs">
        {[
          { id: 'nowplaying', label: 'Ahora', icon: Play },
          { id: 'artists', label: 'Artistas', icon: Users },
          { id: 'tracks', label: 'Canciones', icon: Music },
          { id: 'stats', label: 'Estadísticas', icon: TrendingUp }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="spotify-content">
        {activeTab === 'nowplaying' && <NowPlayingCard track={currentlyPlaying} />}
        {activeTab === 'artists' && <TopArtists artists={topArtists} />}
        {activeTab === 'tracks' && <TopTracks tracks={topTracks} />}
        {activeTab === 'stats' && <StreamingStats stats={streamingStats} />}
      </div>
    </div>
  );
}

// Componente: Now Playing
function NowPlayingCard({ track }) {
  if (!track) {
    return (
      <div className="now-playing-empty">
        <Music className="music-icon" size={48} />
        <p>No hay nada reproduciéndose</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="now-playing-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="track-artwork">
        <img 
          src={track.album.images[0]?.url || '/default-album.png'} 
          alt={track.name}
          className="album-cover"
        />
        <div className="playing-indicator">
          <div className="sound-bars">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bar" />
            ))}
          </div>
        </div>
      </div>
      
      <div className="track-info">
        <h4 className="track-name">{track.name}</h4>
        <p className="track-artist">{track.artists.map(a => a.name).join(', ')}</p>
        <p className="track-album">{track.album.name}</p>
      </div>

      <div className="track-controls">
        <button className="control-btn">
          <SkipBack size={20} />
        </button>
        <button className="control-btn primary">
          {track.is_playing ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button className="control-btn">
          <SkipForward size={20} />
        </button>
      </div>

      <div className="track-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(track.progress_ms / track.duration_ms) * 100}%` }}
          />
        </div>
        <div className="time-info">
          <span>{formatTime(track.progress_ms)}</span>
          <span>{formatTime(track.duration_ms)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// Componente: Top Artists
function TopArtists({ artists }) {
  return (
    <div className="top-artists-grid">
      {artists?.slice(0, 6).map((artist, index) => (
        <motion.div 
          key={artist.id}
          className="artist-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="artist-rank">#{index + 1}</div>
          <img 
            src={artist.images[0]?.url || '/default-artist.png'} 
            alt={artist.name}
            className="artist-avatar"
          />
          <div className="artist-info">
            <h5 className="artist-name">{artist.name}</h5>
            <p className="artist-genres">{artist.genres.slice(0, 2).join(', ')}</p>
            <div className="artist-stats">
              <Users size={14} />
              <span>{formatNumber(artist.followers.total)} seguidores</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Componente: Top Tracks con horas
function TopTracks({ tracks }) {
  return (
    <div className="top-tracks-list">
      {tracks?.slice(0, 10).map((track, index) => (
        <motion.div 
          key={track.id}
          className="track-row"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="track-rank">{index + 1}</div>
          <img 
            src={track.album?.images[0]?.url || '/default-album.png'} 
            alt={track.name}
            className="track-thumbnail"
          />
          <div className="track-details">
            <h6 className="track-title">{track.name}</h6>
            <p className="track-artists">{track.artists.map(a => a.name).join(', ')}</p>
            <div className="track-stats">
              <span className="track-hours">🎵 {track.hoursPlayed || 0}h</span>
              <span className="track-plays">▶️ {track.playCount || 0} reproducciones</span>
            </div>
          </div>
          <div className="track-popularity">
            <div className="popularity-bar">
              <div 
                className="popularity-fill" 
                style={{ width: `${track.popularity}%` }}
              />
            </div>
            <span className="popularity-score">{track.popularity}%</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Componente: Streaming Stats mejorado
function StreamingStats({ stats }) {
  const statCards = [
    {
      icon: Clock,
      label: "Horas esta semana",
      value: `${stats?.weeklyHours || 0}h`,
      change: "+12%",
      positive: true
    },
    {
      icon: Clock,
      label: "Horas totales",
      value: `${stats?.totalHours || 0}h`,
      change: "+24%",
      positive: true
    },
    {
      icon: Music,
      label: "Canciones únicas",
      value: stats?.uniqueTracks || 0,
      change: "+8%",
      positive: true
    },
    {
      icon: Users,
      label: "Artistas descubiertos",
      value: stats?.newArtists || 0,
      change: "+15%",
      positive: true
    }
  ];

  return (
    <div className="streaming-stats-grid">
      {statCards.map((stat, index) => (
        <motion.div 
          key={stat.label}
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="stat-icon">
            <stat.icon size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">{stat.label}</p>
            <h4 className="stat-value">{stat.value}</h4>
            <div className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
              <TrendingUp size={16} />
              <span>{stat.change}</span>
            </div>
          </div>
        </motion.div>
      ))}
      
      {/* Canción Más Escuchada */}
      {stats?.mostPlayedTrack && (
        <motion.div 
          className="most-played-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h5>🏆 Canción Más Escuchada</h5>
          <div className="most-played-content">
            <div className="most-played-info">
              <h6 className="most-played-name">{stats.mostPlayedTrack.name}</h6>
              <p className="most-played-artist">{stats.mostPlayedTrack.artists.join(', ')}</p>
            </div>
            <div className="most-played-stats">
              <div className="most-played-hours">
                <span className="hours-number">{stats.mostPlayedTrack.hoursPlayed}</span>
                <span className="hours-label">horas</span>
              </div>
              <div className="most-played-details">
                <span>▶️ {stats.mostPlayedTrack.playCount} reproducciones</span>
                <span>{stats.mostPlayedTrack.percentage}% del total</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Artista Más Escuchado */}
      {stats?.mostPlayedArtist && (
        <motion.div 
          className="most-played-card artist-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h5>🎤 Artista Más Escuchado</h5>
          <div className="most-played-content">
            <div className="most-played-info">
              <h6 className="most-played-name">{stats.mostPlayedArtist.name}</h6>
              <p className="most-played-artist">{stats.mostPlayedArtist.trackCount} canciones</p>
            </div>
            <div className="most-played-stats">
              <div className="most-played-hours">
                <span className="hours-number">{stats.mostPlayedArtist.hoursPlayed}</span>
                <span className="hours-label">horas</span>
              </div>
              <div className="most-played-details">
                <span>{stats.mostPlayedArtist.percentage}% del total</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Genre Cloud */}
      <motion.div 
        className="genre-cloud-card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <h5>Géneros más escuchados</h5>
        <div className="genre-tags">
          {stats?.topGenres?.map((genre, index) => (
            <span 
              key={genre.name}
              className="genre-tag"
              style={{ 
                fontSize: `${0.8 + (genre.weight * 0.4)}rem`,
                opacity: 0.6 + (genre.weight * 0.4)
              }}
              title={`${genre.hours} horas`}
            >
              {genre.name} ({genre.hours}h)
            </span>
          ))}
        </div>
      </motion.div>

      {/* Sesiones Destacadas */}
      {stats?.topSessions && (
        <motion.div 
          className="top-sessions-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <h5>🔥 Sesiones Más Largas</h5>
          <div className="sessions-list">
            {stats.topSessions.map((session, index) => (
              <div key={session.date} className="session-row">
                <div className="session-rank">#{index + 1}</div>
                <div className="session-info">
                  <span className="session-date">{new Date(session.date).toLocaleDateString()}</span>
                  <span className="session-hours">{session.hours}h</span>
                </div>
                <div className="session-details">
                  <span>{session.tracks} canciones</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Utilidades
function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
