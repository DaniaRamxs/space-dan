import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Detección de Tauri
const isTauri = typeof window !== 'undefined' && (
  window.__TAURI_INTERNALS__ !== undefined ||
  window.__TAURI__ !== undefined ||
  window.location.hostname === 'tauri.localhost' ||
  window.location.protocol === 'tauri:'
);

export function useSpotify({ userId = null, isOwn = true } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [streamingStats, setStreamingStats] = useState(null);

  // Verificar conexión existente
  useEffect(() => {
    // En Tauri, hacer una verificación más segura
    if (isTauri) {
      checkSpotifyConnectionTauri();
    } else {
      checkSpotifyConnection();
    }
  }, [userId]);

  const checkSpotifyConnectionTauri = async () => {
    // When viewing someone else's profile, skip the local token check
    // and fall through to the database-backed connection check instead
    if (!isOwn) {
      return checkSpotifyConnection();
    }
    try {
      // Verificar si hay un token guardado en localStorage
      const savedToken = localStorage.getItem('spotify_access_token');
      if (savedToken) {
        setIsConnected(true);
        await fetchSpotifyData();
      }
    } catch (error) {
      console.log('[Spotify] Tauri: No hay conexión guardada');
    }
  };

  const checkSpotifyConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = userId || user?.id;
      if (!targetId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('spotify_connected, spotify_access_token, spotify_refresh_token')
        .eq('id', targetId)
        .single();

      if (profile?.spotify_connected) {
        setIsConnected(true);
        await fetchSpotifyData();
      }
    } catch (error) {
      console.error('[Spotify] Error checking connection:', error);
    }
  };

  const connectSpotify = async () => {
    if (!isOwn) return;
    setIsLoading(true);
    try {
      if (isTauri) {
        // En Tauri, abrir URL directamente
        const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
          response_type: 'code',
          client_id: 'YOUR_CLIENT_ID', // Necesitarás configurar esto
          scope: 'user-read-currently-playing user-read-playback-state user-top-read user-read-recently-played user-read-playback-position',
          redirect_uri: `${window.location.origin}/auth/spotify/callback`,
          state: 'tauri_connection'
        })}`;
        
        // Abrir en navegador del sistema
        window.open(authUrl, '_blank');
      } else {
        // Web normal - usar Supabase
        const { data, error } = await supabase.functions.invoke('spotify-auth', {
          body: { action: 'connect' }
        });

        if (error) throw error;
        
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('[Spotify] Error connecting:', error);
      alert('Error al conectar con Spotify');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectSpotify = async () => {
    if (!isOwn) return;
    try {
      if (isTauri) {
        // Limpiar localStorage en Tauri
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
      } else {
        // Web normal - usar Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('profiles')
          .update({ 
            spotify_connected: false,
            spotify_access_token: null,
            spotify_refresh_token: null 
          })
          .eq('id', user.id);
      }

      setIsConnected(false);
      setCurrentlyPlaying(null);
      setTopArtists([]);
      setTopTracks([]);
      setStreamingStats(null);
    } catch (error) {
      console.error('[Spotify] Error disconnecting:', error);
    }
  };

  const fetchSpotifyData = useCallback(async () => {
    try {
      // En Tauri, usar datos simulados más realistas
      if (isTauri) {
        const mockData = {
          currentlyPlaying: {
            name: "Swim",
            artists: [{ name: "BTS" }],
            album: { name: "Wings", images: [{ url: "/default-album.png" }] },
            is_playing: true,
            progress_ms: 45000,
            duration_ms: 180000
          },
          topArtists: [
            { id: '1', name: 'BTS', images: [{ url: '/default-artist.png' }], followers: { total: 50000000 }, genres: ['K-Pop', 'Pop', 'Hip Hop'] },
            { id: '2', name: 'Coldplay', images: [{ url: '/default-artist.png' }], followers: { total: 35000000 }, genres: ['Pop', 'Rock', 'Alternative'] },
            { id: '3', name: 'Billie Eilish', images: [{ url: '/default-artist.png' }], followers: { total: 28000000 }, genres: ['Pop', 'Electronic', 'Alternative'] }
          ],
          topTracks: [
            { 
              id: '1', 
              name: 'Swim', 
              artists: [{ name: 'BTS' }], 
              album: { images: [{ url: '/default-album.png' }] }, 
              popularity: 95,
              hoursPlayed: 80.5,
              playCount: 1247,
              firstPlayed: '2024-03-01',
              lastPlayed: '2024-03-27'
            },
            { 
              id: '2', 
              name: 'Dynamite', 
              artists: [{ name: 'BTS' }], 
              album: { images: [{ url: '/default-album.png' }] }, 
              popularity: 90,
              hoursPlayed: 45.2,
              playCount: 892,
              firstPlayed: '2024-03-05',
              lastPlayed: '2024-03-26'
            },
            { 
              id: '3', 
              name: 'Yellow', 
              artists: [{ name: 'Coldplay' }], 
              album: { images: [{ url: '/default-album.png' }] }, 
              popularity: 88,
              hoursPlayed: 32.8,
              playCount: 523,
              firstPlayed: '2024-03-10',
              lastPlayed: '2024-03-25'
            },
            { 
              id: '4', 
              name: 'Bad Guy', 
              artists: [{ name: 'Billie Eilish' }], 
              album: { images: [{ url: '/default-album.png' }] }, 
              popularity: 92,
              hoursPlayed: 28.4,
              playCount: 467,
              firstPlayed: '2024-03-12',
              lastPlayed: '2024-03-27'
            }
          ],
          streamingStats: {
            weeklyHours: 24.5,
            totalHours: 186.7,
            uniqueTracks: 342,
            newArtists: 18,
            genresExplored: 12,
            topGenres: [
              { name: 'K-Pop', weight: 1.0, hours: 89.3 },
              { name: 'Pop', weight: 0.8, hours: 45.2 },
              { name: 'Alternative', weight: 0.6, hours: 28.7 },
              { name: 'Electronic', weight: 0.5, hours: 15.8 },
              { name: 'Rock', weight: 0.4, hours: 7.7 }
            ],
            mostPlayedTrack: {
              name: 'Swim',
              artists: ['BTS'],
              hoursPlayed: 80.5,
              playCount: 1247,
              percentage: 43.1
            },
            mostPlayedArtist: {
              name: 'BTS',
              hoursPlayed: 125.8,
              trackCount: 8,
              percentage: 67.4
            },
            dailyAverage: 6.7,
            peakDay: '2024-03-15',
            peakDayHours: 12.4,
            listeningStreak: 12,
            topSessions: [
              { date: '2024-03-15', hours: 12.4, tracks: 156 },
              { date: '2024-03-22', hours: 8.7, tracks: 98 },
              { date: '2024-03-20', hours: 7.2, tracks: 87 }
            ]
          }
        };

        setCurrentlyPlaying(mockData.currentlyPlaying);
        setTopArtists(mockData.topArtists);
        setTopTracks(mockData.topTracks);
        setStreamingStats(mockData.streamingStats);
      } else {
        // Web normal - usar API real
        const [playing, artists, tracks, stats] = await Promise.all([
          fetchCurrentlyPlaying(),
          fetchTopArtists(),
          fetchTopTracks(),
          fetchStreamingStats()
        ]);

        setCurrentlyPlaying(playing);
        setTopArtists(artists);
        setTopTracks(tracks);
        setStreamingStats(stats);
      }
    } catch (error) {
      console.error('[Spotify] Error fetching data:', error);
    }
  }, []);

  const fetchCurrentlyPlaying = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-api', {
        body: { endpoint: '/me/player/currently-playing', ...(userId && { userId }) }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[Spotify] Error fetching currently playing:', error);
      return null;
    }
  };

  const fetchTopArtists = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-api', {
        body: { endpoint: '/me/top/artists', params: { limit: 10, time_range: 'short_term' }, ...(userId && { userId }) }
      });

      if (error) throw error;
      return data?.items || [];
    } catch (error) {
      console.error('[Spotify] Error fetching top artists:', error);
      return [];
    }
  };

  const fetchTopTracks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-api', {
        body: { endpoint: '/me/top/tracks', params: { limit: 10, time_range: 'short_term' }, ...(userId && { userId }) }
      });

      if (error) throw error;
      return data?.items || [];
    } catch (error) {
      console.error('[Spotify] Error fetching top tracks:', error);
      return [];
    }
  };

  const fetchStreamingStats = async () => {
    try {
      // Simular estadísticas (en producción vendrían de Spotify API o análisis locales)
      const mockStats = {
        weeklyHours: 24.5,
        uniqueTracks: 342,
        newArtists: 18,
        genresExplored: 12,
        topGenres: [
          { name: 'Electronic', weight: 1.0 },
          { name: 'Pop', weight: 0.8 },
          { name: 'Indie', weight: 0.6 },
          { name: 'Rock', weight: 0.5 },
          { name: 'Hip Hop', weight: 0.4 },
          { name: 'Jazz', weight: 0.3 },
          { name: 'Classical', weight: 0.2 },
          { name: 'R&B', weight: 0.3 }
        ]
      };

      return mockStats;
    } catch (error) {
      console.error('[Spotify] Error fetching stats:', error);
      return null;
    }
  };

  const refreshData = useCallback(async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      await fetchSpotifyData();
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, fetchSpotifyData]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      fetchCurrentlyPlaying().then(setCurrentlyPlaying);
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    isConnected,
    isLoading,
    currentlyPlaying,
    topArtists,
    topTracks,
    streamingStats,
    connectSpotify,
    disconnectSpotify,
    refreshData
  };
}
