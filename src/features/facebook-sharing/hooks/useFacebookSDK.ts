'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const useFacebookSDK = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.FB) {
      setIsLoaded(true);
      return;
    }

    window.fbAsyncInit = function() {
      window.FB.init({
        xfbml: true,
        version: 'v18.0',
        status: true,
        cookie: true
      });
      setIsLoaded(true);
      // Forzar un primer parseo por si acaso
      setTimeout(() => { if (window.FB) window.FB.XFBML.parse(); }, 1000);
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = "https://connect.facebook.net/es_LA/sdk.js"; // Español para la interfaz
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);

    return () => {
      // Optional: cleanup
    };
  }, []);

  return { isLoaded, FB: typeof window !== 'undefined' ? window.FB : null };
};
