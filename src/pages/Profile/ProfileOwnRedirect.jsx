/**
 * ProfileOwnRedirect
 *
 * La ruta /profile (sin username) apuntaba al ProfileOwn viejo. Ahora queremos
 * que vaya al ProfileRedesign nuevo, que necesita un :username en la URL.
 * Este wrapper lee el perfil del usuario logueado y redirige a /:username.
 *
 * Si aún no hay username (profile cargando o usuario no logueado) muestra
 * un spinner y espera.
 */
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

export default function ProfileOwnRedirect() {
  const { user, profile, profileLoading } = useAuthContext() || {};
  const navigate = useNavigate();

  useEffect(() => {
    if (profileLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    const username =
      profile?.username ||
      user?.email?.split('@')[0] ||
      null;
    if (username) {
      navigate('/' + encodeURIComponent(username), { replace: true });
    }
  }, [user, profile, profileLoading, navigate]);

  // Fallback UI mientras carga
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
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '2px solid rgba(103,232,249,0.2)',
          borderTopColor: '#67e8f9',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
          marginBottom: 16,
        }}
      />
      <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Abriendo tu perfil…
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
