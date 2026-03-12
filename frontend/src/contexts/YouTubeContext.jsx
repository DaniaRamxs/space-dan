/**
 * YouTube Context
 * Pre-loads YouTube IFrame API on app mount to avoid loading delays in games
 */

import { createContext, useContext, useEffect, useState, useRef } from 'react';

const YouTubeContext = createContext({
  isReady: false,
  error: null,
  YT: null
});

export function YouTubeProvider({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [YT, setYT] = useState(null);
  const loadAttempted = useRef(false);

  useEffect(() => {
    // Only attempt to load once
    if (loadAttempted.current) return;
    loadAttempted.current = true;

    console.log('[YouTubeContext] Pre-loading YouTube IFrame API...');

    // Check if already loaded
    if (window.YT && window.YT.Player) {
      console.log('[YouTubeContext] ✅ YouTube API already loaded');
      setYT(window.YT);
      setIsReady(true);
      return;
    }

    // Timeout after 15 seconds
    const timeoutId = setTimeout(() => {
      if (!isReady) {
        console.warn('[YouTubeContext] ⚠️ YouTube API load timeout');
        setError(new Error('YouTube API load timeout'));
        // Still set ready to true so app doesn't block
        setIsReady(true);
      }
    }, 15000);

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    
    tag.onerror = () => {
      console.error('[YouTubeContext] ❌ Failed to load YouTube IFrame API');
      clearTimeout(timeoutId);
      setError(new Error('Failed to load YouTube API'));
      setIsReady(true); // Set ready anyway to not block app
    };

    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      console.log('[YouTubeContext] ✅ YouTube IFrame API ready!');
      clearTimeout(timeoutId);
      setYT(window.YT);
      setIsReady(true);
      setError(null);
    };

    // Insert script
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isReady]);

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
