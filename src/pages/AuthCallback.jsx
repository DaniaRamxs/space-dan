import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
    const navigate = useNavigate();
    const hasExchanged = useRef(false);

    useEffect(() => {
        const handleAuthCallback = async () => {
            if (hasExchanged.current) return;

            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');

                if (code) {
                    hasExchanged.current = true;
                    console.log('[AuthCallback] Intercambiando código...');
                    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        console.error('[AuthCallback] Error en intercambio:', exchangeError.message);
                    } else if (exchangeData?.session) {
                        console.log('[AuthCallback] Intercambio exitoso, sesión obtenida.');
                    }
                }

                // Darle un respiro al estado de Supabase para propagar la sesión
                const { data, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (data?.session) {
                    console.log('[AuthCallback] Sesión confirmada. Redirigiendo...');
                    // Pequeño delay opcional para asegurar que Contexts se enteren
                    setTimeout(() => navigate('/posts', { replace: true }), 500);
                } else {
                    console.warn('[AuthCallback] No se encontró sesión tras el intercambio.');
                    navigate('/posts', { replace: true });
                }
            } catch (err) {
                console.error('[AuthCallback] Error crítico:', err.message || err);
                navigate('/posts', { replace: true });
            }
        };

        handleAuthCallback();
    }, [navigate]);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#030308] z-[9999]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-white/40 text-sm font-medium animate-pulse">Sincronizando con el cosmos...</p>
            </div>
        </div>
    );
}
