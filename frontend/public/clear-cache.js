// Manual cache clearing for specific chunks
(function() {
  'use strict';
  
  // Clear problematic chunks from cache
  const problematicChunks = [
    'games-core-C8gLOLp8.js',
    'livekit-C9buWMbF.js',
    'konva-BTpBkuHr.js',
    'vendor-CxdypoD8.js',
    'react-core-Dv6pI4Vw.js'
  ];
  
  // Clear ALL caches completely
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName).catch(() => {});
        })
      ).then(function() {
        console.log('All caches cleared');
      });
    });
  }
  
  // Clear localStorage and sessionStorage
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.log('Storage clear failed:', e);
  }
  
  // Force reload only once
  if (!sessionStorage.getItem('cacheCleared')) {
    sessionStorage.setItem('cacheCleared', 'true');
    setTimeout(() => {
      window.location.reload(true);
    }, 500);
  }
})();
