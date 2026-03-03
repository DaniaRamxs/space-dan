import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { spotifyService } from '../services/spotifyService';

export default function SpotifyCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const urlError = searchParams.get('error');

        if (urlError) {
            console.error('[Spotify Callback] Error en URL:', urlError);
            alert(`Spotify dice: ${urlError}. Verifica tu configuración en el Dashboard.`);
            navigate('/');
            return;
        }

        // Función asíncrona interna para manejar la lógica
        const processCallback = async () => {
            // 1. Esperar a que la sesión de Supabase esté lista
            const { data: { user } } = await spotifyService.supabase.auth.getUser();
            if (!user) {
                console.warn('[Spotify Callback] Esperando usuario...');
                return;
            }

            if (code && state) {
                try {
                    await spotifyService.handleCallback(code, state);
                    const username = await spotifyService.getUsernameById(state);
                    navigate(`/@${username}`);
                } catch (err) {
                    console.error('[Spotify Callback] Fallo detallado:', err);

                    // Extraer el mensaje más profundo posible
                    let msg = 'Error desconocido';
                    if (err.context?.status) {
                        // Intentar leer el body si es un FunctionsHttpError
                        try {
                            const body = await err.context.json();
                            msg = body.error || body.message || msg;
                            if (body.hint) msg += `\n💡 Hint: ${body.hint}`;
                            if (body.detail) console.log('[Spotify Error Detail]', body.detail);
                        } catch (e) {
                            msg = err.message || msg;
                        }
                    } else {
                        msg = err.message || (typeof err === 'string' ? err : msg);
                    }

                    alert(`Error al conectar: ${msg}`);
                    navigate('/');
                }
            }
        };

        processCallback();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-t-4 border-[#1DB954] rounded-full animate-spin" />
            <span className="text-[10px] uppercase font-black tracking-widest text-[#1DB954] animate-pulse">
                Sincronizando con Spotify... 🎵
            </span>
        </div>
    );
}
