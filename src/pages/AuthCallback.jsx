import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Check if there's a code in the URL (PKCE flow)
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');

                if (code) {
                    console.log('[AuthCallback] Code detected, exchanging for session...');
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        console.warn('[AuthCallback] Exchange warning (might be already handled):', exchangeError.message);
                    }
                }

                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[AuthCallback] Error getting session:', error.message);
                    navigate('/posts', { replace: true });
                    return;
                }

                if (data?.session) {
                    console.log('[AuthCallback] Session detected, redirecting to /posts');
                    // Use replace to avoid keeping the callback in history
                    navigate('/posts', { replace: true });
                } else {
                    console.log('[AuthCallback] No session found, redirecting to login/home');
                    navigate('/posts', { replace: true }); // LoginGate is handled by /posts route if no user
                }
            } catch (err) {
                console.error('[AuthCallback] Auth error:', err.message || err);
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
