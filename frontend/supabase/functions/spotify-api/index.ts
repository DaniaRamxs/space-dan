import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user's Spotify tokens
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('spotify_access_token, spotify_refresh_token')
      .eq('id', user.id)
      .single()

    if (!profile?.spotify_access_token) {
      throw new Error('Spotify not connected')
    }

    const { method } = req
    const body = await req.json()

    if (method === 'POST') {
      if (body.action === 'connect') {
        // Generate Spotify authorization URL
        const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-callback`
        const scopes = [
          'user-read-currently-playing',
          'user-read-playback-state',
          'user-top-read',
          'user-read-recently-played',
          'user-read-playback-position'
        ].join(' ')

        const authUrl = new URL('https://accounts.spotify.com/authorize')
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('client_id', clientId)
        authUrl.searchParams.set('scope', scopes)
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('state', user.id)

        return new Response(
          JSON.stringify({ authUrl: authUrl.toString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (method === 'GET' || (method === 'POST' && body.endpoint)) {
      const endpoint = body.endpoint || req.url.split('/').pop()
      const params = body.params || {}
      
      // Refresh token if needed
      let accessToken = profile.spotify_access_token
      const refreshToken = profile.spotify_refresh_token

      // Try API call
      let response = await fetchSpotifyAPI(endpoint, accessToken, params)
      
      // If token expired, refresh and retry
      if (response.status === 401 && refreshToken) {
        const newTokens = await refreshSpotifyToken(refreshToken)
        
        // Update tokens in database
        await supabaseClient
          .from('profiles')
          .update({
            spotify_access_token: newTokens.access_token,
            spotify_refresh_token: newTokens.refresh_token || refreshToken
          })
          .eq('id', user.id)

        // Retry with new token
        accessToken = newTokens.access_token
        response = await fetchSpotifyAPI(endpoint, accessToken, params)
      }

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`)
      }

      const data = await response.json()
      
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid request')

  } catch (error) {
    console.error('Spotify API error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function fetchSpotifyAPI(endpoint, token, params = {}) {
  const url = new URL(`https://api.spotify.com/v1${endpoint}`)
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  return response
}

async function refreshSpotifyToken(refreshToken) {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')

  const credentials = btoa(`${clientId}:${clientSecret}`)
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  return await response.json()
}
