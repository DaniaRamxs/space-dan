import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { openUrl } from '../utils/openUrl';

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
    } catch {
      console.log('[Spotify] Tauri: No hay conexión guardada');
    }
  };

  const checkSpotifyConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = userId || user?.id;
      if (!targetId) return;

      // El edge function guarda en spotify_connections, no en profiles
      const { data: connection } = await supabase
        .from('spotify_connections')
        .select('user_id, access_token')
        .eq('user_id', targetId)
        .maybeSingle();

      if (connection?.access_token) {
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
        // En Tauri: redirigir al sitio web de producción como callback.
        // No usamos 127.0.0.1 porque el navegador externo no puede conectarse
        // al proceso Tauri. La web procesa el código y guarda los tokens en Supabase,
        // y luego detectamos la conexión vía polling.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        const TAURI_REDIRECT = 'https://www.joinspacely.com/spotify-callback';
        const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
          response_type: 'code',
          client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
          scope: 'user-read-currently-playing user-top-read user-read-private user-read-playback-state user-read-recently-played',
          redirect_uri: TAURI_REDIRECT,
          state: user.id
        })}`;

        openUrl(authUrl);

        // Polling: detectar cuando la web procesa el callback y guarda la conexión
        const poll = setInterval(async () => {
          const { data: connection } = await supabase
            .from('spotify_connections')
            .select('access_token')
            .eq('user_id', user.id)
            .maybeSingle();
          if (connection?.access_token) {
            clearInterval(poll);
            setIsConnected(true);
            setIsLoading(false);
            await fetchSpotifyData();
          }
        }, 3000);

        // Cancelar polling tras 3 minutos
        setTimeout(() => {
          clearInterval(poll);
          setIsLoading(false);
        }, 180000);

        return; // El polling maneja setIsLoading(false) cuando termina
      }

      // Web normal - usar Supabase
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: { action: 'connect' }
      });

      if (error) throw error;

      window.location.href = data.authUrl;
      setIsLoading(false);
    } catch (error) {
      console.error('[Spotify] Error connecting:', error);
      alert('Error al conectar con Spotify');
      setIsLoading(false);
    }
  };

  const disconnectSpotify = async () => {
    if (!isOwn) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('spotify_connections')
        .delete()
        .eq('user_id', user.id);

      setIsConnected(false);
      setCurrentlyPlaying(null);
      setTopArtists([]);
      setTopTracks([]);
      setStreamingStats(null);
    } catch (error) {
      console.error('[Spotify] Error disconnecting:', error);
    }
  };

  const fetchSpotifyData = async () => {
    try {
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
    } catch (error) {
      console.error('[Spotify] Error fetching data:', error);
    }
  };

  const resolveUserId = async () => {
    if (userId) return userId;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  };

  const fetchCurrentlyPlaying = async () => {
    try {
      const targetId = await resolveUserId();
      if (!targetId) return null;
      const { data, error } = await supabase.functions.invoke('spotify-api', {
        body: { action: 'current-playing', userId: targetId }
      });
      if (error) throw error;
      return data?.item ? { ...data.item, is_playing: data.is_playing, progress_ms: data.progress_ms } : null;
    } catch (error) {
      console.error('[Spotify] Error fetching currently playing:', error);
      return null;
    }
  };

  const fetchTopArtists = async () => {
    try {
      const targetId = await resolveUserId();
      if (!targetId) return [];
      const { data, error } = await supabase.functions.invoke('spotify-api', {
        body: { action: 'top-artists', userId: targetId, limit: 10 }
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
      const targetId = await resolveUserId();
      if (!targetId) return [];
      const { data, error } = await supabase.functions.invoke('spotify-api', {
        body: { action: 'top-tracks', userId: targetId, limit: 10 }
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
      const targetId = await resolveUserId();
      if (!targetId) return null;
      // Derivar géneros desde los top artistas (Spotify no expone estadísticas de horas)
      const { data } = await supabase.functions.invoke('spotify-api', {
        body: { action: 'top-artists', userId: targetId, limit: 20 }
      });
      const artists = data?.items || [];
      const genreCount = {};
      artists.forEach(a => a.genres?.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; }));
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count], _, arr) => ({ name, weight: count / arr[0][1] }));
      return { topGenres, uniqueTracks: null, weeklyHours: null };
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
