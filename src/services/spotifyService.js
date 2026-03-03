import { supabase } from '../supabaseClient';

export const spotifyService = {
    supabase, // Exponer para verificaciones externas

    // --- HELPERS ---
    _getRedirectUri() {
        const uri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/spotify-callback`;
        console.log('[Spotify Debug] Redirect URI detectada:', uri);
        return uri;
    },

    // --- AUTH ---
    async getAuthUrl() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        if (!clientId) throw new Error('Client ID de Spotify no configurado. Falta VITE_SPOTIFY_CLIENT_ID en el archivo .env');

        const redirectUri = this._getRedirectUri();
        const scope = 'user-read-currently-playing user-top-read user-read-private';
        const state = user.id;

        return `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    },

    async handleCallback(code, state) {
        // Usamos fetch directo con anon key para bypasear posibles problemas
        // de JWT cuando Supabase PKCE intercepta el code de Spotify
        const redirectUri = this._getRedirectUri();
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/spotify-api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                action: 'exchange',
                code,
                userId: state,
                redirect_uri: redirectUri
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || `Error ${response.status}`);
        }

        return response.json();
    },

    // --- DATA FETCH ---
    async _spotifyInvoke(payload) {
        // Bloqueo preventivo si ya sabemos que la sesión expiró
        if (this._isAuthExpired) {
            const error = new Error('Spotify Session Expired (Shield Block)');
            error.status = 401;
            throw error;
        }

        // Usamos fetch directo con anon key para evitar conflictos de JWT
        // causados por el flujo PKCE de Supabase al interceptar callbacks de Spotify
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/spotify-api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const err = { status: response.status, message: data.error || data.message || `Error ${response.status}` };
            this.isAuthError(err);
            const error = new Error(err.message);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();

        // Si la respuesta de Spotify viene dentro de data con error
        if (data?.error && this.isAuthError(data)) {
            throw data;
        }

        return data;
    },

    async getCurrentPlaying(userId) {
        return await this._spotifyInvoke({ action: 'current-playing', userId });
    },

    async getTopTracks(userId, limit = 5) {
        const data = await this._spotifyInvoke({ action: 'top-tracks', userId, limit });
        return data?.items || [];
    },

    async getTopArtists(userId, limit = 3) {
        const data = await this._spotifyInvoke({ action: 'top-artists', userId, limit });
        return data?.items || [];
    },

    async isConnected(userId) {
        const { data, error } = await supabase
            .from('spotify_connections')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) return false;
        return !!data;
    },

    async disconnect() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('spotify_connections')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;
    },

    async getUsernameById(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();
        if (error || !data) return userId; // Fallback to ID if not found
        return data.username;
    },

    // --- EMOTIONAL MUSIC RADAR ---

    translateAudioFeatures(valence, energy) {
        if (valence == null || energy == null) return 'Sintonizando Estrellas';

        if (energy > 0.8) return 'Sobrecarga de Energía';
        if (valence > 0.6 && energy > 0.6) return 'Euforia Activa';
        if (valence > 0.6 && energy <= 0.6) return 'Calma Luminosa';
        if (valence <= 0.4 && energy > 0.6) return 'Intensidad Melancólica';
        if (valence <= 0.4 && energy <= 0.4) return 'Introspección Profunda';

        return 'Frecuencia Estable';
    },

    // --- STATE ---
    _isAuthExpired: false,

    isAuthError(e) {
        if (!e) return false;
        // Normalizamos el status de diferentes fuentes (Supabase error, Response data, etc)
        const status = e.status || e.context?.status || e.error?.status;
        const message = String(e.message || e.error?.message || '').toLowerCase();

        const isAuth = status === 401 || status === 403 ||
            message.includes('401') || message.includes('403') ||
            message.includes('unauthorized') || message.includes('expired');

        if (isAuth) {
            console.log('[Spotify Shield] Marcando sesión como expirada.');
            this._isAuthExpired = true;
        }
        return isAuth;
    },

    setAuthValid() {
        this._isAuthExpired = false;
    },

    getAuthExpired() {
        return this._isAuthExpired;
    },

    async syncCurrentSoundState() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Verificar si el usuario permite compartir musica state
            const { data: profile } = await supabase
                .from('profiles')
                .select('share_music_state')
                .eq('id', user.id)
                .single();

            if (profile && profile.share_music_state === false) return null;

            const current = await this.getCurrentPlaying(user.id);
            if (!current || !current.item) {
                // Not playing, you could theoretically sync a "paused" state but for now ignore or set is_playing false.
                return null; // Opting to do nothing to preserve last track, or maybe we just don't sync.
            }

            const track = current.item;
            const features = current.audio_features || {};
            const isPlaying = current.is_playing;

            // Si la canción está pausada mucho tiempo, no hacemos spam a Supabase, 
            // pero si está reproduciéndose, guardamos el estado.

            const emotionalLabel = this.translateAudioFeatures(features.valence, features.energy);

            const { error } = await supabase.rpc('sync_user_sound_state', {
                p_track_id: track.id,
                p_track_name: track.name,
                p_artist_id: track.artists[0]?.id || 'unknown',
                p_artist_name: track.artists[0]?.name || 'Unknown Artist',
                p_valence: features.valence ?? null,
                p_energy: features.energy ?? null,
                p_tempo: features.tempo ?? null,
                p_emotional_label: emotionalLabel,
                p_is_playing: isPlaying,
                p_track_image_url: track.album?.images?.[0]?.url || null
            });

            if (error) {
                console.error('[Spotify] Error sincornizando estado sonoro:', error);
            }

            return {
                track,
                features,
                emotionalLabel,
                isPlaying
            };

        } catch (e) {
            // Propagamos el error si es un fallo de autorización (401/403)
            // para que el MusicSyncTracker pueda detener el polling.
            if (this.isAuthError(e)) {
                throw e;
            }
            console.error('[Spotify] Fallo en syncCurrentSoundState:', e);
            return null;
        }
    },

    async getUserSoundState(userId) {
        const { data, error } = await supabase
            .from('user_sound_state')
            .select('*')
            .eq('user_id', userId)
            .limit(1);

        if (error) return null;
        return data && data.length > 0 ? data[0] : null; // Avoids 406 network console error when 0 rows (RLS or empty)
    },

    async getUserSoundAverage(userId) {
        const { data, error } = await supabase.rpc('get_user_sound_average', {
            p_user_id: userId
        });

        if (error) return null;
        return data; // Returns { valence, energy }
    },

    async getMusicOverlap(userA, userB) {
        if (!userA || !userB) return null;
        const { data, error } = await supabase
            .from('music_overlap')
            .select('*')
            .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return null;
        return data;
    },

    async searchTracks(query, userId, limit = 8) {
        const data = await this._spotifyInvoke({ action: 'search', query, limit, userId });
        return data?.tracks?.items || [];
    }
};
