import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// @ts-ignore — JS file sin tipos, lo tipamos en línea
import { useAuthContext } from '@/contexts/AuthContext';

interface AuthContextValue {
  user: { id: string; email?: string } | null;
  session: unknown;
  loading: boolean;
}

interface Props {
  children: React.ReactNode;
}

/**
 * AuthGuard
 *
 * Envuelve las rutas protegidas. Si no hay sesión, redirige a /login.
 * Mientras `loading` está activo (los primeros ~2.5s leyendo de Preferences/localStorage),
 * muestra un loader — así evitamos un "flicker" que redirija erróneamente a login
 * cuando el usuario SÍ tiene sesión guardada pero aún no se leyó del almacenamiento.
 */
export function AuthGuard({ children }: Props) {
  const auth = useAuthContext() as AuthContextValue | null;
  const location = useLocation();

  // Mientras inicializa, mostramos loader distinguible (mismo estilo que LoadingSpinner
  // de App.tsx) para evitar falsa redirección a /login.
  if (!auth || auth.loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: '#0b0d20' }}
      >
        <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <span
          style={{
            color: '#67e8f9',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
          }}
        >
          Verificando sesión…
        </span>
      </div>
    );
  }

  if (!auth.user) {
    // Guardamos la ruta intentada para regresar después del login (opcional).
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
