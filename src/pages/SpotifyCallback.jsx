import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { spotifyService } from '../services/spotifyService';

export default function SpotifyCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (code && state) {
            spotifyService.handleCallback(code, state)
                .then(() => {
                    navigate(`/@${state}`); // Redirect to profile
                })
                .catch(err => {
                    console.error('Spotify connection failed', err);
                    alert('Error al conectar con Spotify. Intenta de nuevo.');
                    navigate('/');
                });
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-t-4 border-[#1DB954] rounded-full animate-spin" />
            <span className="text-[10px] uppercase font-black tracking-widest text-[#1DB954] animate-pulse">
                Sincronizando con Spotify... 🎵
            </span>
        </div>
    );
}
