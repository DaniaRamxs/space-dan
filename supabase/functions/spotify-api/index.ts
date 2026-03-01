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

        const { action, userId, code, limit = 5 } = await req.json()
        const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')
        const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')
        const SPOTIFY_REDIRECT_URI = Deno.env.get('SPOTIFY_REDIRECT_URI')

        if (action === 'exchange') {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
                },
                body: new URLSearchParams({
                    code,
                    redirect_uri: SPOTIFY_REDIRECT_URI ?? '',
                    grant_type: 'authorization_code'
                })
            })

            const data = await response.json()
            if (data.error) throw new Error(data.error_description || data.error)

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
            // Refresh token
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

            const refreshData = await refreshResponse.json()
            accessToken = refreshData.access_token
            const expires_at = new Date()
            expires_at.setSeconds(expires_at.getSeconds() + refreshData.expires_in)

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
        else if (action === 'top-tracks') endpoint = `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=short_term`
        else if (action === 'top-artists') endpoint = `https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=short_term`

        const spotifyRes = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (spotifyRes.status === 204) return new Response(JSON.stringify({}), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const spotifyData = await spotifyRes.json()
        return new Response(JSON.stringify(spotifyData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
