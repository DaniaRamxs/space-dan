
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const LIVEKIT_API_KEY    = Deno.env.get("LIVEKIT_API_KEY")!
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

/** Genera un JWT LiveKit firmado con HS256 usando la Web Crypto API nativa de Deno. */
async function generateLiveKitToken(
    identity: string,
    name: string,
    roomName: string,
    metadata: string,
    ttl = 21600            // 6 horas
): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    const b64url = (obj: unknown) =>
        btoa(JSON.stringify(obj))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "")

    const header  = b64url({ alg: "HS256", typ: "JWT" })
    const payload = b64url({
        iss:      LIVEKIT_API_KEY,
        sub:      identity,
        nbf:      now,
        exp:      now + ttl,
        name,
        metadata,
        video: {
            roomJoin:       true,
            room:           roomName,
            canPublish:     true,
            canSubscribe:   true,
            canPublishData: true,
        },
    })

    const signingInput = `${header}.${payload}`

    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(LIVEKIT_API_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )

    const rawSig  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput))
    const sig     = btoa(String.fromCharCode(...new Uint8Array(rawSig)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "")

    return `${signingInput}.${sig}`
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get("Authorization")
        if (!authHeader) throw new Error("No hay cabecera de autorización")

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error("Usuario no autorizado")

        const { roomName, participantName, userAvatar, nicknameStyle, frameId } = await req.json()
        if (!roomName || !participantName) throw new Error("Faltan parámetros de sala")

        const token = await generateLiveKitToken(
            user.id,
            participantName,
            roomName,
            JSON.stringify({ avatar: userAvatar, nicknameStyle, frameId })
        )

        return new Response(JSON.stringify({ token }), {
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
