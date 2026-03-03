import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { spotifyService } from '../services/spotifyService';

export default function SpotifyCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

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
                    console.error('Spotify connection failed', err);
                    alert('Error al conectar con Spotify. Intenta de nuevo.');
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
