import { supabase } from '../supabaseClient';

export const spotifyService = {
    // --- AUTH ---
    async getAuthUrl() {
        // Generate auth URL using Spotify API
        // Redirect to: https://accounts.spotify.com/authorize
        // callback handled by Edge Function: supabase/functions/spotify-auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        if (!clientId) throw new Error('Client ID de Spotify no configurado. Falta VITE_SPOTIFY_CLIENT_ID en el archivo .env');

        const redirectUri = `${window.location.origin}/spotify-callback`; // React route
        const scope = 'user-read-currently-playing user-top-read';
        const state = user.id;

        return `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    },

    async handleCallback(code, state) {
        // Exchange code for token via Edge Function
        const { data, error } = await supabase.functions.invoke('spotify-api', {
            body: { action: 'exchange', code, userId: state }
        });

        if (error) throw error;
        return data;
    },

    // --- DATA FETCH ---
    async getCurrentPlaying(userId) {
        // Proxy request via Edge Function to handle refresh tokens securely
        const { data, error } = await supabase.functions.invoke('spotify-api', {
            body: { action: 'current-playing', userId }
        });

        if (error) return null; // Likely not connected or not playing
        return data;
    },

    async getTopTracks(userId, limit = 5) {
        const { data, error } = await supabase.functions.invoke('spotify-api', {
            body: { action: 'top-tracks', userId, limit }
        });

        if (error) throw error;
        return data.items || [];
    },

    async getTopArtists(userId, limit = 3) {
        const { data, error } = await supabase.functions.invoke('spotify-api', {
            body: { action: 'top-artists', userId, limit }
        });

        if (error) throw error;
        return data.items || [];
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
                p_is_playing: isPlaying
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
            console.error('[Spotify] Fallo en syncCurrentSoundState:', e);
            return null;
        }
    },

    async getUserSoundState(userId) {
        const { data, error } = await supabase
            .from('user_sound_state')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) return null;
        return data; // Puede ser null si el RLS lo bloquea porque share_music_state es false
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
    }
};
