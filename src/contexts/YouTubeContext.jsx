/**
 * YouTube Context
 * Pre-loads YouTube IFrame API on app mount to avoid loading delays in games.
 *
 * Migración a Vite: se elimina la dependencia de `next/script` (rompía el build en
 * Capacitor/WebView). En su lugar, inyectamos el <script> del IFrame API una sola vez
 * directamente en el DOM usando el callback global `onYouTubeIframeAPIReady`, que es
 * el mecanismo oficial recomendado por YouTube.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

const YouTubeContext = createContext({
  isReady: false,
  error: null,
  YT: null,
});

const SCRIPT_SRC = 'https://www.youtube.com/iframe_api';
const SCRIPT_ID = 'youtube-iframe-api';

export function YouTubeProvider({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [YT, setYT] = useState(null);

  const handleReady = useCallback(() => {
    console.log('[YouTubeContext] ✅ YouTube IFrame API ready!');
    setYT(window.YT);
    setIsReady(true);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    console.error('[YouTubeContext] ❌ Failed to load YouTube IFrame API');
    setError(new Error('Failed to load YouTube API'));
    setIsReady(true); // No bloquear la app
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Si la API ya está cargada (navegación previa), marcamos ready inmediatamente.
    if (window.YT && window.YT.Player) {
      handleReady();
      return;
    }

    // Chain del callback previo si existe — otros módulos podrían depender de él.
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') {
        try {
          previousCallback();
        } catch (err) {
          console.warn('[YouTubeContext] previous callback error:', err);
        }
      }
      handleReady();
    };

    // Si el script ya existe, solo esperamos al callback global.
    let scriptEl = document.getElementById(SCRIPT_ID);
    let createdScript = false;

    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = SCRIPT_ID;
      scriptEl.src = SCRIPT_SRC;
      scriptEl.async = true;
      scriptEl.defer = true;
      scriptEl.addEventListener('error', handleError);
      document.head.appendChild(scriptEl);
      createdScript = true;
    } else {
      scriptEl.addEventListener('error', handleError);
    }

    return () => {
      // No removemos el script (otras partes de la app pueden seguir usándolo),
      // pero sí el listener para evitar callbacks a un provider desmontado.
      scriptEl?.removeEventListener('error', handleError);
      // Si éramos los dueños del callback global, lo limpiamos a la versión previa.
      if (window.onYouTubeIframeAPIReady && createdScript) {
        window.onYouTubeIframeAPIReady = previousCallback || undefined;
      }
    };
  }, [handleReady, handleError]);

  return (
    <YouTubeContext.Provider value={{ isReady, error, YT }}>
      {children}
    </YouTubeContext.Provider>
  );
}

export function useYouTube() {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error('useYouTube must be used within YouTubeProvider');
  }
  return context;
}
