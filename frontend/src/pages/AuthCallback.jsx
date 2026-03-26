import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const hasExchanged = useRef(false);

    useEffect(() => {
        const handleAuthCallback = async () => {
            if (hasExchanged.current) return;

            try {
                // Compatible with both BrowserRouter (Web) & HashRouter (Tauri)
                const searchParams = location.search || window.location.search;
                const params = new URLSearchParams(searchParams);
                const code = params.get('code');

                if (code) {
                    hasExchanged.current = true;
                    console.log('[AuthCallback] Código detectado, verificando si ya hay sesión...');
                    
                    // Primero verificar si ya hay sesión (posiblemente establecida por main.jsx)
                    let sessionCheck = await supabase.auth.getSession();
                    
                    if (sessionCheck.data?.session) {
                        console.log('[AuthCallback] Sesión ya establecida, omitiendo intercambio');
                        setTimeout(() => navigate('/posts', { replace: true }), 300);
                        return;
                    }
                    
                    console.log('[AuthCallback] Sin sesión previa, intercambiando código...');
                    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        console.error('[AuthCallback] Error en intercambio:', exchangeError.message);
                    } else if (exchangeData?.session) {
                        console.log('[AuthCallback] Intercambio exitoso, sesión ID:', exchangeData.session.user.id);
                    }

                    // Esperar a que Supabase confirme la persistencia
                    sessionCheck = await supabase.auth.getSession();

                    // Reintento rápido si falló (a veces hay lag en la escritura a storage en producción)
                    if (!sessionCheck.data.session && code) {
                        console.log('[AuthCallback] Primer intento falló, reintentando...');
                        await new Promise(r => setTimeout(r, 800));
                        sessionCheck = await supabase.auth.getSession();
                    }

                    if (sessionCheck.data?.session) {
                        console.log('[AuthCallback] Sesión lista. Redirigiendo a /posts...');
                        setTimeout(() => navigate('/posts', { replace: true }), 300);
                    } else {
                        console.warn('[AuthCallback] No se detectó sesión activa tras intercambio.');
                        navigate('/posts', { replace: true });
                    }
                } else {
                    // No hay código, redirigir directamente
                    console.log('[AuthCallback] Sin código de autorización, redirigiendo...');
                    navigate('/posts', { replace: true });
                }
            } catch (err) {
                console.error('[AuthCallback] Fallo crítico en el flujo:', err.message || err);
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
