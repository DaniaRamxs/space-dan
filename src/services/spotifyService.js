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
    }
};
