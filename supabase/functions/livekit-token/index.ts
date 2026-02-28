import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { AccessToken } from "https://esm.sh/livekit-server-sdk@1.2.7"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY")
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    // Manejar Pre-flight (CORS)
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get("Authorization")
        if (!authHeader) throw new Error("No hay cabecera de autorización")

        // 1. Validar usuario de Supabase
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error("Usuario no autorizado")

        // 2. Extraer parámetros
        const { roomName, participantName } = await req.json()
        if (!roomName || !participantName) throw new Error("Faltan parámetros de sala")

        // 3. Crear Access Token de LiveKit
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: user.id, // Usamos el ID real de Supabase
            name: participantName,
        })

        // Permisos específicos MVP (Solo audio)
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            videoJoin: false, // Bloqueado por seguridad MVP
        })

        return new Response(JSON.stringify({ token: at.toJwt() }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        })
    }
})
