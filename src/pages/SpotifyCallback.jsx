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
            navigate('/');
            return;
        }

        if (!code || !state) {
            navigate('/');
            return;
        }

        const processExchange = async (session) => {
            if (!session) {
                setStatus('Sesión no disponible. Redirigiendo...');
                navigate('/');
                return;
            }

            setStatus('Sincronizando con Spotify...');
            try {
                spotifyService.setAuthValid(); // Limpiar cualquier flag de expiración previo
                await spotifyService.handleCallback(code, state);
                const username = await spotifyService.getUsernameById(state);
                navigate(`/@${username}`);
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
                navigate('/');
            }
        };

        // Intentar obtener la sesión actual primero (ya puede estar disponible)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                // Sesión ya disponible — proceder directamente
                processExchange(session);
            } else {
                // Sesión no disponible aún — esperar evento SIGNED_IN
                setStatus('Restaurando sesión...');
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        subscription.unsubscribe();
                        processExchange(session);
                    }
                });

                // Timeout de seguridad por si tarda demasiado
                setTimeout(() => {
                    subscription.unsubscribe();
                    alert('La sesión tardó demasiado en cargarse. Inicia sesión de nuevo.');
                    navigate('/');
                }, 10000);
            }
        });

    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-t-4 border-[#1DB954] rounded-full animate-spin" />
            <span className="text-[10px] uppercase font-black tracking-widest text-[#1DB954] animate-pulse">
                {status} 🎵
            </span>
        </div>
    );
}
