import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { spotifyService } from '../services/spotifyService';
import { supabase } from '../supabaseClient';

export default function SpotifyCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Verificando sesión...');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const urlError = searchParams.get('error');

        // Si Spotify devolvió un error en la URL (ej. acceso denegado)
        if (urlError) {
            console.error('[Spotify Callback] Error en URL de Spotify:', urlError);
            alert(`Spotify rechazó la conexión: ${urlError}`);
            navigate('/posts');
            return;
        }

        if (!code || !state) {
            navigate('/posts');
            return;
        }

        const processExchange = async (session) => {
            setStatus('Sincronizando con Spotify...');
            try {
                spotifyService.setAuthValid();
                await spotifyService.handleCallback(code, state);

                if (session) {
                    // Web normal: navegar al perfil
                    const username = await spotifyService.getUsernameById(state);
                    navigate(`/@${username}`);
                } else {
                    // Flujo Tauri: no hay sesión en el navegador, mostrar mensaje de éxito
                    setStatus('¡Spotify conectado! Ya puedes volver a Spacely.');
                }
            } catch (err) {
                console.error('[Spotify Callback] Error detallado:', err);
                let msg = 'Error desconocido';
                if (err.context) {
                    try {
                        const body = await err.context.json();
                        msg = body.error || body.message || err.message || msg;
                        if (body.hint) msg += `\n💡 ${body.hint}`;
                    } catch {
                        msg = err.message || msg;
                    }
                } else {
                    msg = err.message || msg;
                }
                alert(`Error al conectar con Spotify: ${msg}`);
                if (session) navigate('/posts');
            }
        };

        // Intentar obtener la sesión actual (puede existir si es web normal)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                // Web con sesión: proceder directamente
                processExchange(session);
            } else {
                // Sin sesión: puede ser flujo Tauri (state = userId) o sesión tardando
                // Esperar brevemente por si la sesión se restaura; si no, proceder igual
                setStatus('Procesando...');
                let resolved = false;
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
                    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !resolved) {
                        resolved = true;
                        subscription.unsubscribe();
                        processExchange(s);
                    }
                });

                // Tras 3 segundos, proceder sin sesión (flujo Tauri)
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        subscription.unsubscribe();
                        processExchange(null);
                    }
                }, 3000);
            }
        });

    }, [searchParams, navigate]);

    const done = status.startsWith('¡Spotify conectado');

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
            {done ? (
                <svg viewBox="0 0 24 24" width={64} height={64} fill="#1DB954">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
            ) : (
                <div className="w-16 h-16 border-t-4 border-[#1DB954] rounded-full animate-spin" />
            )}
            <span className="text-[10px] uppercase font-black tracking-widest text-[#1DB954] animate-pulse">
                {status} 🎵
            </span>
        </div>
    );
}
