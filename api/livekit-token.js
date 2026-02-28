import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
    // 1. Manejar CORS (Opcional en Vercel si es la misma app, pero bueno por seguridad)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) throw new Error('No hay cabecera de autorización');

        // 2. Validar usuario de Supabase (Server Side)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) throw new Error('Usuario no autorizado');

        // 3. Extraer parámetros
        const { roomName, participantName, userAvatar } = req.body;
        if (!roomName || !participantName) throw new Error('Faltan parámetros de sala');

        // 4. Crear Access Token de LiveKit
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: user.id,
            name: participantName,
            metadata: JSON.stringify({ avatar: userAvatar })
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            videoJoin: false, // Bloqueado por seguridad MVP
        });

        const token = await at.toJwt();
        return res.status(200).json({ token });

    } catch (error) {
        console.error('[LiveKit API Error]:', error);
        return res.status(400).json({ error: error.message });
    }
}
