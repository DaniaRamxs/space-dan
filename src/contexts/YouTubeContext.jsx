/**
 * YouTube Context
 * Pre-loads YouTube IFrame API on app mount to avoid loading delays in games
 */

import { createContext, useContext, useState, useCallback } from 'react';
import Script from 'next/script';

const YouTubeContext = createContext({
  isReady: false,
  error: null,
  YT: null
});

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

  return (
    <YouTubeContext.Provider value={{ isReady, error, YT }}>
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
        onReady={handleReady}
        onError={handleError}
      />
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
