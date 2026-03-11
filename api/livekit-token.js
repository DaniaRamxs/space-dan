import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
    // 1. Manejar CORS (Opcional pero recomendado para APIs)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido (Usar POST)' });
    }

    try {
        // 3. Extraer y validar parámetros del body
        const { roomName, userId, participantName, userAvatar, nicknameStyle, frameId } = req.body;

        const identity = userId || 'user-' + Math.random().toString(36).substring(7);
        const name = participantName || 'Explorador';

        if (!roomName) {
            return res.status(400).json({ error: 'Faltan parámetros obligatorios: roomName' });
        }

        // 4. Configurar credenciales
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            return res.status(500).json({ error: 'Servidor no configurado para LiveKit' });
        }

        // 5. Generar el AccessToken con Metadata
        const at = new AccessToken(apiKey, apiSecret, {
            identity: identity,
            name: name,
            metadata: JSON.stringify({
                avatar: userAvatar,
                nicknameStyle,
                frameId
            })
        });

        // 6. Asignar permisos
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            videoJoin: false
        });

        const token = await at.toJwt();
        return res.status(200).json({ token });

    } catch (error) {
        console.error('[LiveKit API Error]:', error);
        return res.status(500).json({ error: error.message });
    }
}
