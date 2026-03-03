// supabase/functions/spotify-api/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, userId, code, query, redirect_uri, limit = 5 } = await req.json()
        console.log(`[Spotify Engine] Action: ${action}, User: ${userId}, RedirectURI: ${redirect_uri}`)

        const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')
        const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')
        const SPOTIFY_REDIRECT_URI = Deno.env.get('SPOTIFY_REDIRECT_URI')

        if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
            console.error('Missing Spotify Secrets in Supabase Project')
            return new Response(JSON.stringify({
                error: 'Spotify service is not properly configured in Supabase (missing secrets).',
                hint: 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in yours Supabase Project Secrets.'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'exchange') {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
                },
                body: new URLSearchParams({
                    code,
                    redirect_uri: redirect_uri || SPOTIFY_REDIRECT_URI || '',
                    grant_type: 'authorization_code'
                })
            })

            const data = await response.json()
            if (data.error) {
                console.error('[Spotify Exchange Error]', data)
                throw new Error(`${data.error_description || data.error} (URI: ${redirect_uri || SPOTIFY_REDIRECT_URI})`)
            }

            const expires_at = new Date()
            expires_at.setSeconds(expires_at.getSeconds() + data.expires_in)

            const { error } = await supabaseClient
                .from('spotify_connections')
                .upsert({
                    user_id: userId,
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_at: expires_at.toISOString(),
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Lógica para obtener el token actual (y refrescar si es necesario)
        const { data: connection, error: connError } = await supabaseClient
            .from('spotify_connections')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (connError || !connection) throw new Error('Spotify not connected')

        let accessToken = connection.access_token
        if (new Date(connection.expires_at) <= new Date()) {
            console.log('Refreshing Spotify token...')
            const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
                },
                body: new URLSearchParams({
                    refresh_token: connection.refresh_token,
                    grant_type: 'refresh_token'
                })
            })

            if (!refreshResponse.ok) {
                const refreshError = await refreshResponse.json().catch(() => ({}))
                console.error('Spotify Refresh Failed:', refreshError)
                return new Response(JSON.stringify({
                    error: 'Tu conexión con Spotify ha caducado.',
                    hint: 'Por favor, desconecta y vuelve a vincular Spotify en tu perfil para renovar el acceso.',
                    detail: refreshError
                }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            const refreshData = await refreshResponse.json()
            accessToken = refreshData.access_token
            const expires_at = new Date()
            expires_at.setSeconds(expires_at.getSeconds() + (refreshData.expires_in || 3600))

            await supabaseClient
                .from('spotify_connections')
                .update({
                    access_token: accessToken,
                    expires_at: expires_at.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
        }

        // Realizar la acción solicitada
        let endpoint = ''
        if (action === 'current-playing') endpoint = 'https://api.spotify.com/v1/me/player/currently-playing'
        else if (action === 'top-tracks') endpoint = `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=short_term&market=US`
        else if (action === 'top-artists') endpoint = `https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=short_term`
        else if (action === 'search') endpoint = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`

        console.log(`Action: ${action}, Endpoint: ${endpoint}`)
        const spotifyRes = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (!spotifyRes.ok) {
            const errorData = await spotifyRes.json().catch(() => ({ error: { message: 'Unknown error from Spotify' } }))
            console.error(`[Spotify API Error] Status: ${spotifyRes.status}`, errorData)

            // Si Spotify devuelve 401 directamente, es que el token que acabamos de usar (o refrescar) fue rechazado
            const isAuthError = spotifyRes.status === 401 || spotifyRes.status === 403;

            return new Response(JSON.stringify({
                error: isAuthError ? 'Error de autorización con Spotify' : (errorData.error?.message || `Spotify API error: ${spotifyRes.status}`),
                hint: isAuthError ? 'Intenta desconectar y volver a vincular Spotify en tu perfil.' : undefined,
                status: spotifyRes.status,
                detail: errorData
            }), {
                status: spotifyRes.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (spotifyRes.status === 204) {
            return new Response(JSON.stringify({}), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        let spotifyData = await spotifyRes.json()

        // --- SISTEMA DE RECUPERACIÓN DE PREVIEWS (BEST EFFORT) ---
        const recoverPreviewsForTracks = async (tracks: any[]) => {
            const recovered = await Promise.all(tracks.map(async (track: any) => {
                if (track.preview_url) return track;
                // Buscar versión con preview en mercado US
                const q = `${track.name} ${track.artists?.[0]?.name || ''}`;
                const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5&market=US`;
                const searchRes = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                if (!searchRes.ok) return track;
                const searchData = await searchRes.json();
                const match = searchData?.tracks?.items?.find((t: any) => t.preview_url);
                return match ? { ...track, preview_url: match.preview_url } : track;
            }));
            return recovered;
        };

        if (action === 'top-tracks' && spotifyData?.items) {
            const hasMissingPreviews = spotifyData.items.some((t: any) => !t.preview_url);
            if (hasMissingPreviews) {
                console.log('[Preview Recovery] Recovering previews for top-tracks...');
                spotifyData.items = await recoverPreviewsForTracks(spotifyData.items);
            }
        }

        if (action === 'search' && spotifyData?.tracks?.items) {
            const hasMissingPreviews = spotifyData.tracks.items.some((t: any) => !t.preview_url);
            if (hasMissingPreviews) {
                console.log('[Preview Recovery] Recovering previews for search results...');
                spotifyData.tracks.items = await recoverPreviewsForTracks(spotifyData.tracks.items);
            }
        }

        // Fetch Audio Features si es reproduciendo actualmente
        if (action === 'current-playing' && spotifyData?.item?.id) {
            const featuresRes = await fetch(`https://api.spotify.com/v1/audio-features/${spotifyData.item.id}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (featuresRes.ok) {
                const featuresData = await featuresRes.json()
                spotifyData.audio_features = featuresData
            }
        }

        return new Response(JSON.stringify(spotifyData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
