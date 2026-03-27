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
    checkSpotifyConnection();
  }, [userId]);

  const checkSpotifyConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = userId || user?.id;
      console.log('[Spotify] checkConnection — targetId:', targetId);
      if (!targetId) return;

      const { data: connection, error: connErr } = await supabase
        .from('spotify_connections')
        .select('user_id, access_token')
        .eq('user_id', targetId)
        .maybeSingle();

      console.log('[Spotify] connection row:', connection, 'error:', connErr);

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

  // Usar fetch directo con anon key — igual que handleCallback en spotifyService.
  // supabase.functions.invoke envía el JWT del usuario que el gateway rechaza con 401.
  const invokeSpotifyApi = async (body) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/spotify-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const fetchCurrentlyPlaying = async () => {
    try {
      const targetId = await resolveUserId();
      if (!targetId) return null;
      const data = await invokeSpotifyApi({ action: 'current-playing', userId: targetId });
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
      const data = await invokeSpotifyApi({ action: 'top-artists', userId: targetId, limit: 10 });
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
      const data = await invokeSpotifyApi({ action: 'top-tracks', userId: targetId, limit: 10 });
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

      const [artistsData, tracksData] = await Promise.all([
        invokeSpotifyApi({ action: 'top-artists', userId: targetId, limit: 20 }),
        invokeSpotifyApi({ action: 'top-tracks', userId: targetId, limit: 20 }),
      ]);

      const artists = artistsData?.items || [];
      const tracks = tracksData?.items || [];

      const genreCount = {};
      artists.forEach(a => a.genres?.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; }));
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count], _, arr) => ({ name, weight: count / arr[0][1] }));

      const topArtist = artists[0] || null;
      const topTrack = tracks[0] || null;
      const avgPopularity = tracks.length
        ? Math.round(tracks.reduce((s, t) => s + (t.popularity || 0), 0) / tracks.length)
        : 0;

      return {
        topGenres,
        uniqueArtists: artists.length,
        uniqueTracks: tracks.length,
        genresCount: Object.keys(genreCount).length,
        avgPopularity,
        topArtist: topArtist ? {
          name: topArtist.name,
          image: topArtist.images?.[0]?.url,
          genres: topArtist.genres?.slice(0, 2).join(', '),
          url: topArtist.external_urls?.spotify,
        } : null,
        topTrack: topTrack ? {
          name: topTrack.name,
          artist: topTrack.artists?.map(a => a.name).join(', '),
          image: topTrack.album?.images?.[0]?.url,
          popularity: topTrack.popularity,
          url: topTrack.external_urls?.spotify,
        } : null,
      };
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
