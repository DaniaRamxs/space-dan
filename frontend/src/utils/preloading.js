import { useEffect } from 'react';

// Preloading inteligente basado en probabilidad de uso
export const usePreloading = () => {
  useEffect(() => {
    // Preload critical chunks cuando el usuario está inactivo
    const preloadCriticalChunks = () => {
      // React core (siempre necesario)
      import('react');
      import('react-dom');
      
      // Router (probable navegación)
      import('react-router-dom');
      
      // Supabase (probable login/data)
      import('@supabase/supabase-js');
    };

    // Preload cuando el usuario hace scroll o está inactivo
    let idleTimeout;
    const handleIdle = () => {
      idleTimeout = setTimeout(() => {
        preloadCriticalChunks();
      }, 2000); // 2 segundos de inactividad
    };

    // Detectar inactividad
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleIdle, { once: true });
    });

    return () => {
      clearTimeout(idleTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleIdle);
      });
    };
  }, []);
};

// Preload basado en hover de enlaces
export const preloadOnHover = (importFunc, delay = 200) => {
  let timeout;
  
  return {
    onMouseEnter: () => {
      timeout = setTimeout(() => importFunc(), delay);
    },
    onMouseLeave: () => {
      clearTimeout(timeout);
    }
  };
};

// Preload de imágenes críticas
export const preloadImages = (imageUrls) => {
  imageUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
};
