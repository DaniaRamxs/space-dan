/**
 * AuthCallbackPage
 *
 * Ruta a la que llega el WebView después del OAuth de Supabase.
 * URL: /#/auth/callback?code=XXX (o #access_token=XXX para implicit flow)
 *
 * Canjea el `code` por una sesión usando el PKCE verifier guardado por
 * signInWithOAuth (está en las cookies del WebView, por eso necesitamos
 * que el OAuth haya iniciado en este mismo contexto).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('Completando sesión…');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function doExchange() {
      try {
        const code = params.get('code');
        const errorParam = params.get('error') || params.get('error_description');

        if (errorParam) {
          setError('Error de Supabase: ' + errorParam);
          return;
        }

        if (!code) {
          // Quizás viene por implicit flow con hash (#access_token=...)
          const hash = window.location.hash;
          if (hash && hash.includes('access_token=')) {
            setStatus('Procesando token (implicit flow)…');
            // Supabase detecta automáticamente el hash si detectSessionInUrl fuera true;
            // por ahora lo procesamos manualmente.
            const hashParams = new URLSearchParams(hash.replace(/^#\/auth\/callback\??/, '').replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken) {
              const { error: setErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              if (setErr) {
                setError('Error setSession: ' + setErr.message);
                return;
              }
              setStatus('¡Sesión activa! Redirigiendo…');
              setTimeout(() => navigate('/posts', { replace: true }), 500);
              return;
            }
          }
          setError('No se recibió ningún code en la URL');
          return;
        }

        setStatus('Canjeando código…');
        const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);

        if (exchErr) {
          setError('Error canjeando code: ' + exchErr.message);
          return;
        }

        if (data?.session) {
          setStatus('¡Sesión activa! Redirigiendo…');
          setTimeout(() => navigate('/posts', { replace: true }), 500);
        } else {
          setError('No se creó sesión (respuesta vacía de Supabase)');
        }
      } catch (err) {
        console.error('[AuthCallback] Error inesperado:', err);
        setError('Error inesperado: ' + (err?.message || err));
      }
    }
    doExchange();
  }, [navigate, params]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#060d1f',
        color: '#67e8f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: 20,
        textAlign: 'center',
      }}
    >
      {error ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ color: '#f87171', fontSize: 16, fontWeight: 900, margin: 0 }}>
            Error de autenticación
          </h1>
          <p style={{ color: '#fff', fontSize: 13, marginTop: 16, maxWidth: 360 }}>{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            style={{
              marginTop: 24,
              padding: '12px 28px',
              background: '#67e8f9',
              color: '#060d1f',
              border: 'none',
              borderRadius: 12,
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Volver al login
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              width: 48,
              height: 48,
              border: '3px solid rgba(103,232,249,0.2)',
              borderTopColor: '#67e8f9',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              marginBottom: 24,
            }}
          />
          <p style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {status}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
}
